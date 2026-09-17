import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiLogOut,
  FiMenu,
  FiX,
  FiUsers,
  FiBarChart2,
  FiUserCheck,
  FiSettings,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/permissions";
import type { DashboardTab } from "@/components/dashboard/types";
import {
  dashboardTabFromPath,
  isExactWorkspaceHref,
  workspaceHref,
} from "@/components/dashboard/types";

const WORKSPACE_NAV: {
  tab: DashboardTab;
  label: string;
  icon: typeof FiBarChart2;
}[] = [
  { tab: "overview", label: "Overview", icon: FiBarChart2 },
  { tab: "cohorts", label: "Classes", icon: FiUsers },
  { tab: "candidates", label: "Candidates", icon: FiUserCheck },
];

export function StaffNav() {
  const { user, logout, canAccessTab } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const workspaceNav = WORKSPACE_NAV.filter(({ tab }) => canAccessTab(tab));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate("/auth", { replace: true });
  }

  function isActive(tab: DashboardTab) {
    return dashboardTabFromPath(location.pathname, location.search) === tab;
  }

  function navLink(tab: DashboardTab, label: string, Icon: typeof FiBarChart2) {
    const active = isActive(tab);
    const href = workspaceHref(tab);
    return (
      <Link
        key={tab}
        to={href}
        onClick={(e) => {
          setOpen(false);
          if (!isExactWorkspaceHref(location.pathname, location.search, tab)) return;
          e.preventDefault();
          navigate(href, { replace: true, state: { resetWorkspace: Date.now() } });
        }}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3.5 text-base font-medium transition-colors",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon size={18} aria-hidden />
        {label}
      </Link>
    );
  }

  const navBody = (
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-5">
        <Link
          to="/dashboard"
          className="inline-flex items-center"
          aria-label="Dashboard"
          onClick={(e) => {
            if (location.pathname !== "/dashboard") return;
            e.preventDefault();
            navigate("/dashboard", { replace: true, state: { resetWorkspace: Date.now() } });
          }}
        >
          <img src="/logo.avif" alt="Training dashboard" className="h-9 w-auto object-contain" />
        </Link>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <FiX size={18} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-6 px-3">
        <div>
          <p className="mb-3 px-3 text-eyebrow text-sidebar-foreground/50">Training</p>
          <div className="flex flex-col gap-3">
            {workspaceNav.map(({ tab, label, icon }) => navLink(tab, label, icon))}
          </div>
        </div>
        <div>
          <p className="mb-3 px-3 text-eyebrow text-sidebar-foreground/50">Account</p>
          <div className="flex flex-col gap-3">{navLink("settings", "Settings", FiSettings)}</div>
        </div>
      </nav>

      <div className="mt-auto border-t border-sidebar-border px-4 py-4">
        <Link
          to="/dashboard?tab=settings"
          onClick={(e) => {
            setOpen(false);
            if (!isExactWorkspaceHref(location.pathname, location.search, "settings")) return;
            e.preventDefault();
            navigate("/dashboard?tab=settings", { replace: true, state: { resetWorkspace: Date.now() } });
          }}
          className="block rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent"
        >
          <p className="truncate text-base font-medium text-sidebar-foreground">
            {user?.full_name || user?.email || "Staff"}
          </p>
          {user?.role && (
            <p className="mt-0.5 text-sm uppercase tracking-wide text-muted-foreground">
              {roleLabel(user.role)}
            </p>
          )}
        </Link>
        <Button variant="outline" className="mt-3 w-full shadow-none" onClick={signOut}>
          <FiLogOut aria-hidden />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background px-4 py-3 lg:hidden">
        <Link
          to="/dashboard"
          aria-label="Dashboard"
          onClick={(e) => {
            if (location.pathname !== "/dashboard") return;
            e.preventDefault();
            navigate("/dashboard", { replace: true, state: { resetWorkspace: Date.now() } });
          }}
        >
          <img src="/logo.avif" alt="Training dashboard" className="h-8 w-auto object-contain" />
        </Link>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <FiMenu size={18} />
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {navBody}
      </aside>
    </>
  );
}
