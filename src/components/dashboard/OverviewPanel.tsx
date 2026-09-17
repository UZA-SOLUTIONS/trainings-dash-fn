import { OverviewVisuals } from "@/components/dashboard/OverviewVisuals";
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
  return (
    <div className="pb-4">
      <header>
        <p className="text-eyebrow text-muted-foreground">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {role === "instructor" ? "Training overview" : "Programme overview"}
        </h1>
      </header>
      <OverviewVisuals className="mt-5" cohorts={cohorts} candidates={candidates} />
    </div>
  );
}
