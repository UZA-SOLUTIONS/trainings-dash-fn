export type DashboardTab =
  | "overview"
  | "cohorts"
  | "courses"
  | "modules"
  | "candidates"
  | "settings";

export const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "cohorts", label: "Classes" },
  { id: "candidates", label: "Candidates" },
  { id: "settings", label: "Settings" },
];

export function isDashboardTab(value: string | null): value is DashboardTab {
  return (
    value === "overview" ||
    value === "cohorts" ||
    value === "courses" ||
    value === "modules" ||
    value === "candidates" ||
    value === "settings"
  );
}

export function dashboardTabFromPath(pathname: string, search: string): DashboardTab {
  if (pathname.startsWith("/courses")) return "courses";
  if (pathname.startsWith("/modules")) return "modules";
  if (pathname.startsWith("/candidates")) return "candidates";
  if (pathname.startsWith("/cohorts")) return "cohorts";
  const raw = new URLSearchParams(search).get("tab");
  if (raw === "profile") return "settings";
  return isDashboardTab(raw) ? raw : "overview";
}

export function workspaceHref(tab: DashboardTab): string {
  if (tab === "courses") return "/courses";
  if (tab === "modules") return "/modules";
  return `/dashboard?tab=${tab}`;
}

/** True when the URL is already the list page for this sidebar item (not a nested profile/classroom). */
export function isExactWorkspaceHref(pathname: string, search: string, tab: DashboardTab): boolean {
  if (tab === "courses") return pathname === "/courses";
  if (tab === "modules") return pathname === "/modules";
  if (pathname !== "/dashboard") return false;
  const raw = new URLSearchParams(search).get("tab");
  if (tab === "overview") return raw === null || raw === "" || raw === "overview";
  if (raw === "profile") return tab === "settings";
  return raw === tab;
}
