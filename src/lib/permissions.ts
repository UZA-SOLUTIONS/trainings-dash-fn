import type { StaffUser } from "@/services/authService";
import type { DashboardTab, NavTab } from "@/components/dashboard/types";

export type PermissionAction =
  | "cohorts.write"
  | "courses.write"
  | "modules.write"
  | "candidates.read"
  | "candidates.membership"
  | "candidates.training"
  | "candidates.delete"
  | "staff.manage"
  | "attendance.write"
  | "assessments.write"
  | "issues.write"
  | "reports.read"
  | "curriculum.write";

const TAB_ACCESS: Record<NavTab, StaffUser["role"][]> = {
  overview: ["admin", "instructor"],
  cohorts: ["admin", "instructor"],
  courses: [],
  modules: [],
  candidates: ["admin", "instructor"],
  settings: ["admin", "instructor"],
  roster: ["admin", "instructor"],
  curriculum: ["admin", "instructor"],
  attendance: ["admin", "instructor"],
  assessments: ["admin", "instructor"],
  gradebook: ["admin", "instructor"],
  issues: ["admin", "instructor"],
  reports: ["admin", "instructor"],
};

export function roleLabel(role: StaffUser["role"]): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "instructor":
      return "Instructor";
    default:
      return role;
  }
}

export function can(user: StaffUser | null, action: PermissionAction): boolean {
  if (!user) return false;

  switch (action) {
    case "staff.manage":
      return user.role === "admin";
    case "cohorts.write":
      return user.role === "admin";
    case "courses.write":
    case "modules.write":
      return false;
    case "candidates.delete":
    case "candidates.read":
    case "candidates.membership":
    case "candidates.training":
    case "attendance.write":
    case "assessments.write":
    case "issues.write":
    case "reports.read":
    case "curriculum.write":
      return user.role === "admin" || user.role === "instructor";
    default:
      return false;
  }
}

export function canAccessTab(user: StaffUser | null, tab: NavTab): boolean {
  if (!user) return false;
  return TAB_ACCESS[tab].includes(user.role);
}

export function defaultTabForRole(): DashboardTab {
  return "overview";
}

export function isInstructor(user: StaffUser | null): boolean {
  return user?.role === "instructor";
}

export function isAdmin(user: StaffUser | null): boolean {
  return user?.role === "admin";
}
