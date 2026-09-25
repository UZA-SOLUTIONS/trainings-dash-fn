import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import { listModules } from "@/services/moduleService";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSession,
  listAttendanceSessions,
  saveAttendanceRecords,
  updateAttendanceSession,
  type AttendanceSession,
  type AttendanceStatus,
  type SessionLabel,
} from "@/services/attendanceService";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn, CANCEL_TEXT, DELETE_TEXT, SAVE_TEXT } from "@/lib/utils";
import { SheetTextarea } from "@/components/ui/sheet-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CODES: Record<
  AttendanceStatus,
  { letter: string; label: string; swatch: string; text: string; head: string; cell: string }
> = {
  present: {
    letter: "P",
    label: "Present",
    swatch: "bg-primary",
    text: "text-primary",
    head: "bg-primary text-primary-foreground",
    cell: "bg-primary/15",
  },
  late: {
    letter: "T",
    label: "Tardy",
    swatch: "bg-chart-4",
    text: "text-chart-4",
    head: "bg-chart-4 text-volt-foreground",
    cell: "bg-chart-4/20",
  },
  absent: {
    letter: "U",
    label: "Unexcused absence",
    swatch: "bg-destructive",
    text: "text-destructive",
    head: "bg-destructive text-destructive-foreground",
    cell: "bg-destructive/15",
  },
  excused: {
    letter: "E",
    label: "Excused absence",
    swatch: "bg-chart-5",
    text: "text-chart-5",
    head: "bg-chart-5 text-primary-foreground",
    cell: "bg-chart-5/15",
  },
};

const CYCLE: AttendanceStatus[] = ["present", "late", "absent", "excused"];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthParts(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { y, m, last: new Date(y, m, 0).getDate(), prefix: `${y}-${String(m).padStart(2, "0")}` };
}

function shiftMonth(iso: string, delta: number) {
  const [y, m] = iso.split("-").map(Number);
  const next = new Date(y, m - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
}

function isoForDay(prefix: string, day: number) {
  return `${prefix}-${String(day).padStart(2, "0")}`;
}

function nextStatus(current: AttendanceStatus | null): AttendanceStatus {
  if (!current) return "present";
  return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 border border-border/40">
      <div className="bg-primary px-2 py-1 text-center text-[10px] font-medium tracking-[0.14em] text-primary-foreground uppercase">
        {label}
      </div>
      <div className="bg-card px-2 py-1.5 text-center text-sm">{children}</div>
    </div>
  );
}

