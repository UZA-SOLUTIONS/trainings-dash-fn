import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronsLeft,
  FiChevronsRight,
  FiUsers,
  FiBarChart2,
  FiUserCheck,
  FiSettings,
  FiClipboard,
  FiBookOpen,
  FiCalendar,
  FiEdit3,
  FiGrid,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCohort } from "@/hooks/useActiveCohort";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "framer-motion";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useI18n } from "@/i18n/LanguageContext";
import type { MessageKey } from "@/i18n/en";
import type { NavTab } from "@/components/dashboard/types";
import {
  dashboardTabFromPath,
  isClassroomTool,
  isExactWorkspaceHref,
  workspaceHref,
} from "@/components/dashboard/types";

const TRAINING_NAV: { tab: NavTab; labelKey: MessageKey; icon: typeof FiBarChart2 }[] = [
  { tab: "overview", labelKey: "nav.overview", icon: FiBarChart2 },
];

const CLASSROOM_NAV: { tab: NavTab; labelKey: MessageKey; icon: typeof FiBarChart2 }[] = [
  { tab: "roster", labelKey: "nav.roster", icon: FiClipboard },
  { tab: "curriculum", labelKey: "nav.curriculum", icon: FiBookOpen },
  { tab: "attendance", labelKey: "nav.attendance", icon: FiCalendar },
  { tab: "assessments", labelKey: "nav.assessments", icon: FiEdit3 },
  { tab: "gradebook", labelKey: "nav.gradebook", icon: FiGrid },
  { tab: "issues", labelKey: "nav.issues", icon: FiAlertCircle },
  { tab: "reports", labelKey: "nav.reports", icon: FiFileText },
];

const WORKSPACE_NAV: { tab: NavTab; labelKey: MessageKey; icon: typeof FiBarChart2 }[] = [
  { tab: "cohorts", labelKey: "nav.cohorts", icon: FiUsers },
  { tab: "candidates", labelKey: "nav.candidates", icon: FiUserCheck },
];

const CELL =
  "flex items-center gap-2.5 border-b border-primary-foreground/15 px-3 text-sm font-normal text-primary-foreground";

export function StaffNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { logout, canAccessTab } = useAuth();
  const { t } = useI18n();
  const { activeCohortId } = useActiveCohort();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const items = [
    ...TRAINING_NAV,
    ...CLASSROOM_NAV,
    ...WORKSPACE_NAV,
    { tab: "settings" as NavTab, labelKey: "nav.settings" as MessageKey, icon: FiSettings },
  ].filter(({ tab }) => canAccessTab(tab));

  async function signOut() {
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await logout();
      navigate("/auth", { replace: true });
    } finally {
      setSigningOut(false);
      setSignOutOpen(false);
    }
  }

  function isActive(tab: NavTab) {
    return dashboardTabFromPath(location.pathname, location.search) === tab;
  }

  function navRow(tab: NavTab, label: string, Icon: typeof FiBarChart2) {
    const active = isActive(tab);
    const classroom = isClassroomTool(tab);
    const disabled = classroom && !activeCohortId;
    const href = workspaceHref(tab, activeCohortId);
    const className = cn(
      CELL,
      "flex-1",
      collapsed && "lg:justify-center lg:gap-0 lg:px-0",
      disabled
        ? "cursor-not-allowed opacity-45"
        : active
          ? "bg-volt text-volt-foreground"
          : "hover:bg-primary-foreground/10",
    );
    const inner = (
      <>
        <Icon size={16} aria-hidden className="shrink-0" />
        <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
      </>
    );

    if (disabled) {
      return (
        <span key={tab} className={className} aria-disabled="true" title={label}>
          {inner}
        </span>
      );
    }

    return (
      <Link
        key={tab}
        to={href}
        title={label}
        onClick={(e) => {
          setOpen(false);
          if (!isExactWorkspaceHref(location.pathname, location.search, tab)) return;
          e.preventDefault();
          navigate(href, { replace: true, state: { resetWorkspace: Date.now() } });
        }}
        className={className}
      >
        {inner}
      </Link>
    );
  }

  const navBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn(CELL, "h-14 shrink-0", collapsed && "lg:justify-center lg:px-0")}>
        <Link
          to="/dashboard"
          className={cn("inline-flex min-w-0 flex-1 items-center", collapsed && "lg:hidden")}
          aria-label="Dashboard"
          onClick={(e) => {
            if (location.pathname !== "/dashboard") return;
            e.preventDefault();
            navigate("/dashboard", { replace: true, state: { resetWorkspace: Date.now() } });
          }}
        >
          <img src="/logo.png" alt="UZA Mobility" className="h-9 w-auto object-contain" />
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-primary-foreground/25 hover:bg-primary-foreground/10 lg:hidden"
          aria-label={t("nav.closeMenu")}
          onClick={() => setOpen(false)}
        >
          <FiX size={16} />
        </button>
        <button
          type="button"
          className="hidden h-8 w-8 shrink-0 items-center justify-center border border-primary-foreground/25 hover:bg-primary-foreground/10 lg:inline-flex"
          aria-label={collapsed ? t("nav.showSidebar") : t("nav.hideSidebar")}
          title={collapsed ? t("nav.showSidebar") : t("nav.hideSidebar")}
          onClick={onToggle}
        >
          {collapsed ? <FiChevronsRight size={16} /> : <FiChevronsLeft size={16} />}
        </button>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col">
        {items.map(({ tab, labelKey, icon }) => navRow(tab, t(labelKey), icon))}
        <div className="mt-auto border-t border-primary-foreground/15 p-2">
          <LanguageToggle variant="sidebar" collapsed={collapsed} />
        </div>
        <button
          type="button"
          title={t("nav.signOut")}
          className={cn(
            CELL,
            "h-14 shrink-0 hover:bg-primary-foreground/10",
            collapsed && "lg:justify-center lg:gap-0 lg:px-0",
          )}
          onClick={() => {
            setOpen(false);
            setSignOutOpen(true);
          }}
        >
          <FiLogOut size={16} aria-hidden className="shrink-0" />
          <span className={cn(collapsed && "lg:hidden")}>{t("nav.signOut")}</span>
        </button>
      </nav>
    </div>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-primary-foreground/15 bg-primary px-3 text-primary-foreground lg:hidden">
        <Link
          to="/dashboard"
          aria-label="Dashboard"
          onClick={(e) => {
            if (location.pathname !== "/dashboard") return;
            e.preventDefault();
            navigate("/dashboard", { replace: true, state: { resetWorkspace: Date.now() } });
          }}
        >
          <img src="/logo.png" alt="UZA Mobility" className="h-9 w-auto object-contain" />
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center border border-border/40"
          aria-label={t("nav.openMenu")}
          onClick={() => setOpen(true)}
        >
          <FiMenu size={16} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <m.button
            type="button"
            aria-label={t("nav.closeMenu")}
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r border-primary-foreground/15 bg-primary text-primary-foreground transition-[width,transform] duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          collapsed ? "w-60 lg:w-14" : "w-60",
        )}
      >
        {navBody}
      </aside>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title={t("signOut.title")}
        description={t("signOut.body")}
        confirmLabel={t("signOut.confirm")}
        pending={signingOut}
        onConfirm={signOut}
      />
    </>
  );
}
