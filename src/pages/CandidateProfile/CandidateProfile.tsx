import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate } from "@/services/candidateService";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value === "" || value == null ? "—" : value}</span>
    </p>
  );
}

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: Boolean(candidateId),
  });

  const candidate = data?.candidate;
  const cohort = data?.cohort;

  return (
    <div>
      <Link
        to="/dashboard?tab=candidates"
        className="inline-flex text-base text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Candidates
      </Link>

      {isPending && (
        <div className="mt-6 space-y-6">
          <PageHeaderSkeleton withMeta />
          <TableSkeleton rows={4} cols={3} />
        </div>
      )}

      {isError && (
        <p className="mt-6 text-destructive">{error instanceof Error ? error.message : "Could not load candidate"}</p>
      )}

      {candidate && (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-muted-foreground">{candidate.candidate_code}</p>
              <h1 className="mt-1 font-display text-4xl font-bold">{candidate.full_name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {cohort?.name ?? "—"} · {candidate.status.replace("_", " ")} · {candidate.training_status.replace("_", " ")}
              </p>
            </div>
            <div className="flex gap-2">
              {cohort && (
                <Button asChild variant="outline">
                  <Link to={`/cohorts/${cohort.id}`}>Open cohort</Link>
                </Button>
              )}
              {candidate.status === "graduated" && (
                <Button asChild>
                  <Link to={`/candidates/${candidate.id}/certificate`}>Print certificate</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card className="space-y-3 p-5">
              <h2 className="font-display text-xl font-semibold">Identity</h2>
              <Field label="National ID" value={candidate.national_id} />
              <Field label="Phone" value={candidate.phone} />
              <Field label="Email" value={candidate.email} />
              <Field label="Date of birth" value={candidate.date_of_birth} />
              <Field label="Gender" value={candidate.gender} />
              <Field label="District" value={candidate.district} />
            </Card>
            <Card className="space-y-3 p-5">
              <h2 className="font-display text-xl font-semibold">Training</h2>
              <Field label="Attendance" value={candidate.attendance_percentage != null ? `${candidate.attendance_percentage}%` : "—"} />
              <Field label="Exam score" value={candidate.exam_score != null ? `${candidate.exam_score}%` : "—"} />
              <Field label="Notes" value={candidate.instructor_notes} />
              {candidate.disqualification_reason && (
                <Field label="Disqualification" value={candidate.disqualification_reason} />
              )}
            </Card>
            <Card className="space-y-3 p-5">
              <h2 className="font-display text-xl font-semibold">Issues</h2>
              {(data?.issues.length ?? 0) === 0 && <EmptyState message="No issues recorded." />}
              <ul className="space-y-2">
                {data?.issues.slice(0, 6).map((issue) => (
                  <li key={issue.id} className="text-sm">
                    <span className="font-medium">{issue.title}</span>
                    <Badge className="ml-2" variant="secondary">
                      {issue.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold">Recent attendance</h2>
            <div className="mt-4">
              {(data?.recent_sessions.length ?? 0) === 0 ? (
                <EmptyState message="No sessions yet." />
              ) : (
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Session</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recent_sessions.map((s) => (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{s.date}</td>
                          <td className="px-4 py-3">{s.session_label}</td>
                          <td className="px-4 py-3">{s.status ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.activity_notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold">Scores</h2>
            <div className="mt-4">
              {(data?.scores.length ?? 0) === 0 ? (
                <EmptyState message="No assessments yet." />
              ) : (
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-4 py-3">Assessment</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.scores.map((s) => (
                        <tr key={s.assessment_id} className="border-b last:border-0">
                          <td className="px-4 py-3">{s.title}</td>
                          <td className="px-4 py-3">{s.type}</td>
                          <td className="px-4 py-3">
                            {s.score == null ? "—" : `${s.score} / ${s.max_score}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
