import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCandidate } from "@/services/candidateService";
import { Button } from "@/components/ui/button";
import { PageHeaderSkeleton } from "@/components/feedback/Skeleton";

export default function CandidateCertificate() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => getCandidate(candidateId!),
    enabled: Boolean(candidateId),
  });

  const candidate = data?.candidate;
  const cohort = data?.cohort;

  if (isPending) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-3xl" aria-busy="true">
          <PageHeaderSkeleton withMeta />
          <div className="mt-10 rounded-3xl border px-10 py-16">
            <PageHeaderSkeleton withMeta />
          </div>
        </div>
      </div>
    );
  }
  if (isError || !candidate) {
    return (
      <p className="p-10 text-destructive">
        {error instanceof Error ? error.message : "Candidate not found"}
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4; margin: 16mm; } }`}</style>
      <div className="mx-auto flex max-w-3xl justify-end print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <article className="mx-auto mt-8 max-w-3xl rounded-3xl border border-primary/30 bg-card px-10 py-16 text-center print:mt-0 print:border print:shadow-none">
        <p className="text-eyebrow text-muted-foreground">Certificate of completion</p>
        <h1 className="mt-4 font-display text-4xl font-bold">{candidate.full_name}</h1>
        <p className="mt-2 font-mono text-primary">{candidate.candidate_code}</p>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
          has completed {cohort?.course?.name ? <strong>{cohort.course.name}</strong> : "the training programme"}
          {cohort?.name ? <> in {cohort.name}</> : null}.
        </p>
        <dl className="mx-auto mt-10 grid max-w-md gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Dates</dt>
            <dd className="font-medium">
              {cohort?.start_date || cohort?.end_date
                ? `${cohort?.start_date ?? "—"} – ${cohort?.end_date ?? "—"}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Attendance</dt>
            <dd className="font-medium">
              {candidate.attendance_percentage != null ? `${candidate.attendance_percentage}%` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Exam score</dt>
            <dd className="font-medium">
              {candidate.exam_score != null ? `${candidate.exam_score}%` : "—"}
            </dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
