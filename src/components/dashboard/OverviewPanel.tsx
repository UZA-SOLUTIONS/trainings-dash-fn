import { Link } from "react-router-dom";
import { FiCalendar, FiEdit3, FiAlertCircle } from "react-icons/fi";
import { OverviewActivity } from "@/components/dashboard/OverviewActivity";
import { OverviewVisuals } from "@/components/dashboard/OverviewVisuals";
import { Card } from "@/components/ui/card";
import { classroomHref } from "@/components/dashboard/types";
import { useActiveCohort } from "@/hooks/useActiveCohort";
import type { StaffRole } from "@/services/authService";
import type { Cohort } from "@/services/cohortService";

type Candidate = {
  cohort_id: string;
  status: string;
  training_status: string;
};

export function OverviewPanel({
  cohorts,
  candidates,
  role,
}: {
  cohorts: Cohort[];
  candidates: Candidate[];
  role: StaffRole;
}) {
  const { activeCohort, activeCohortId } = useActiveCohort();
  const scopedCohorts = activeCohort ? [activeCohort] : cohorts;
  const scopedCandidates = activeCohort
    ? candidates.filter((row) => row.cohort_id === activeCohort.id)
    : candidates;

  const shortcuts = [
    { tool: "attendance" as const, label: "Attendance", icon: FiCalendar },
    { tool: "assessments" as const, label: "Marks", icon: FiEdit3 },
    { tool: "issues" as const, label: "Issues", icon: FiAlertCircle },
  ];

  return (
    <div className="pb-4">
      <header>
        <p className="text-eyebrow text-muted-foreground">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {role === "instructor" ? "Training overview" : "Programme overview"}
        </h1>
        {activeCohort && (
          <p className="mt-2 text-sm text-muted-foreground">
            {activeCohort.name}
            {activeCohort.course?.name ? ` · ${activeCohort.course.name}` : ""}
            {activeCohort.start_date || activeCohort.end_date
              ? ` · ${activeCohort.start_date ?? "—"} → ${activeCohort.end_date ?? "—"}`
              : ""}
          </p>
        )}
      </header>

      {activeCohortId && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {shortcuts.map(({ tool, label, icon: Icon }) => (
            <Card key={tool} className="p-0">
              <Link
                to={classroomHref(tool, activeCohortId)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors hover:bg-muted/50"
              >
                <Icon size={18} aria-hidden />
                {label}
              </Link>
            </Card>
          ))}
        </div>
      )}

      <OverviewVisuals className="mt-5" cohorts={scopedCohorts} candidates={scopedCandidates} />
      {activeCohortId ? <OverviewActivity cohortId={activeCohortId} /> : null}
    </div>
  );
}
