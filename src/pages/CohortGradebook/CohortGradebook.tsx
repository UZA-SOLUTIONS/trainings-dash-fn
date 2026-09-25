import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { getScoresReport } from "@/services/reportService";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";
import { cn, scoreTone } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CohortGradebook() {
  const { t } = useI18n();
  const { cohortId } = useParams<{ cohortId: string }>();
  const { data: cohortData } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const { data: scores, isPending: scoresLoading } = useQuery({
    queryKey: ["report-scores", cohortId],
    queryFn: () => getScoresReport(cohortId!),
    enabled: Boolean(cohortId),
  });

  return (
    <div>
      <PageTitle>{t("page.gradebook")}</PageTitle>
      <CohortSummary />
      <section>
        {scoresLoading ? (
          <TableSkeleton cols={6} />
        ) : !scores || scores.assessments.length === 0 ? (
          <EmptyState message={t("empty.noAssessments")} />
        ) : (
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-[10rem]">{t("col.candidate")}</TableHead>
                {scores.assessments.map((a) => (
                  <TableHead key={a.id}>{a.title}</TableHead>
                ))}
                <TableHead>{t("col.average")}</TableHead>
                <TableHead>{t("col.examPct")}</TableHead>
                <TableHead>{t("col.attendancePct")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.rows.map((row) => {
                const percents = scores.assessments
                  .map((a) => {
                    const score = row.scores[a.id];
                    if (score == null || !a.max_score) return null;
                    return Math.round((score / a.max_score) * 100);
                  })
                  .filter((v): v is number => v != null);
                const average =
                  percents.length === 0
                    ? null
                    : Math.round(percents.reduce((sum, n) => sum + n, 0) / percents.length);
                const candidate = cohortData?.candidates.find((c) => c.id === row.candidate_id);
                return (
                  <TableRow key={row.candidate_id}>
                    <TableCell className="sticky left-0 z-[1] min-w-[10rem] bg-card">
                      <p>{row.full_name}</p>
                      <p className="font-mono text-[11px] text-primary">{row.candidate_code}</p>
                    </TableCell>
                    {scores.assessments.map((a) => {
                      const score = row.scores[a.id];
                      const pct = score == null || !a.max_score ? null : Math.round((score / a.max_score) * 100);
                      return (
                        <TableCell key={a.id} className={cn("tabular-nums", scoreTone(pct))}>
                          {score ?? "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell className={cn("tabular-nums", scoreTone(average))}>
                      {average == null ? "—" : `${average}%`}
                    </TableCell>
                    <TableCell className={cn("tabular-nums", scoreTone(row.exam_score))}>
                      {row.exam_score == null ? "—" : `${row.exam_score}%`}
                    </TableCell>
                    <TableCell className={cn("tabular-nums", scoreTone(candidate?.attendance_percentage))}>
                      {candidate?.attendance_percentage == null
                        ? "—"
                        : `${candidate.attendance_percentage}%`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
