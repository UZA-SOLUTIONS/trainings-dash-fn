import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loadDashboardPreferences } from "@/components/dashboard/preferences";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, login, register } = useAuth();
  const fromState = (location.state as { from?: string } | null)?.from;
  const defaultDashboard = `/dashboard?tab=${loadDashboardPreferences().defaultTab}`;
  const redirectTo = fromState ?? defaultDashboard;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await register(fullName, email, password);
      } else {
        await login(email, password);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[26rem]">
      <div className="rounded-2xl border border-border/70 bg-background p-7 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Staff portal
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          {mode === "signin" ? "Sign in" : "Create admin account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {mode === "signin"
            ? "Secure access for instructors and programme admins."
            : "The first account becomes admin. Additional staff are invited by an admin."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
                className="h-11"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
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
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-11 pr-11"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="mt-2 h-11 w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Continue" : "Create account"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border/70 pt-5">
          <button
            type="button"
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "First-time setup? Create the admin account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
