import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as authService from "@/services/authService";
import type { StaffRole } from "@/services/authService";
import { cn, SAVE_TEXT, statusTone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  loadDashboardPreferences,
  saveDashboardPreferences,
  type DashboardPreferences,
} from "@/components/dashboard/preferences";
import { DASHBOARD_TABS, type DashboardTab } from "@/components/dashboard/types";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useI18n } from "@/i18n/LanguageContext";
import type { MessageKey } from "@/i18n/en";
import { toast } from "sonner";

const WORKSPACE_TABS = DASHBOARD_TABS.filter((t) => t.id !== "settings");

const TAB_KEYS: Record<DashboardTab, MessageKey> = {
  overview: "nav.overview",
  cohorts: "nav.cohorts",
  candidates: "nav.candidates",
  settings: "nav.settings",
  courses: "page.courses",
  modules: "page.modules",
};

const TONE = {
  forest: "bg-primary text-primary-foreground",
  teal: "bg-chart-2 text-primary-foreground",
  lime: "bg-chart-1 text-volt-foreground",
  amber: "bg-chart-4 text-volt-foreground",
  blue: "bg-chart-5 text-primary-foreground",
} as const;

const TONE_MUTED = {
  forest: "text-primary-foreground/75",
  teal: "text-primary-foreground/80",
  lime: "text-volt-foreground/75",
  amber: "text-volt-foreground/75",
  blue: "text-primary-foreground/80",
} as const;

type SectionTone = keyof typeof TONE;

