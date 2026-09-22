import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authService from "@/services/authService";
import { AUTH_EXPIRED_EVENT, TOKEN_KEY } from "@/services/api";
import type { StaffUser } from "@/services/authService";
import {
  can,
  canAccessTab,
  isAdmin as checkAdmin,
  isInstructor as checkInstructor,
  type PermissionAction,
} from "@/lib/permissions";
import type { NavTab } from "@/components/dashboard/types";

type AuthContextValue = {
  user: StaffUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isInstructor: boolean;
  can: (action: PermissionAction) => boolean;
  canAccessTab: (tab: NavTab) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authService.getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: next } = await authService.login(email, password);
    setUser(next);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const { user: next } = await authService.register(fullName, email, password);
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const next = await authService.getMe();
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAdmin: checkAdmin(user),
      isInstructor: checkInstructor(user),
      can: (action: PermissionAction) => can(user, action),
      canAccessTab: (tab: NavTab) => canAccessTab(user, tab),
    }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
