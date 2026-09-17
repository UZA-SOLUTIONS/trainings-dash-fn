import type { Cohort } from "@/services/cohortService";
import { Card } from "@/components/ui/card";
import { DonutChart, HistogramChart } from "@/components/charts/ChartPrimitives";
import { cn } from "@/lib/utils";

type Candidate = {
  cohort_id: string;
  status: string;
  training_status: string;
};

export function OverviewVisuals({
  cohorts,
  candidates,
  className,
}: {
  cohorts: Cohort[];
  candidates: Candidate[];
  className?: string;
}) {
  const countStatus = (s: string) => candidates.filter((c) => c.status === s).length;
  const countTraining = (s: string) => candidates.filter((c) => c.training_status === s).length;
  const capacity = cohorts.reduce((a, c) => a + c.capacity, 0);
  const enrolled = countStatus("enrolled");
  const graduated = countStatus("graduated");

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Seats</p>
        <p className="mt-1 font-display text-3xl font-bold">
          {enrolled + graduated} / {capacity || "—"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {cohorts.length} cohort{cohorts.length === 1 ? "" : "s"} · {candidates.length} candidates
        </p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Membership</p>
        <div className="mt-4">
          <DonutChart
            centerLabel={String(candidates.length)}
            centerSub="candidates"
            segments={[
              { label: "Enrolled", value: enrolled, color: "var(--primary)" },
              { label: "Waitlisted", value: countStatus("waitlisted"), color: "var(--volt)" },
              { label: "Graduated", value: graduated, color: "oklch(0.55 0.08 158)" },
              {
                label: "Other",
                value: countStatus("rejected") + countStatus("withdrawn"),
                color: "oklch(0.62 0.12 250)",
              },
            ]}
          />
        </div>
      </Card>
      <Card className="p-5 md:col-span-2">
        <p className="text-sm text-muted-foreground">Training status</p>
        <div className="mt-4">
          <HistogramChart
            bars={[
              { label: "Not started", value: countTraining("not_started") },
              { label: "In progress", value: countTraining("in_progress") },
              { label: "Completed", value: countTraining("completed") },
              { label: "Failed", value: countTraining("failed") },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
