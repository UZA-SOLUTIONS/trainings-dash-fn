import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const TABS = [
  { suffix: "", label: "Roster", end: true },
  { suffix: "/curriculum", label: "Curriculum", end: false },
  { suffix: "/attendance", label: "Attendance", end: false },
  { suffix: "/assessments", label: "Marks", end: false },
  { suffix: "/gradebook", label: "Gradebook", end: false },
  { suffix: "/issues", label: "Issues", end: false },
  { suffix: "/reports", label: "Reports", end: false },
] as const;

export function CohortTabs({ cohortId }: { cohortId: string }) {
  return (
    <nav className="mt-6 flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.label}
          to={`/cohorts/${cohortId}${tab.suffix}`}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
