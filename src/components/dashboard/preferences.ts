import type { DashboardTab } from "./types";

export type DashboardPreferences = {
  defaultTab: DashboardTab;
  emailNotifications: boolean;
};

const PREFS_KEY = "training_dash_prefs";

const DEFAULT_PREFS: DashboardPreferences = {
  defaultTab: "overview",
  emailNotifications: true,
};

export function loadDashboardPreferences(): DashboardPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences> & { defaultTab?: string };
    const defaultTab = isAllowedTab(parsed.defaultTab) ? parsed.defaultTab : DEFAULT_PREFS.defaultTab;
    return {
      defaultTab,
      emailNotifications: parsed.emailNotifications ?? DEFAULT_PREFS.emailNotifications,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function isAllowedTab(value: string | undefined): value is DashboardTab {
  return (
    value === "overview" ||
    value === "cohorts" ||
    value === "candidates" ||
    value === "settings"
  );
}

export function saveDashboardPreferences(prefs: DashboardPreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
