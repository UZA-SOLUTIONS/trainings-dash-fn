import type { Cohort } from "@/services/cohortService";
import { HorizontalBar } from "@/components/charts/ChartPrimitives";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn, statusTone } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Candidate = {
  cohort_id: string;
  status: string;
  training_status: string;
};

const TRAINING = [
  { key: "not_started", label: "Not started", colorClass: "bg-muted-foreground/45" },
  { key: "in_progress", label: "In progress", colorClass: "bg-chart-4" },
  { key: "completed", label: "Completed", colorClass: "bg-primary" },
  { key: "failed", label: "Failed", colorClass: "bg-destructive" },
] as const;

const MIX = [
  { key: "enrolled", label: "Enrolled", colorClass: "bg-primary" },
  { key: "waitlisted", label: "Waitlisted", colorClass: "bg-chart-4" },
  { key: "graduated", label: "Graduated", colorClass: "bg-chart-1" },
  { key: "other", label: "Other", colorClass: "bg-destructive" },
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
  const mix = [
    { ...MIX[0], value: enrolled },
    { ...MIX[1], value: waitlisted },
    { ...MIX[2], value: graduated },
    { ...MIX[3], value: other },
  ];
  const mixTotal = mix.reduce((a, r) => a + r.value, 0);

  return (
    <FadeIn className={cn("grid gap-4 xl:grid-cols-3", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Seats</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Occupied</TableCell>
            <TableCell className="tabular-nums">
              {occupied} / {capacity || "—"} ({percent(occupied, capacity)})
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Class</TableCell>
            <TableCell>
              {classLabel} · {candidates.length} candidates
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Enrolled</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("enrolled"))}>{enrolled}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Waitlisted</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("waitlisted"))}>{waitlisted}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Graduated</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("graduated"))}>{graduated}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Other</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("rejected"))}>{other}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Training</TableHead>
            <TableHead>Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className={statusTone("in_progress")}>In progress</TableCell>
            <TableCell className="tabular-nums">
              {inProgress} of {trainingTotal || 0}
            </TableCell>
          </TableRow>
          {training.map((row) => (
            <TableRow key={row.key}>
              <TableCell className={statusTone(row.key)}>{row.label}</TableCell>
              <TableCell>
                <HorizontalBar
                  label=""
                  value={row.value}
                  max={trainingTotal}
                  colorClass={row.colorClass}
                  display={`${row.value} · ${percent(row.value, trainingTotal)}`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Enrollment</TableHead>
            <TableHead>Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Mix</TableCell>
            <TableCell>
              <div className="flex h-2.5 overflow-hidden bg-muted">
                {mix.map((row) =>
                  row.value > 0 ? (
                    <div
                      key={row.key}
                      className={cn("h-full", row.colorClass)}
                      style={{ width: `${(row.value / (mixTotal || 1)) * 100}%` }}
                      title={`${row.label}: ${row.value}`}
                    />
                  ) : null,
                )}
              </div>
            </TableCell>
          </TableRow>
          {mix.map((row) => (
            <TableRow key={row.key}>
              <TableCell className={row.key === "other" ? statusTone("rejected") : statusTone(row.key)}>
                {row.label}
              </TableCell>
              <TableCell className={cn("tabular-nums", row.key === "other" ? statusTone("rejected") : statusTone(row.key))}>
                {row.value} · {percent(row.value, mixTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </FadeIn>
  );
}
