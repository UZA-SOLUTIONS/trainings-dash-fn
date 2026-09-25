import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loadDashboardPreferences } from "@/components/dashboard/preferences";
import { LoadingSpinner } from "@/components/feedback/LoadingSpinner";
import { useI18n } from "@/i18n/LanguageContext";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login } = useAuth();
  const { t } = useI18n();
  const fromState = (location.state as { from?: string } | null)?.from;
  const defaultDashboard = `/dashboard?tab=${loadDashboardPreferences().defaultTab}`;
  const redirectTo = fromState ?? defaultDashboard;
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "forgot") {
      toast.message(t("auth.forgotHint"));
      setMode("signin");
      return;
    }
    setBusy(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setBusy(false);
      toast.error(err instanceof Error ? err.message : t("auth.error"));
    }
  }

  if (loading || busy) {
    return <LoadingSpinner label={busy ? t("auth.signingIn") : t("auth.loading")} />;
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
        {mode === "signin" ? t("auth.signIn") : t("auth.forgot")}
      </h1>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
            autoComplete="email"
            placeholder="name@organisation.rw"
            className="h-11"
          />
        </div>
        {mode === "signin" && (
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className="h-11 pr-11"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
        <Button type="submit" className="mt-2 h-11 w-full" disabled={busy}>
          {busy ? t("auth.wait") : t("auth.continue")}
        </Button>
      </form>

      <div className="mt-6 border-t border-border/40 pt-5">
        <button
          type="button"
          className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "forgot" : "signin")}
        >
          {mode === "signin" ? t("auth.forgot") : t("auth.backToSignIn")}
        </button>
      </div>
    </div>
  );
}
