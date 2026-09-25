import { useState } from "react";
import { useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import {
  downloadAttendanceCsv,
  downloadIssuesCsv,
  downloadScoresCsv,
  getAttendanceReport,
  getIssuesReport,
  getScoresReport,
} from "@/services/reportService";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, humanize, LINK_TEXT, scoreTone, statusTone } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function CohortReports() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const { can } = useAuth();
  const canRead = can("reports.read");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: cohortData } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const attendanceQuery = useQuery({
    queryKey: ["report-attendance", cohortId, from, to],
    queryFn: () =>
      getAttendanceReport(cohortId!, {
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: Boolean(cohortId) && canRead,
    placeholderData: keepPreviousData,
  });

  const scoresQuery = useQuery({
    queryKey: ["report-scores", cohortId],
    queryFn: () => getScoresReport(cohortId!),
    enabled: Boolean(cohortId) && canRead,
  });

  const issuesQuery = useQuery({
    queryKey: ["report-issues", cohortId],
    queryFn: () => getIssuesReport(cohortId!),
    enabled: Boolean(cohortId) && canRead,
  });

  async function download(kind: "attendance" | "scores" | "issues") {
    if (!cohortId || !cohortData?.cohort) return;
    const code = cohortData.cohort.code;
    setDownloading(kind);
    try {
      if (kind === "attendance") {
        await downloadAttendanceCsv(cohortId, `attendance-${code}.csv`, {
          from: from || undefined,
          to: to || undefined,
        });
      } else if (kind === "scores") {
        await downloadScoresCsv(cohortId, `scores-${code}.csv`);
      } else {
        await downloadIssuesCsv(cohortId, `issues-${code}.csv`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  const attendance = attendanceQuery.data;
  const scores = scoresQuery.data;
  const issues = issuesQuery.data;
  const dateHeaders = attendance?.sessions.map((s) =>
    s.session_label === "full_day" ? s.date : `${s.date} ${s.session_label}`,
  ) ?? [];

  return (
    <div>
      <PageTitle>Reports</PageTitle>
      <CohortSummary />
      <section className="space-y-6">
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-normal">Attendance sheet</h2>
              <p className="text-sm text-muted-foreground">Daily roll call by candidate</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <button
                type="button"
                className={LINK_TEXT}
                disabled={downloading === "attendance"}
                onClick={() => download("attendance")}
              >
                {downloading === "attendance" ? "Downloading…" : "Download CSV"}
              </button>
            </div>
          </div>
          {attendanceQuery.isPending ? (
            <TableSkeleton cols={5} rows={5} />
          ) : !attendance || attendance.sessions.length === 0 ? (
            <p className="text-muted-foreground">No attendance records in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>%</TableHead>
                    {dateHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.rows.map((row) => (
                    <TableRow key={row.candidate_id}>
                      <TableCell>
                        <p>{row.full_name}</p>
                        <p className="font-mono text-sm text-primary">{row.candidate_code}</p>
                      </TableCell>
                      <TableCell className={statusTone("present")}>{row.present}</TableCell>
                      <TableCell className={statusTone("late")}>{row.late}</TableCell>
                      <TableCell className={statusTone("absent")}>{row.absent}</TableCell>
                      <TableCell className={cn("tabular-nums", scoreTone(row.attendance_percentage))}>
                        {row.attendance_percentage == null ? "—" : `${row.attendance_percentage}%`}
                      </TableCell>
                      {dateHeaders.map((header) => (
                        <TableCell key={header} className={cn("capitalize", statusTone(row.by_date[header]))}>
                          {row.by_date[header] ? humanize(row.by_date[header]) : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-normal">Score sheet</h2>
              <p className="text-sm text-muted-foreground">Quiz, test, and exam marks</p>
            </div>
            <button
              type="button"
              className={LINK_TEXT}
              disabled={downloading === "scores"}
              onClick={() => download("scores")}
            >
              {downloading === "scores" ? "Downloading…" : "Download CSV"}
            </button>
          </div>
          {scoresQuery.isPending ? (
            <TableSkeleton cols={4} rows={5} />
          ) : !scores || scores.assessments.length === 0 ? (
            <p className="text-muted-foreground">No assessments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Exam %</TableHead>
                    {scores.assessments.map((item) => (
                      <TableHead key={item.id}>
                        {item.title}
                        <span className="block text-xs font-normal text-muted-foreground">
                          /{item.max_score}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.rows.map((row) => (
                    <TableRow key={row.candidate_id}>
                      <TableCell>
                        <p>{row.full_name}</p>
                        <p className="font-mono text-sm text-primary">{row.candidate_code}</p>
                      </TableCell>
                      <TableCell className={cn("tabular-nums", scoreTone(row.exam_score))}>
                        {row.exam_score == null ? "—" : `${row.exam_score}%`}
                      </TableCell>
                      {scores.assessments.map((item) => {
                        const score = row.scores[item.id];
                        const pct =
                          score == null || !item.max_score ? null : Math.round((score / item.max_score) * 100);
                        return (
                          <TableCell key={item.id} className={cn("tabular-nums", scoreTone(pct))}>
                            {score ?? "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-normal">Issue log</h2>
              <p className="text-sm text-muted-foreground">Problems reported for candidates</p>
            </div>
            <button
              type="button"
              className={LINK_TEXT}
              disabled={downloading === "issues"}
              onClick={() => download("issues")}
            >
              {downloading === "issues" ? "Downloading…" : "Download CSV"}
            </button>
          </div>
          {issuesQuery.isPending ? (
            <TableSkeleton cols={3} rows={5} />
          ) : !issues || issues.issues.length === 0 ? (
            <p className="text-muted-foreground">No issues reported.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <p>{issue.candidate_name}</p>
                      <p className="font-mono text-sm text-primary">{issue.candidate_code}</p>
                    </TableCell>
                    <TableCell>
                      <p>{issue.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {humanize(issue.category)} ·{" "}
                        <span className={statusTone(issue.severity)}>{humanize(issue.severity)}</span>
                      </p>
                    </TableCell>
                    <TableCell className={statusTone(issue.status)}>{humanize(issue.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
