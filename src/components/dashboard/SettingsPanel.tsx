import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as authService from "@/services/authService";
import type { StaffRole } from "@/services/authService";
import { Card } from "@/components/ui/card";
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
import { roleLabel } from "@/lib/permissions";
import { DASHBOARD_TABS, type DashboardTab } from "@/components/dashboard/types";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { toast } from "sonner";

const WORKSPACE_TABS = DASHBOARD_TABS.filter((t) => t.id !== "settings");

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-RW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SettingsPanel() {
  const navigate = useNavigate();
  const { user, refreshUser, canAccessTab, can } = useAuth();
  const [prefs, setPrefs] = useState<DashboardPreferences>(() => loadDashboardPreferences());
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const workspaceTabs = WORKSPACE_TABS.filter((t) => canAccessTab(t.id));

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
      toast.error("Name and email are required.");
      return;
    }
    setProfileBusy(true);
    try {
      await authService.updateProfile(fullName.trim(), email.trim());
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setPasswordBusy(false);
    }
  }

  function handleDefaultTabChange(value: DashboardTab) {
    setPrefs((prev) => ({ ...prev, defaultTab: value }));
    toast.success("Default page saved");
  }

  return (
    <div>
      <p className="text-eyebrow text-muted-foreground">Account</p>
      <h1 className="mt-2 font-display text-4xl font-bold">Settings</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70 p-6">
          <p className="text-eyebrow text-muted-foreground">Your account</p>
          <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 font-display text-2xl font-bold text-primary">
            {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold">
            {user?.full_name || "Staff member"}
          </h2>
          <p className="mt-1 text-base text-muted-foreground">{user?.email}</p>
          {user?.role && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{roleLabel(user.role)}</Badge>
            </div>
          )}
          <dl className="mt-6 space-y-3 text-base">
            <div>
              <dt className="text-eyebrow text-muted-foreground">Member since</dt>
              <dd className="mt-1 font-medium">{formatDate(user?.created_at)}</dd>
            </div>
            <div>
              <dt className="text-eyebrow text-muted-foreground">User ID</dt>
              <dd className="mt-1 font-mono text-sm text-muted-foreground">{user?.id ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="border-border/70 p-6">
          <h2 className="font-display text-xl font-semibold">Edit profile</h2>
          <form className="mt-6 space-y-5" onSubmit={handleProfileSubmit}>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
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
            <div className="space-y-2">
              <Label>Role</Label>
              <Input
                value={user ? roleLabel(user.role) : "—"}
                disabled
                className="h-11"
              />
            </div>
            <Button type="submit" disabled={profileBusy}>
              {profileBusy ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Card>

        <Card className="border-border/70 p-6">
          <h2 className="font-display text-xl font-semibold">Workspace</h2>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="default-tab">Default page after sign-in</Label>
              <Select value={prefs.defaultTab} onValueChange={handleDefaultTabChange}>
                <SelectTrigger id="default-tab" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workspaceTabs.map((tab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  navigate(
                    prefs.defaultTab === "courses"
                      ? "/courses"
                      : prefs.defaultTab === "modules"
                        ? "/modules"
                        : `/dashboard?tab=${prefs.defaultTab}`,
                  )
                }
              >
                Open default page
              </Button>
            </div>

            <label className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Email notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates about cohort and candidate changes.
                </p>
              </div>
              <Switch
                checked={prefs.emailNotifications}
                onCheckedChange={(checked) =>
                  setPrefs((prev) => ({ ...prev, emailNotifications: checked }))
                }
              />
            </label>
          </div>
        </Card>

        <Card className="border-border/70 p-6">
          <h2 className="font-display text-xl font-semibold">Security</h2>
          <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
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
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
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
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
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
            <Button type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>

      {can("staff.manage") && <StaffAccountsCard />}
    </div>
  );
}

function StaffAccountsCard() {
  const queryClient = useQueryClient();
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
      toast.success("Staff account created");
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("instructor");
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-6 border-border/70 p-6">
      <h2 className="font-display text-xl font-semibold">Staff accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite admins and instructors. Instructors only see the cohorts they are assigned to.
      </p>

      <form
        className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="staff-name">Full name</Label>
          <Input
            id="staff-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password">Temporary password</Label>
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
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={(value: StaffRole) => setRole(value)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={invite.isPending || fullName.trim().length < 2}>
            {invite.isPending ? "Inviting…" : "Invite staff"}
          </Button>
        </div>
      </form>

      <div className="mt-8">
        {isPending ? (
          <TableSkeleton cols={4} rows={4} />
        ) : staff.length === 0 ? (
          <p className="text-muted-foreground">No staff accounts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name || "—"}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(member.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
