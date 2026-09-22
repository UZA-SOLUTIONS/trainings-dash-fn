import type { Cohort } from "@/services/cohortService";
import { Card } from "@/components/ui/card";
import { HorizontalBar, StatRing } from "@/components/charts/ChartPrimitives";
import { cn } from "@/lib/utils";

type Candidate = {
  cohort_id: string;
  status: string;
  training_status: string;
};

const MEMBERSHIP = {
  enrolled: "var(--primary)",
  waitlisted: "var(--volt)",
  graduated: "oklch(0.55 0.08 158)",
  other: "oklch(0.62 0.12 250)",
};

const TRAINING = [
  { key: "not_started", label: "Not started", color: "var(--muted-foreground)", colorClass: "bg-muted-foreground/45" },
  { key: "in_progress", label: "In progress", color: "var(--primary)", colorClass: "bg-primary" },
  { key: "completed", label: "Completed", color: "var(--chart-2)", colorClass: "bg-chart-2" },
  { key: "failed", label: "Failed", color: "var(--destructive)", colorClass: "bg-destructive" },
] as const;

function percent(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

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
  const waitlisted = countStatus("waitlisted");
  const graduated = countStatus("graduated");
  const other = countStatus("rejected") + countStatus("withdrawn");
  const occupied = enrolled + graduated;
  const classLabel = cohorts.length === 1 ? cohorts[0].name : `${cohorts.length} classes`;
  const inProgress = countTraining("in_progress");
  const training = TRAINING.map((row) => ({ ...row, value: countTraining(row.key) }));
  const trainingTotal = candidates.length;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Seats</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">
          {occupied} / {capacity || "—"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {classLabel} · {candidates.length} candidates
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {enrolled} enrolled · {waitlisted} waitlisted · {graduated} graduated
        </p>
        {capacity > 0 && (
          <div className="mt-5">
            <HorizontalBar
              label="Occupied"
              value={occupied}
              max={capacity}
              colorClass="bg-primary"
              display={`${percent(occupied, capacity)}`}
            />
          </div>
        )}
      </Card>
      <StatRing
        title="Membership"
        centerLabel={String(candidates.length)}
        centerSub="candidates"
        segments={[
          { label: "Enrolled", value: enrolled, color: MEMBERSHIP.enrolled },
          { label: "Waitlisted", value: waitlisted, color: MEMBERSHIP.waitlisted },
          { label: "Graduated", value: graduated, color: MEMBERSHIP.graduated },
          { label: "Other", value: other, color: MEMBERSHIP.other },
        ]}
        legend={[
          { label: "Enrolled", value: enrolled, color: MEMBERSHIP.enrolled },
          { label: "Waitlisted", value: waitlisted, color: MEMBERSHIP.waitlisted },
          { label: "Graduated", value: graduated, color: MEMBERSHIP.graduated },
          { label: "Other", value: other, color: MEMBERSHIP.other },
        ]}
      />
      <Card className="flex h-full min-w-0 flex-col p-5 md:col-span-2 xl:col-span-1">
        <p className="text-sm text-muted-foreground">Training status</p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums">{inProgress}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          in progress of {trainingTotal || 0}
        </p>

        <div
          className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label="Training status mix"
        >
          {training.map((row) =>
            row.value > 0 ? (
              <div
                key={row.key}
                className="h-full min-w-0"
                style={{
                  width: `${(row.value / Math.max(trainingTotal, 1)) * 100}%`,
                  backgroundColor: row.color,
                }}
                title={`${row.label}: ${row.value}`}
              />
            ) : null,
          )}
        </div>

        <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-1">
          {training.map((row) => (
            <HorizontalBar
              key={row.key}
              label={row.label}
              value={row.value}
              max={trainingTotal}
              colorClass={row.colorClass}
              display={`${row.value} · ${percent(row.value, trainingTotal)}`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
