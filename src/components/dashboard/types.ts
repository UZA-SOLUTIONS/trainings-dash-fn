export type DashboardTab =
  | "overview"
  | "cohorts"
  | "courses"
  | "modules"
  | "candidates"
  | "settings";

export type ClassroomTool =
  | "roster"
  | "curriculum"
  | "attendance"
  | "assessments"
  | "gradebook"
  | "issues"
  | "reports";

export type NavTab = DashboardTab | ClassroomTool;

export const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "cohorts", label: "Classes" },
  { id: "candidates", label: "Candidates" },
  { id: "settings", label: "Settings" },
];

export const CLASSROOM_TOOLS: { id: ClassroomTool; label: string; suffix: string }[] = [
  { id: "roster", label: "Roster", suffix: "" },
  { id: "curriculum", label: "Curriculum", suffix: "/curriculum" },
  { id: "attendance", label: "Attendance", suffix: "/attendance" },
  { id: "assessments", label: "Marks", suffix: "/assessments" },
  { id: "gradebook", label: "Gradebook", suffix: "/gradebook" },
  { id: "issues", label: "Issues", suffix: "/issues" },
  { id: "reports", label: "Reports", suffix: "/reports" },
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

export function isClassroomTool(value: string | null): value is ClassroomTool {
  return CLASSROOM_TOOLS.some((tool) => tool.id === value);
}

export function cohortIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/cohorts\/([^/]+)/);
  return match?.[1] ?? null;
}

export function classroomToolFromPath(pathname: string): ClassroomTool | null {
  const match = pathname.match(/^\/cohorts\/[^/]+(?:\/([^/]+))?\/?$/);
  if (!match) return null;
  const suffix = match[1];
  if (!suffix) return "roster";
  const tool = CLASSROOM_TOOLS.find((entry) => entry.suffix === `/${suffix}`);
  return tool?.id ?? null;
}

export function classroomHref(tool: ClassroomTool, cohortId: string): string {
  const entry = CLASSROOM_TOOLS.find((item) => item.id === tool);
  return `/cohorts/${cohortId}${entry?.suffix ?? ""}`;
}

export function dashboardTabFromPath(pathname: string, search: string): NavTab {
  const classroom = classroomToolFromPath(pathname);
  if (classroom) return classroom;
  if (pathname.startsWith("/courses")) return "courses";
  if (pathname.startsWith("/modules")) return "modules";
  if (pathname.startsWith("/candidates")) return "candidates";
  const raw = new URLSearchParams(search).get("tab");
  if (raw === "profile") return "settings";
  return isDashboardTab(raw) ? raw : "overview";
}

export function workspaceHref(tab: NavTab, cohortId?: string | null): string {
  if (isClassroomTool(tab)) {
    if (!cohortId) return "/dashboard?tab=cohorts";
    return classroomHref(tab, cohortId);
  }
  if (tab === "courses") return "/courses";
  if (tab === "modules") return "/modules";
  return `/dashboard?tab=${tab}`;
}

/** True when the URL is already the list page for this sidebar item (not a nested profile/classroom). */
export function isExactWorkspaceHref(pathname: string, search: string, tab: NavTab): boolean {
  if (isClassroomTool(tab)) {
    return classroomToolFromPath(pathname) === tab;
  }
  if (tab === "courses") return pathname === "/courses";
  if (tab === "modules") return pathname === "/modules";
  if (pathname !== "/dashboard") return false;
  const raw = new URLSearchParams(search).get("tab");
  if (tab === "overview") return raw === null || raw === "" || raw === "overview";
  if (raw === "profile") return tab === "settings";
  return raw === tab;
}
