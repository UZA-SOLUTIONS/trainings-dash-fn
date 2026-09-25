import type { Cohort } from "@/services/cohortService";
import { HorizontalBar } from "@/components/charts/ChartPrimitives";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn, statusTone } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";
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
  { key: "not_started", colorClass: "bg-muted-foreground/45" },
  { key: "in_progress", colorClass: "bg-chart-4" },
  { key: "completed", colorClass: "bg-primary" },
  { key: "failed", colorClass: "bg-destructive" },
] as const;

const MIX = [
  { key: "enrolled", colorClass: "bg-primary" },
  { key: "waitlisted", colorClass: "bg-chart-4" },
  { key: "graduated", colorClass: "bg-chart-1" },
  { key: "other", colorClass: "bg-destructive" },
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
  const { t, label } = useI18n();
  const countStatus = (s: string) => candidates.filter((c) => c.status === s).length;
  const countTraining = (s: string) => candidates.filter((c) => c.training_status === s).length;
  const capacity = cohorts.reduce((a, c) => a + c.capacity, 0);
  const enrolled = countStatus("enrolled");
  const waitlisted = countStatus("waitlisted");
  const graduated = countStatus("graduated");
  const other = countStatus("rejected") + countStatus("withdrawn");
  const occupied = enrolled + graduated;
  const classLabel =
    cohorts.length === 1 ? cohorts[0].name : t("overview.classesN", { count: cohorts.length });
  const inProgress = countTraining("in_progress");
  const training = TRAINING.map((row) => ({
    ...row,
    label: label(row.key),
    value: countTraining(row.key),
  }));
  const trainingTotal = candidates.length;
  const mix = [
    { ...MIX[0], label: t("overview.enrolled"), value: enrolled },
    { ...MIX[1], label: t("overview.waitlisted"), value: waitlisted },
    { ...MIX[2], label: t("overview.graduated"), value: graduated },
    { ...MIX[3], label: t("overview.other"), value: other },
  ];
  const mixTotal = mix.reduce((a, r) => a + r.value, 0);

  return (
    <FadeIn className={cn("grid gap-4 xl:grid-cols-3", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("col.seats")}</TableHead>
            <TableHead>{t("common.value")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>{t("overview.occupied")}</TableCell>
            <TableCell className="tabular-nums">
              {occupied} / {capacity || "—"} ({percent(occupied, capacity)})
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("overview.class")}</TableCell>
            <TableCell>
              {classLabel} · {t("overview.candidatesN", { count: candidates.length })}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("overview.enrolled")}</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("enrolled"))}>{enrolled}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("overview.waitlisted")}</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("waitlisted"))}>{waitlisted}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("overview.graduated")}</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("graduated"))}>{graduated}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{t("overview.other")}</TableCell>
            <TableCell className={cn("tabular-nums", statusTone("rejected"))}>{other}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("col.training")}</TableHead>
            <TableHead>{t("common.count")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className={statusTone("in_progress")}>{t("overview.inProgress")}</TableCell>
            <TableCell className="tabular-nums">
              {t("overview.of", { value: inProgress, total: trainingTotal || 0 })}
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
            <TableHead>{t("col.enrollment")}</TableHead>
            <TableHead>{t("common.count")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>{t("overview.mix")}</TableCell>
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
