import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate } from "@/services/candidateService";
import { CertificatePreviewDialog } from "@/components/certificate/CertificatePreviewDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardPageSkeleton } from "@/components/feedback/Skeleton";
import { FadeIn } from "@/components/motion/FadeIn";
import { PageTitle } from "@/components/layout/PageTitle";
import { LINK_TEXT, cn, humanize, scoreTone, statusTone } from "@/lib/utils";

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: Boolean(candidateId),
  });

  const candidate = data?.candidate;
  const cohort = data?.cohort;

  return (
    <div>
      <PageTitle>Candidate</PageTitle>
      <Link
        to="/dashboard?tab=candidates"
        className={LINK_TEXT}
      >
        ← Candidates
      </Link>

      {isPending && <DashboardPageSkeleton cols={3} rows={5} />}

      {isError && (
        <p className="mt-6 text-destructive">{error instanceof Error ? error.message : "Could not load candidate"}</p>
      )}

      {candidate && (
        <FadeIn>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-eyebrow text-muted-foreground">{candidate.candidate_code}</p>
              <h2 className="mt-1 text-2xl">{candidate.full_name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {cohort?.name ?? "—"} ·{" "}
                <span className={statusTone(candidate.status)}>{humanize(candidate.status)}</span>
                {" · "}
                <span className={statusTone(candidate.training_status)}>
                  {humanize(candidate.training_status)}
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              {cohort && (
                <Link to={`/cohorts/${cohort.id}`} className={LINK_TEXT}>
                  Open cohort
                </Link>
              )}
              {candidate.status === "graduated" && (
                <button type="button" className={LINK_TEXT} onClick={() => setPreviewOpen(true)}>
                  Print certificate
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identity</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>National ID</TableCell>
                  <TableCell>{candidate.national_id || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Phone</TableCell>
                  <TableCell>{candidate.phone || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>{candidate.email || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Date of birth</TableCell>
                  <TableCell>{candidate.date_of_birth || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Gender</TableCell>
                  <TableCell>{candidate.gender || "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>District</TableCell>
                  <TableCell>{candidate.district || "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Training</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Attendance</TableCell>
                  <TableCell className={scoreTone(candidate.attendance_percentage)}>
                    {candidate.attendance_percentage != null ? `${candidate.attendance_percentage}%` : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Exam score</TableCell>
                  <TableCell className={scoreTone(candidate.exam_score)}>
                    {candidate.exam_score != null ? `${candidate.exam_score}%` : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Notes</TableCell>
                  <TableCell>{candidate.instructor_notes || "—"}</TableCell>
                </TableRow>
                {candidate.disqualification_reason && (
                  <TableRow>
                    <TableCell>Disqualification</TableCell>
                    <TableCell>{candidate.disqualification_reason}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.issues.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      No issues recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.issues.slice(0, 6).map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{issue.title}</TableCell>
                      <TableCell className={statusTone(issue.status)}>{humanize(issue.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <section className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recent_sessions.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No sessions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.recent_sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.date}</TableCell>
                      <TableCell>{s.session_label}</TableCell>
                      <TableCell className={statusTone(s.status)}>
                        {s.status ? humanize(s.status) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.activity_notes ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <section className="mt-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.scores.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No assessments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.scores.map((s) => {
                    const pct = s.score == null || !s.max_score ? null : Math.round((s.score / s.max_score) * 100);
                    return (
                    <TableRow key={s.assessment_id}>
                      <TableCell>{s.title}</TableCell>
                      <TableCell>{humanize(s.type)}</TableCell>
                      <TableCell className={cn("tabular-nums", scoreTone(pct))}>
                        {s.score == null ? "—" : `${s.score} / ${s.max_score}`}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </section>
        </FadeIn>
      )}
      <CertificatePreviewDialog
        candidateId={candidate?.id ?? null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
