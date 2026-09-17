import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { getScoresReport } from "@/services/reportService";
import { CohortClassroomHeader } from "@/components/classroom/CohortClassroomHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { TableSkeleton } from "@/components/feedback/Skeleton";

export default function CohortGradebook() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const { data: cohortData, isPending: cohortLoading } = useQuery({
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
      <CohortClassroomHeader cohort={cohortData?.cohort} loading={cohortLoading} />
      <section className="mt-8">
        {scoresLoading ? (
          <TableSkeleton cols={6} />
        ) : !scores || scores.assessments.length === 0 ? (
          <EmptyState message="No assessments yet. Add quizzes, tests, or exams on the Marks tab." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Candidate</th>
                  {scores.assessments.map((a) => (
                    <th key={a.id} className="px-4 py-3">
                      {a.title}
                    </th>
                  ))}
                  <th className="px-4 py-3">Average</th>
                  <th className="px-4 py-3">Exam %</th>
                  <th className="px-4 py-3">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {scores.rows.map((row) => {
                  const entered = scores.assessments
                    .map((a) => row.scores[a.id])
                    .filter((v): v is number => v != null && Number.isFinite(v));
                  const average =
                    entered.length === 0
                      ? null
                      : Math.round(entered.reduce((sum, n) => sum + n, 0) / entered.length);
                  const candidate = cohortData?.candidates.find((c) => c.id === row.candidate_id);
                  return (
                    <tr key={row.candidate_id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.full_name}</p>
                        <p className="font-mono text-xs text-primary">{row.candidate_code}</p>
                      </td>
                      {scores.assessments.map((a) => (
                        <td key={a.id} className="px-4 py-3">
                          {row.scores[a.id] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3">{average ?? "—"}</td>
                      <td className="px-4 py-3">{row.exam_score ?? "—"}</td>
                      <td className="px-4 py-3">{candidate?.attendance_percentage ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