function formatDate(value?: string, locale = "en-GB") {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SettingsSection({
  title,
  description,
  children,
  className,
  tone = "forest",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  tone?: SectionTone;
}) {
  return (
    <section className={cn("border border-border/40 bg-card", className)}>
      <div className={cn("border-b border-background/25 px-4 py-3", TONE[tone])}>
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? (
          <p className={cn("mt-0.5 text-xs leading-relaxed", TONE_MUTED[tone])}>{description}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function SettingsPanel() {
  const navigate = useNavigate();
  const { user, refreshUser, canAccessTab, can } = useAuth();
  const { t, locale, label } = useI18n();
  const [prefs, setPrefs] = useState<DashboardPreferences>(() => loadDashboardPreferences());
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const workspaceTabs = WORKSPACE_TABS.filter((tab) => canAccessTab(tab.id));
  const initial = (user?.full_name || user?.email || "?").charAt(0).toUpperCase();

  useEffect(() => {
    saveDashboardPreferences(prefs);
  }, [prefs]);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error(t("settings.nameEmailRequired"));
      return;
    }
    setProfileBusy(true);
    try {
      await authService.updateProfile(fullName.trim(), email.trim());
      await refreshUser();
      toast.success(t("settings.profileUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.profileFail"));
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t("settings.passwordLen"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMatch"));
      return;
    }
    setPasswordBusy(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("settings.passwordUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings.passwordFail"));
    } finally {
      setPasswordBusy(false);
    }
  }

  function handleDefaultTabChange(value: DashboardTab) {
    setPrefs((prev) => ({ ...prev, defaultTab: value }));
    toast.success(t("settings.pageSaved"));
  }

  function openDefaultPage() {
    navigate(
      prefs.defaultTab === "courses"
        ? "/courses"
        : prefs.defaultTab === "modules"
          ? "/modules"
          : `/dashboard?tab=${prefs.defaultTab}`,
    );
  }

  return (
    <div className="pb-8">
      <PageTitle description={t("page.settingsDesc")}>{t("page.settings")}</PageTitle>

      <div className="grid overflow-hidden border border-border/40 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_9rem]">
        <div className={cn("flex items-center gap-4 px-4 py-4", TONE.forest)}>
          <div className="flex size-14 shrink-0 items-center justify-center bg-volt text-xl font-semibold text-volt-foreground">
            {initial}
          </div>
          <div className="min-w-0">
            <p className={cn("text-xs", TONE_MUTED.forest)}>{t("settings.account")}</p>
            <p className="truncate text-lg font-semibold">{user?.full_name || t("settings.staffMember")}</p>
          </div>
        </div>
        <div className={cn("flex flex-col justify-center px-4 py-4", TONE.teal)}>
          <p className={cn("text-xs", TONE_MUTED.teal)}>{t("settings.email")}</p>
          <p className="mt-0.5 truncate text-sm font-medium">{user?.email}</p>
        </div>
        <div className={cn("flex flex-col justify-center px-4 py-4", TONE.lime)}>
          <p className={cn("text-xs", TONE_MUTED.lime)}>{t("settings.role")}</p>
          <p className="mt-0.5 text-sm font-medium">{user ? label(user.role) : "—"}</p>
        </div>
        <div className={cn("flex flex-col justify-center px-4 py-4", TONE.amber)}>
          <p className={cn("text-xs", TONE_MUTED.amber)}>{t("settings.memberSince")}</p>
          <p className="mt-0.5 text-sm font-medium">{formatDate(user?.created_at, locale)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <SettingsSection tone="forest" title={t("settings.profile")} description={t("settings.profileDesc")}>
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">{t("settings.fullName")}</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">{t("settings.workEmail")}</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-role">{t("settings.role")}</Label>
              <Input
                id="profile-role"
                value={user ? label(user.role) : "—"}
                disabled
                className="h-11"
              />
            </div>
            <div className="flex justify-end border-t border-border/40 pt-4">
              <Button type="submit" disabled={profileBusy}>
                {profileBusy ? t("common.saving") : t("settings.saveProfile")}
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection tone="blue" title={t("settings.security")} description={t("settings.securityDesc")}>
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="current-password">{t("settings.currentPassword")}</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-11"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">{t("settings.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end border-t border-border/40 pt-4">
              <Button type="submit" disabled={passwordBusy}>
                {passwordBusy ? t("common.updating") : t("settings.updatePassword")}
              </Button>
            </div>
          </form>
        </SettingsSection>
      </div>

      <SettingsSection
        className="mt-4"
        tone="teal"
        title={t("settings.workspace")}
        description={t("settings.workspaceDesc")}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="default-tab">{t("settings.defaultPage")}</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={prefs.defaultTab} onValueChange={handleDefaultTabChange}>
                <SelectTrigger id="default-tab" className="h-11 min-w-[12rem] flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaceTabs.map((tab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                      {t(TAB_KEYS[tab.id])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button type="button" className={SAVE_TEXT} onClick={openDefaultPage}>
                {t("common.open")}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("settings.language")}</Label>
            <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
            <div className="max-w-[10rem]">
              <LanguageToggle />
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 border border-chart-2/40 bg-chart-2/10 px-4 py-3 lg:col-span-2">
            <span>
              <span className="block text-sm font-medium">{t("settings.emailNotes")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("settings.emailNotesHint")}
              </span>
            </span>
            <Switch
              checked={prefs.emailNotifications}
              onCheckedChange={(checked) =>
                setPrefs((prev) => ({ ...prev, emailNotifications: checked }))
              }
            />
          </label>
        </div>
      </SettingsSection>

      {can("staff.manage") && <StaffAccountsCard />}
    </div>
  );
}

function StaffAccountsCard() {
  const queryClient = useQueryClient();
  const { t, locale, label } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("instructor");

  const { data: staff = [], isPending } = useQuery({
    queryKey: ["staff-accounts"],
    queryFn: authService.listStaffAccounts,
  });

  const invite = useMutation({
    mutationFn: () =>
      authService.createStaffAccount({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      }),
    onSuccess: () => {
      toast.success(t("settings.staffCreated"));
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("instructor");
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SettingsSection
      className="mt-4"
      tone="amber"
      title={t("settings.staff")}
      description={t("settings.staffDesc")}
    >
      <form
        className="grid gap-3 border border-chart-4/40 bg-chart-4/10 p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_10rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="staff-name">{t("settings.fullName")}</Label>
          <Input
            id="staff-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            className="h-11"
            placeholder="Jane Uwase"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-email">{t("settings.email")}</Label>
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
            placeholder="name@organisation.rw"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-password">{t("settings.tempPassword")}</Label>
          <Input
            id="staff-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("settings.role")}</Label>
          <Select value={role} onValueChange={(value: StaffRole) => setRole(value)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instructor">{t("role.instructor")}</SelectItem>
              <SelectItem value="admin">{t("role.admin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="h-11 w-full xl:w-auto" disabled={invite.isPending || fullName.trim().length < 2}>
            {invite.isPending ? t("common.inviting") : t("settings.invite")}
          </Button>
        </div>
      </form>

      <div className="mt-4">
        {isPending ? (
          <TableSkeleton cols={4} rows={4} />
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.noStaff")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.name")}</TableHead>
                <TableHead>{t("col.email")}</TableHead>
                <TableHead>{t("col.role")}</TableHead>
                <TableHead>{t("col.joined")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.full_name || "—"}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell className={statusTone(member.role)}>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {label(member.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(member.created_at, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </SettingsSection>
  );
}
