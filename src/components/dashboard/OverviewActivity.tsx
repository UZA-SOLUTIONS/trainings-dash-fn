import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { classroomHref } from "@/components/dashboard/types";
import {
  getAttendanceSession,
  listAttendanceSessions,
  type AttendanceStatus,
} from "@/services/attendanceService";
import { getAssessment, listAssessments } from "@/services/assessmentService";
import { listCohortIssues } from "@/services/issueService";
import { CardGridSkeleton } from "@/components/feedback/Skeleton";
import { cn, LINK_TEXT, scoreTone, statusTone } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatShortDate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OverviewActivity({ cohortId }: { cohortId: string }) {
  const { t, locale, label } = useI18n();
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
    return <CardGridSkeleton cards={3} />;
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
    <div className="mt-4 grid gap-4 xl:grid-cols-3">
      {showAttendance && latestSession && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("overview.lastRoll")}</TableHead>
              <TableHead>{t("common.value")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{t("col.present")}</TableCell>
              <TableCell className={cn("tabular-nums", statusTone("present"))}>
                {attendanceCounts.present}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("overview.session")}</TableCell>
              <TableCell>
                {formatShortDate(latestSession.date, locale)} · {label(latestSession.session_label)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("col.late")}</TableCell>
              <TableCell className={cn("tabular-nums", statusTone("late"))}>
                {attendanceCounts.late}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("col.absent")}</TableCell>
              <TableCell className={cn("tabular-nums", statusTone("absent"))}>
                {attendanceCounts.absent}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("overview.excused")}</TableCell>
              <TableCell className={cn("tabular-nums", statusTone("excused"))}>
                {attendanceCounts.excused}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2} className="p-0">
                <Link
                  to={classroomHref("attendance", cohortId)}
                  className={cn("block px-3 py-2 hover:bg-accent/60", LINK_TEXT)}
                >
                  {t("overview.openAttendance")}
                </Link>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {showMarks && latestAssessment && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("overview.latestMarks")}</TableHead>
              <TableHead>{t("common.value")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{t("col.average")}</TableCell>
              <TableCell
                className={cn(
                  "tabular-nums",
                  scoreTone(
                    latestAssessment.max_score
                      ? Math.round((avg / latestAssessment.max_score) * 100)
                      : null,
                  ),
                )}
              >
                {Math.round(avg)} / {latestAssessment.max_score}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("overview.assessment")}</TableCell>
              <TableCell>{latestAssessment.title}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t("overview.scored")}</TableCell>
              <TableCell className="tabular-nums">
                {t("overview.of", { value: scored.length, total: scores.length })} · {formatShortDate(latestAssessment.date, locale)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={2} className="p-0">
                <Link
                  to={classroomHref("assessments", cohortId)}
                  className={cn("block px-3 py-2 hover:bg-accent/60", LINK_TEXT)}
                >
                  {t("overview.openMarks")}
                </Link>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {showIssues && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("overview.openIssues")}</TableHead>
              <TableHead>{t("common.detail")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{t("overview.needAction")}</TableCell>
              <TableCell className="tabular-nums">{unresolved.length}</TableCell>
            </TableRow>
            {previewIssues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell>
                  <p className="truncate">{issue.title}</p>
                  <p className="truncate text-muted-foreground">
                    {issue.candidate_name ?? issue.candidate_code ?? t("col.candidate")}
                    {issue.status === "in_progress" ? ` · ${t("status.in_progress")}` : ""}
                  </p>
                </TableCell>
                <TableCell className={statusTone(issue.severity)}>{label(issue.severity)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} className="p-0">
                <Link
                  to={classroomHref("issues", cohortId)}
                  className={cn("block px-3 py-2 hover:bg-accent/60", LINK_TEXT)}
                >
                  {t("overview.openIssuesLink")}
                </Link>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}
