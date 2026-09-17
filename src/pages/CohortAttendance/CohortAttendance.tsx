import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { listModules } from "@/services/moduleService";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSession,
  listAttendanceSessions,
  saveAttendanceRecords,
  updateAttendanceSession,
  type AttendanceRosterRow,
  type AttendanceStatus,
  type SessionLabel,
} from "@/services/attendanceService";
import { CohortClassroomHeader } from "@/components/classroom/CohortClassroomHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUSES: AttendanceStatus[] = ["present", "late", "absent", "excused"];

function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function daysInMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const pad = new Date(y, m - 1, 1).getDay();
  return { y, m, last, pad };
}

export default function CohortAttendance() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("attendance.write");

  const [date, setDate] = useState(todayIso);
  const [sessionLabel, setSessionLabel] = useState<SessionLabel>("full_day");
  const [activityNotes, setActivityNotes] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roster, setRoster] = useState<AttendanceRosterRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState(false);

  const { data: cohortData, isPending: cohortLoading } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const courseId = cohortData?.cohort.course_id;
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: () => listModules({ courseId: courseId! }),
    enabled: Boolean(courseId),
  });

  const { data: history = [], isPending: historyPending } = useQuery({
    queryKey: ["attendance-history", cohortId],
    queryFn: () => listAttendanceSessions(cohortId!),
    enabled: Boolean(cohortId),
  });

  const existing = history.find((s) => s.date === date && s.session_label === sessionLabel);
  const existingId = existing?.id ?? null;

  const { data: sessionData, isPending: sessionLoading } = useQuery({
    queryKey: ["attendance-session", existingId],
    queryFn: () => getAttendanceSession(existingId!),
    enabled: Boolean(existingId),
  });

  useEffect(() => {
    if (sessionData) {
      setSessionId(sessionData.session.id);
      setActivityNotes(sessionData.session.activity_notes ?? "");
      setModuleId(sessionData.session.module_id ?? "");
      setRoster(sessionData.roster);
      return;
    }
    if (!existingId && cohortData) {
      setSessionId(null);
      setActivityNotes("");
      setModuleId("");
      setRoster(
        cohortData.candidates
          .filter((c) => c.status === "enrolled" || c.status === "graduated")
          .map((c) => ({
            candidate_id: c.id,
            candidate_code: c.candidate_code,
            full_name: c.full_name,
            status: null,
            note: null,
          })),
      );
    }
  }, [sessionData, existingId, cohortData]);

  const markedCount = useMemo(() => roster.filter((row) => row.status).length, [roster]);
  const sessionDates = useMemo(() => new Set(history.map((s) => s.date)), [history]);
  const calendar = daysInMonth(date);

  const save = useMutation({
    mutationFn: async () => {
      const marked = roster.filter((row) => row.status);
      if (marked.length === 0) throw new Error("Mark at least one candidate before saving");
      let id = sessionId;
      const payload = {
        date,
        session_label: sessionLabel,
        activity_notes: activityNotes.trim() || null,
        module_id: moduleId || null,
      };
      if (!id) {
        const session = await createAttendanceSession(cohortId!, payload);
        id = session.id;
        setSessionId(id);
      } else {
        await updateAttendanceSession(id, {
          activity_notes: payload.activity_notes,
          module_id: payload.module_id,
        });
      }
      return saveAttendanceRecords(
        id,
        marked.map((row) => ({
          candidate_id: row.candidate_id,
          status: row.status as AttendanceStatus,
          note: row.note,
        })),
      );
    },
    onSuccess: (data) => {
      setRoster(data.roster);
      setSessionId(data.session.id);
      toast.success("Attendance saved");
      queryClient.invalidateQueries({ queryKey: ["attendance-history", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["attendance-session", data.session.id] });
      queryClient.invalidateQueries({ queryKey: ["cohort", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSession = useMutation({
    mutationFn: () => deleteAttendanceSession(sessionId!),
    onSuccess: () => {
      toast.success("Session deleted");
      setPendingDelete(false);
      setSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["attendance-history", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohort", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setStatus(candidateId: string, status: AttendanceStatus) {
    setRoster((rows) =>
      rows.map((row) => (row.candidate_id === candidateId ? { ...row, status } : row)),
    );
  }

  function setNote(candidateId: string, note: string) {
    setRoster((rows) =>
      rows.map((row) => (row.candidate_id === candidateId ? { ...row, note } : row)),
    );
  }

  function markAll(status: AttendanceStatus) {
    setRoster((rows) => rows.map((row) => ({ ...row, status })));
  }

  const rollPending = Boolean(existingId) && sessionLoading;

  return (
    <div>
      <CohortClassroomHeader cohort={cohortData?.cohort} loading={cohortLoading} />

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="space-y-6">
          <Card className="p-4">
            <p className="text-sm font-medium">Calendar</p>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <span key={d}>{d}</span>
              ))}
              {Array.from({ length: calendar.pad }).map((_, i) => (
                <span key={`p${i}`} />
              ))}
              {Array.from({ length: calendar.last }).map((_, i) => {
                const day = String(i + 1).padStart(2, "0");
                const iso = `${calendar.y}-${String(calendar.m).padStart(2, "0")}-${day}`;
                const has = sessionDates.has(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setDate(iso)}
                    className={cn(
                      "rounded-md py-1",
                      iso === date && "bg-primary text-primary-foreground",
                      iso !== date && has && "bg-primary/15 text-primary",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium">Session history</p>
            {historyPending && <TableSkeleton rows={4} cols={2} />}
            {!historyPending && history.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No sessions yet.</p>
            )}
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm">
              {history.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left hover:bg-muted",
                      s.id === sessionId && "bg-muted font-medium",
                    )}
                    onClick={() => {
                      setDate(s.date);
                      setSessionLabel(s.session_label);
                    }}
                  >
                    {s.date} · {s.session_label.replace("_", " ")}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Session</Label>
              <Select value={sessionLabel} onValueChange={(v) => setSessionLabel(v as SessionLabel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full day</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module taught</Label>
              <Select value={moduleId || "none"} onValueChange={(v) => setModuleId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Daily activity notes</Label>
            <Textarea
              value={activityNotes}
              onChange={(e) => setActivityNotes(e.target.value)}
              placeholder="What was taught or done today"
              disabled={!canWrite}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => markAll("present")}>
                  Mark all present
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => markAll("absent")}>
                  Mark all absent
                </Button>
                <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? "Saving…" : "Save attendance"}
                </Button>
                {sessionId && (
                  <Button type="button" variant="outline" className="text-destructive" onClick={() => setPendingDelete(true)}>
                    Delete session
                  </Button>
                )}
              </>
            )}
            <p className="text-sm text-muted-foreground">
              {markedCount}/{roster.length} marked
            </p>
          </div>

          {rollPending ? (
            <TableSkeleton cols={3} />
          ) : roster.length === 0 ? (
            <p className="text-base text-muted-foreground">No enrolled candidates in this cohort.</p>
          ) : (
            <Card className="overflow-hidden border-border/70 shadow-none">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((row) => (
                    <TableRow key={row.candidate_id}>
                      <TableCell>
                        <p className="font-medium">{row.full_name}</p>
                        <p className="mt-0.5 font-mono text-sm text-primary">{row.candidate_code}</p>
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Select
                            value={row.status ?? undefined}
                            onValueChange={(v) => setStatus(row.candidate_id, v as AttendanceStatus)}
                          >
                            <SelectTrigger className="h-9 w-[140px]">
                              <SelectValue placeholder="Mark" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">{row.status ?? "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Input
                            value={row.note ?? ""}
                            onChange={(e) => setNote(row.candidate_id, e.target.value)}
                            className="h-9"
                          />
                        ) : (
                          <span className="text-muted-foreground">{row.note || "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete}
        onOpenChange={setPendingDelete}
        title="Delete attendance session"
        description="This removes the roll for this date and session."
        confirmLabel="Delete session"
        pending={removeSession.isPending}
        onConfirm={async () => {
          await removeSession.mutateAsync();
        }}
      />
    </div>
  );
}
