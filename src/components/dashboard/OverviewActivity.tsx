import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { classroomHref } from "@/components/dashboard/types";
import {
  getAttendanceSession,
  listAttendanceSessions,
  type AttendanceStatus,
} from "@/services/attendanceService";
import { getAssessment, listAssessments } from "@/services/assessmentService";
import { listCohortIssues, type IssueSeverity } from "@/services/issueService";
import { humanize } from "@/lib/utils";

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function severityBadge(severity: IssueSeverity) {
  if (severity === "high") return <Badge variant="destructive">{humanize(severity)}</Badge>;
  if (severity === "medium") return <Badge>{humanize(severity)}</Badge>;
  return <Badge variant="secondary">{humanize(severity)}</Badge>;
}

export function OverviewActivity({ cohortId }: { cohortId: string }) {
  const sessionsQuery = useQuery({
    queryKey: ["attendance-history", cohortId],
    queryFn: () => listAttendanceSessions(cohortId),
  });
  const assessmentsQuery = useQuery({
    queryKey: ["assessments", cohortId],
    queryFn: () => listAssessments(cohortId),
  });
  const issuesQuery = useQuery({
    queryKey: ["issues", cohortId, "all"],
    queryFn: () => listCohortIssues(cohortId),
  });

  const latestSession = sessionsQuery.data?.[0] ?? null;
  const latestAssessment = assessmentsQuery.data?.[0] ?? null;

  const sessionDetail = useQuery({
    queryKey: ["attendance-session", latestSession?.id],
    queryFn: () => getAttendanceSession(latestSession!.id),
    enabled: Boolean(latestSession?.id),
  });
  const assessmentDetail = useQuery({
    queryKey: ["assessment", latestAssessment?.id],
    queryFn: () => getAssessment(latestAssessment!.id),
    enabled: Boolean(latestAssessment?.id),
  });

  if (sessionsQuery.isPending || assessmentsQuery.isPending || issuesQuery.isPending) {
    return null;
  }

  const roster = sessionDetail.data?.roster ?? [];
  const marked = roster.filter((row) => row.status);
  const attendanceCounts = marked.reduce(
    (acc, row) => {
      acc[row.status!] += 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0, excused: 0 } as Record<AttendanceStatus, number>,
  );
  const showAttendance =
    Boolean(latestSession) && !sessionDetail.isPending && marked.length > 0;

  const scores = assessmentDetail.data?.roster ?? [];
  const scored = scores.filter((row) => row.score != null);
  const avg =
    scored.length > 0
      ? scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length
      : 0;
  const showMarks =
    Boolean(latestAssessment) && !assessmentDetail.isPending && scored.length > 0;

  const unresolved = (issuesQuery.data ?? []).filter((issue) => issue.status !== "resolved");
  const showIssues = unresolved.length > 0;
  const previewIssues = unresolved.slice(0, 4);

  if (!showAttendance && !showMarks && !showIssues) return null;

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {showAttendance && latestSession && (
        <Card className="flex h-full min-w-0 flex-col p-5">
          <p className="text-sm text-muted-foreground">Last roll call</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {attendanceCounts.present}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            present · {formatShortDate(latestSession.date)} · {humanize(latestSession.session_label)}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {attendanceCounts.late} late · {attendanceCounts.absent} absent · {attendanceCounts.excused}{" "}
            excused
          </p>
          <Link
            to={classroomHref("attendance", cohortId)}
            className="mt-auto pt-4 text-sm font-medium text-primary hover:underline"
          >
            Open attendance
          </Link>
        </Card>
      )}

      {showMarks && latestAssessment && (
        <Card className="flex h-full min-w-0 flex-col p-5">
          <p className="text-sm text-muted-foreground">Latest marks</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {Math.round(avg)}
            <span className="text-xl font-semibold text-muted-foreground">
              {" "}
              / {latestAssessment.max_score}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            average · {latestAssessment.title}
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            {scored.length} of {scores.length} scored · {formatShortDate(latestAssessment.date)}
          </p>
          <Link
            to={classroomHref("assessments", cohortId)}
            className="mt-auto pt-4 text-sm font-medium text-primary hover:underline"
          >
            Open marks
          </Link>
        </Card>
      )}

      {showIssues && (
        <Card className="flex h-full min-w-0 flex-col p-5 md:col-span-2 xl:col-span-1">
          <p className="text-sm text-muted-foreground">Open issues</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{unresolved.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">need action</p>
          <ul className="mt-4 space-y-3">
            {previewIssues.map((issue) => (
              <li key={issue.id} className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{issue.title}</p>
                  {severityBadge(issue.severity)}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {issue.candidate_name ?? issue.candidate_code ?? "Candidate"}
                  {issue.status === "in_progress" ? " · In progress" : ""}
                </p>
              </li>
            ))}
          </ul>
          <Link
            to={classroomHref("issues", cohortId)}
            className="mt-auto pt-4 text-sm font-medium text-primary hover:underline"
          >
            Open issues
          </Link>
        </Card>
      )}
    </div>
  );
}