export default function CohortAttendance() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("attendance.write");
  const today = todayIso();

  const [monthIso, setMonthIso] = useState(`${today.slice(0, 7)}-01`);
  const [date, setDate] = useState(today);
  const [sessionLabel, setSessionLabel] = useState<SessionLabel>("full_day");
  const [activityNotes, setActivityNotes] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [pendingDelete, setPendingDelete] = useState(false);

  const month = monthParts(monthIso);
  const nextMonthStart = shiftMonth(monthIso, 1);

  const { data: cohortData } = useQuery({
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

  const monthSessions = useMemo(
    () =>
      history.filter(
        (s) => s.date.startsWith(month.prefix) && s.session_label === sessionLabel,
      ),
    [history, month.prefix, sessionLabel],
  );

  const sessionQueries = useQueries({
    queries: monthSessions.map((s) => ({
      queryKey: ["attendance-session", s.id],
      queryFn: () => getAttendanceSession(s.id),
    })),
  });

  const sessionByDate = useMemo(() => {
    const map = new Map<string, (typeof monthSessions)[number]>();
    for (const s of monthSessions) map.set(s.date, s);
    return map;
  }, [monthSessions]);

  const selectedSession = sessionByDate.get(date);
  const creating = useRef(new Map<string, Promise<AttendanceSession>>());
  const latest = useRef({
    cohortId,
    sessionLabel,
    sessionByDate,
    date,
    activityNotes,
    moduleId,
  });
  latest.current = { cohortId, sessionLabel, sessionByDate, date, activityNotes, moduleId };

  function cacheSession(
    session: AttendanceSession,
    roster?: Awaited<ReturnType<typeof getAttendanceSession>>,
  ) {
    if (roster) queryClient.setQueryData(["attendance-session", session.id], roster);
    queryClient.setQueryData(["attendance-history", cohortId], (old: AttendanceSession[] = []) =>
      old.some((row) => row.id === session.id) ? old : [...old, session],
    );
  }

  async function sessionFor(iso: string) {
    const current = latest.current;
    const existing = current.sessionByDate.get(iso);
    if (existing) return existing;
    const key = `${iso}:${current.sessionLabel}`;
    let pending = creating.current.get(key);
    if (!pending) {
      pending = createAttendanceSession(current.cohortId!, {
        date: iso,
        session_label: current.sessionLabel,
        activity_notes:
          iso === current.date ? current.activityNotes.trim() || null : null,
        module_id: iso === current.date ? current.moduleId || null : null,
      }).then((session) => {
        cacheSession(session);
        return session;
      });
      creating.current.set(key, pending);
    }
    return pending;
  }

  async function persistMarks(
    iso: string,
    rows: Array<{ candidate_id: string; status: AttendanceStatus }>,
  ) {
    const session = await sessionFor(iso);
    const data = await saveAttendanceRecords(
      session.id,
      rows.map((row) => ({ candidate_id: row.candidate_id, status: row.status })),
    );
    cacheSession(data.session, data);
    return data;
  }

  useEffect(() => {
    if (!date.startsWith(month.prefix)) {
      const fallback = monthIso > today ? today : isoForDay(month.prefix, 1);
      setDate(fallback > today ? today : fallback);
    }
  }, [month.prefix, monthIso, date, today]);

  const selectedSessionData = sessionQueries.find((q) => q.data?.session.id === selectedSession?.id)?.data;

  const hydratedSession = useRef<string | null>(null);
  useEffect(() => {
    const id = selectedSession?.id ?? `blank:${date}`;
    if (selectedSession && !selectedSessionData) return;
    if (hydratedSession.current === id) return;
    hydratedSession.current = id;
    setActivityNotes(selectedSessionData?.session.activity_notes ?? "");
    setModuleId(selectedSessionData?.session.module_id ?? "");
  }, [date, selectedSession?.id, selectedSessionData]);

  const candidates = useMemo(
    () =>
      (cohortData?.candidates ?? [])
        .filter((c) => c.status === "enrolled" || c.status === "graduated")
        .slice()
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [cohortData],
  );

  const marks = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const query of sessionQueries) {
      const session = query.data?.session;
      if (!session) continue;
      for (const row of query.data?.roster ?? []) {
        if (row.status) map[`${row.candidate_id}:${session.date}`] = row.status;
      }
    }
    return { ...map, ...draft };
  }, [sessionQueries, draft]);

  const days = Array.from({ length: month.last }, (_, i) => i + 1);

  function statusAt(candidateId: string, iso: string): AttendanceStatus | null {
    return marks[`${candidateId}:${iso}`] ?? null;
  }

  const saveGen = useRef(new Map<string, number>());

  function persistCell(
    iso: string,
    rows: Array<{ candidate_id: string; status: AttendanceStatus }>,
  ) {
    for (const row of rows) {
      const key = `${row.candidate_id}:${iso}`;
      saveGen.current.set(key, (saveGen.current.get(key) ?? 0) + 1);
    }
    const snapshot = new Map(saveGen.current);
    void persistMarks(iso, rows)
      .then((data) => {
        setDraft((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            const key = `${row.candidate_id}:${data.session.date}`;
            if (saveGen.current.get(key) === snapshot.get(key)) delete next[key];
          }
          return next;
        });
      })
      .catch((e: Error) => toast.error(e.message));
  }

  const notesTimer = useRef<number>(0);
  const saveNotes = useMutation({
    mutationFn: async (payload: { notes: string; moduleId: string }) => {
      const session = await sessionFor(latest.current.date);
      await updateAttendanceSession(session.id, {
        activity_notes: payload.notes.trim() || null,
        module_id: payload.moduleId || null,
      });
      return session.id;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function persistNotes(notes: string, nextModuleId: string) {
    window.clearTimeout(notesTimer.current);
    notesTimer.current = window.setTimeout(() => {
      saveNotes.mutate({ notes, moduleId: nextModuleId });
    }, 250);
  }

  const removeSession = useMutation({
    mutationFn: () => deleteAttendanceSession(selectedSession!.id),
    onSuccess: () => {
      toast.success("Session deleted");
      setPendingDelete(false);
      queryClient.invalidateQueries({ queryKey: ["attendance-history", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohort", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function mark(candidateId: string, iso: string) {
    if (!canWrite || iso > today) return;
    const status = nextStatus(statusAt(candidateId, iso));
    setDraft((prev) => ({ ...prev, [`${candidateId}:${iso}`]: status }));
    persistCell(iso, [{ candidate_id: candidateId, status }]);
  }

  function markColumn(status: AttendanceStatus) {
    if (!canWrite || date > today) return;
    const nextDraft: Record<string, AttendanceStatus> = {};
    for (const c of candidates) nextDraft[`${c.id}:${date}`] = status;
    setDraft((prev) => ({ ...prev, ...nextDraft }));
    persistCell(
      date,
      candidates.map((c) => ({ candidate_id: c.id, status })),
    );
  }

  const instructor =
    cohortData?.cohort.instructors?.find((p) => p.full_name)?.full_name ??
    cohortData?.cohort.instructors?.[0]?.email ??
    "—";
  const gridPending = historyPending;

  return (
    <div>
      <PageTitle>Attendance</PageTitle>
      <CohortSummary />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Cohort">{cohortData?.cohort.name ?? "—"}</Meta>
        <Meta label="Course title">{cohortData?.cohort.course?.name ?? "—"}</Meta>
        <Meta label="Session">
          <Select value={sessionLabel} onValueChange={(v) => setSessionLabel(v as SessionLabel)}>
            <SelectTrigger className="h-8 border-0 bg-transparent px-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_day">Full day</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
            </SelectContent>
          </Select>
        </Meta>
        <Meta label="Key">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-left text-[11px]">
            {CYCLE.map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={cn("inline-block size-2.5", CODES[status].swatch)} />
                <span className={CODES[status].text}>
                  {CODES[status].label} {CODES[status].letter}
                </span>
              </span>
            ))}
          </div>
        </Meta>
        <Meta label="Instructor">{instructor}</Meta>
        <Meta label="Location">{cohortData?.cohort.location || "—"}</Meta>
        <Meta label="Month">
          <div className="flex items-center justify-center gap-3">
            <button type="button" className={CANCEL_TEXT} onClick={() => setMonthIso(shiftMonth(monthIso, -1))}>
              Prev
            </button>
            <span>
              {new Date(month.y, month.m - 1, 1).toLocaleString("en-GB", { month: "short" })}
            </span>
            <button
              type="button"
              className={`${CANCEL_TEXT} disabled:opacity-40`}
              disabled={nextMonthStart > today}
              onClick={() => setMonthIso(nextMonthStart)}
            >
              Next
            </button>
          </div>
        </Meta>
        <Meta label="Year">{month.y}</Meta>
      </div>

      {canWrite && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button type="button" className={SAVE_TEXT} onClick={() => markColumn("present")}>
            Mark {date.slice(8)} present
          </button>
          <button type="button" className={DELETE_TEXT} onClick={() => markColumn("absent")}>
            Mark {date.slice(8)} absent
          </button>
          {selectedSession && (
            <button type="button" className={DELETE_TEXT} onClick={() => setPendingDelete(true)}>
              Delete session
            </button>
          )}
        </div>
      )}

      <div className="mt-4 overflow-auto border border-border/40 bg-card">
        {gridPending ? (
          <div className="p-4">
            <TableSkeleton cols={12} rows={6} />
          </div>
        ) : candidates.length === 0 ? (
          <p className="p-6 text-muted-foreground">No enrolled candidates in this cohort.</p>
        ) : (
          <table className="w-max min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 min-w-[11rem] border border-background/25 bg-primary px-2 py-2 text-left font-medium text-primary-foreground"
                >
                  Student name
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[11rem] z-30 min-w-[6.5rem] border border-background/25 bg-primary px-2 py-2 text-left font-medium text-primary-foreground"
                >
                  Student ID
                </th>
                <th
                  colSpan={days.length}
                  className="border border-background/25 bg-primary px-2 py-1 text-center font-medium tracking-[0.2em] text-primary-foreground"
                >
                  Date
                </th>
                <th
                  colSpan={4}
                  className="border border-background/25 bg-chart-3 px-2 py-1 text-center font-medium tracking-[0.16em] text-primary-foreground"
                >
                  Totals
                </th>
                <th
                  colSpan={4}
                  className="border border-background/25 bg-ink px-2 py-1 text-center font-medium tracking-[0.16em] text-ink-foreground"
                >
                  Percentages
                </th>
              </tr>
              <tr>
                {days.map((day) => {
                  const iso = isoForDay(month.prefix, day);
                  const selected = iso === date;
                  const future = iso > today;
                  return (
                    <th
                      key={day}
                      className={cn(
                        "min-w-8 border border-background/25 px-0 py-1 text-center font-medium",
                        selected
                          ? "bg-volt text-volt-foreground"
                          : "bg-primary text-primary-foreground",
                        !future && "cursor-pointer",
                      )}
                    >
                      <button
                        type="button"
                        disabled={future}
                        className="h-7 w-8 disabled:cursor-not-allowed disabled:opacity-30"
                        onClick={() => setDate(iso)}
                      >
                        {day}
                      </button>
                    </th>
                  );
                })}
                {CYCLE.map((status) => (
                  <th
                    key={`t-${status}`}
                    className={cn(
                      "min-w-9 border border-background/25 px-1 py-1 text-center font-medium",
                      CODES[status].head,
                    )}
                  >
                    {CODES[status].letter}
                  </th>
                ))}
                {CYCLE.map((status) => (
                  <th
                    key={`p-${status}`}
                    className={cn(
                      "min-w-10 border border-background/25 px-1 py-1 text-center font-medium",
                      CODES[status].head,
                    )}
                  >
                    {CODES[status].letter}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, index) => {
                const counts = { present: 0, late: 0, absent: 0, excused: 0 };
                for (const day of days) {
                  const status = statusAt(c.id, isoForDay(month.prefix, day));
                  if (status) counts[status] += 1;
                }
                const marked = counts.present + counts.late + counts.absent + counts.excused;
                const pct = (n: number) => (marked === 0 ? "0%" : `${Math.round((n / marked) * 100)}%`);
                const stripe = index % 2 ? "bg-muted" : "bg-card";
                return (
                  <tr key={c.id}>
                    <td className={cn("sticky left-0 z-20 border border-border/40 px-2 py-1.5", stripe)}>
                      {c.full_name}
                    </td>
                    <td
                      className={cn(
                        "sticky left-[11rem] z-20 border border-border/40 px-2 py-1.5 font-mono",
                        stripe,
                      )}
                    >
                      {c.candidate_code}
                    </td>
                    {days.map((day) => {
                      const iso = isoForDay(month.prefix, day);
                      const status = statusAt(c.id, iso);
                      const future = iso > today;
                      const selected = iso === date;
                      const code = status ? CODES[status] : null;
                      return (
                        <td
                          key={day}
                          className={cn(
                            "border border-border/40 p-0 text-center",
                            code?.cell
                              ?? (selected ? "bg-accent" : day % 2 === 0 ? "bg-muted" : "bg-card"),
                          )}
                        >
                          <button
                            type="button"
                            disabled={!canWrite || future}
                            onClick={() => mark(c.id, iso)}
                            className={cn(
                              "h-8 w-8 text-xs font-semibold disabled:cursor-default",
                              code?.text,
                            )}
                            title={
                              future
                                ? "Future date"
                                : code
                                  ? `${code.label} — click to change`
                                  : "Click to mark"
                            }
                          >
                            {code?.letter ?? ""}
                          </button>
                        </td>
                      );
                    })}
                    {CYCLE.map((status) => (
                      <td
                        key={`c-${status}`}
                        className={cn(
                          "border border-border/40 px-1 py-1 text-center tabular-nums",
                          CODES[status].cell,
                        )}
                      >
                        {counts[status]}
                      </td>
                    ))}
                    {CYCLE.map((status) => (
                      <td
                        key={`pc-${status}`}
                        className={cn(
                          "border border-border/40 px-1 py-1 text-center tabular-nums",
                          CODES[status].cell,
                        )}
                      >
                        {pct(counts[status])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {canWrite && (
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_14rem]">
          <div>
            <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">
              Daily notes · {date}
            </p>
            <SheetTextarea
              value={activityNotes}
              onChange={(value) => {
                setActivityNotes(value);
                persistNotes(value, moduleId);
              }}
              onSave={(value) => saveNotes.mutate({ notes: value, moduleId })}
              pending={saveNotes.isPending}
              placeholder="What was taught or done this day"
            />
          </div>
          <div>
            <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">Module</p>
            <Select
              value={moduleId || "none"}
              onValueChange={(v) => {
                const next = v === "none" ? "" : v;
                setModuleId(next);
                saveNotes.mutate({ notes: activityNotes, moduleId: next });
              }}
            >
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
      )}

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
