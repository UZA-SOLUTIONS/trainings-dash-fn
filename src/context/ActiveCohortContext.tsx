import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listCohorts, type Cohort } from "@/services/cohortService";
import { listCandidates } from "@/services/candidateService";
import { cohortIdFromPath } from "@/components/dashboard/types";

const ACTIVE_COHORT_KEY = "training_dash_active_cohort";

type ActiveCohortContextValue = {
  cohorts: Cohort[];
  activeCohort: Cohort | null;
  activeCohortId: string | null;
  loading: boolean;
  setActiveCohort: (id: string) => void;
};

const ActiveCohortContext = createContext<ActiveCohortContextValue | null>(null);

function loadStoredCohortId(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_COHORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredCohortId(id: string) {
  localStorage.setItem(ACTIVE_COHORT_KEY, JSON.stringify(id));
}

function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function pickDefaultCohort(cohorts: Cohort[], storedId: string | null): Cohort | null {
  if (cohorts.length === 0) return null;
  if (storedId) {
    const stored = cohorts.find((cohort) => cohort.id === storedId);
    if (stored) return stored;
  }
  if (cohorts.length === 1) return cohorts[0];
  const today = todayIso();
  const current = cohorts.filter(
    (cohort) =>
      (!cohort.start_date || cohort.start_date <= today) &&
      (!cohort.end_date || cohort.end_date >= today),
  );
  const pool = current.length > 0 ? current : cohorts;
  return [...pool].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""))[0] ?? null;
}

export function ActiveCohortProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [storedId, setStoredId] = useState<string | null>(() => loadStoredCohortId());
  const urlCohortId = cohortIdFromPath(location.pathname);

  const { data, isPending } = useQuery({
    queryKey: ["manage-overview"],
    queryFn: async () => {
      const [cohorts, candidates] = await Promise.all([listCohorts(), listCandidates()]);
      return { cohorts, candidates };
    },
    enabled: Boolean(user),
  });

  const cohorts = data?.cohorts ?? [];

  const picked = useMemo(() => {
    if (urlCohortId) {
      return cohorts.find((cohort) => cohort.id === urlCohortId) ?? null;
    }
    return pickDefaultCohort(cohorts, storedId);
  }, [urlCohortId, cohorts, storedId]);

  useEffect(() => {
    if (urlCohortId) {
      if (urlCohortId === storedId) return;
      saveStoredCohortId(urlCohortId);
      setStoredId(urlCohortId);
      return;
    }
    if (picked?.id && picked.id !== storedId) {
      saveStoredCohortId(picked.id);
      setStoredId(picked.id);
    }
  }, [urlCohortId, picked?.id, storedId]);

  const setActiveCohort = useCallback((id: string) => {
    saveStoredCohortId(id);
    setStoredId(id);
  }, []);

  const activeCohortId = urlCohortId || picked?.id || null;

  const value = useMemo(
    () => ({
      cohorts,
      activeCohort: picked,
      activeCohortId,
      loading: Boolean(user) && isPending,
      setActiveCohort,
    }),
    [cohorts, picked, activeCohortId, user, isPending, setActiveCohort],
  );

  return <ActiveCohortContext.Provider value={value}>{children}</ActiveCohortContext.Provider>;
}

export function useActiveCohort() {
  const ctx = useContext(ActiveCohortContext);
  if (!ctx) throw new Error("useActiveCohort must be used within ActiveCohortProvider");
  return ctx;
}
