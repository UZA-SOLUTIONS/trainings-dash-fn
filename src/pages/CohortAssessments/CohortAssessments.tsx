import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import {
  createAssessment,
  deleteAssessment,
  getAssessment,
  listAssessments,
  saveAssessmentScores,
  updateAssessment,
  type Assessment,
  type AssessmentRosterRow,
  type AssessmentType,
} from "@/services/assessmentService";
import { listModules } from "@/services/moduleService";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { DonutChart } from "@/components/charts/ChartPrimitives";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CANCEL_TEXT, DELETE_TEXT, cn, humanize, PASS_PCT, SAVE_TEXT, scoreOutcome, scoreTone, statusTone } from "@/lib/utils";
import { CELL_SELECT, SheetInput } from "@/components/ui/sheet-input";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";

const RANGES = [
  { label: "90–100%", min: 90, max: 101, bar: "bg-chart-1" },
  { label: "80–89%", min: 80, max: 90, bar: "bg-primary" },
  { label: "70–79%", min: 70, max: 80, bar: "bg-chart-2" },
  { label: "60–69%", min: 60, max: 70, bar: "bg-chart-4" },
  { label: "Below 60%", min: 0, max: 60, bar: "bg-destructive" },
] as const;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pctOf(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

function MiniTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="border border-background/25 bg-primary px-2 py-1.5 text-left font-medium text-primary-foreground"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 ? "bg-muted" : "bg-card"}>
            {row.map((cell, j) => (
              <td key={j} className="border border-border/40 px-2 py-1.5">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CohortAssessments() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("assessments.write");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssessmentType>("quiz");
  const [maxScore, setMaxScore] = useState("100");
  const [date, setDate] = useState(todayIso);
  const [isFinal, setIsFinal] = useState(false);
  const [moduleId, setModuleId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roster, setRoster] = useState<AssessmentRosterRow[]>([]);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<AssessmentType>("quiz");
  const [editDate, setEditDate] = useState(todayIso);
  const [editMaxScore, setEditMaxScore] = useState("100");
  const [editModuleId, setEditModuleId] = useState("");
  const [editIsFinal, setEditIsFinal] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: cohortData } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const { data: assessments = [], isPending: listLoading } = useQuery({
    queryKey: ["assessments", cohortId],
    queryFn: () => listAssessments(cohortId!),
    enabled: Boolean(cohortId),
  });

  const courseId = cohortData?.cohort.course_id;
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: () => listModules({ courseId: courseId! }),
    enabled: Boolean(courseId),
  });

  const { data: selected, isPending: selectedLoading } = useQuery({
    queryKey: ["assessment", selectedId],
    queryFn: () => getAssessment(selectedId!),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (!selected) return;
    setRoster(selected.roster);
    setEditTitle(selected.assessment.title);
    setEditType(selected.assessment.type);
    setEditDate(selected.assessment.date);
    setEditMaxScore(String(selected.assessment.max_score));
    setEditModuleId(selected.assessment.module_id ?? "");
    setEditIsFinal(selected.assessment.is_final);
  }, [selected]);

  useEffect(() => {
    if (selectedId || listLoading || assessments.length === 0) return;
    const latest = [...assessments].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest) setSelectedId(latest.id);
  }, [assessments, selectedId, listLoading]);

  const create = useMutation({
    mutationFn: () =>
      createAssessment(cohortId!, {
        title: title.trim(),
        type,
        max_score: Number(maxScore) || 100,
        date,
        module_id: moduleId || null,
        is_final: type === "exam" ? isFinal : false,
      }),
    onSuccess: (assessment) => {
      toast.success("Assessment created");
      setTitle("");
      setIsFinal(false);
      setModuleId("");
      setCreating(false);
      setSelectedId(assessment.id);
      queryClient.invalidateQueries({ queryKey: ["assessments", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteAssessment(selectedId!),
    onSuccess: () => {
      toast.success("Assessment deleted");
      setPendingDelete(false);
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["assessments", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["report-scores", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMeta = useMutation({
    mutationFn: (patch: Partial<{
      title: string;
      type: AssessmentType;
      max_score: number;
      date: string;
      module_id: string | null;
      is_final: boolean;
    }> = {}) =>
      updateAssessment(selectedId!, {
        title: editTitle.trim(),
        type: editType,
        max_score: Number(editMaxScore) || 100,
        date: editDate,
        module_id: editModuleId || null,
        is_final: editType === "exam" ? editIsFinal : false,
        ...patch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["assessment", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["report-scores", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveScores = useMutation({
    mutationFn: async (rows: AssessmentRosterRow[]) => {
      if (!selectedId) throw new Error("Select an assessment first");
      const payload = rows
        .map((row) => ({
          candidate_id: row.candidate_id,
          score: row.score,
          remarks: row.remarks,
        }))
        .filter((row): row is { candidate_id: string; score: number; remarks: string | null } =>
          row.score != null && Number.isFinite(row.score),
        );
      if (payload.length === 0) return null;
      return saveAssessmentScores(selectedId, payload);
    },
    onSuccess: (data) => {
      if (data) setRoster(data.roster);
      queryClient.invalidateQueries({ queryKey: ["report-scores", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["cohort", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scoreTimer = useRef<number>(0);
  function persistRoster(next: AssessmentRosterRow[]) {
    setRoster(next);
    window.clearTimeout(scoreTimer.current);
    scoreTimer.current = window.setTimeout(() => saveScores.mutate(next), 200);
  }

  function setScore(candidateId: string, value: string) {
    persistRoster(
      roster.map((row) =>
        row.candidate_id === candidateId
          ? { ...row, score: value === "" ? null : Number(value) }
          : row,
      ),
    );
  }

  function setRemarks(candidateId: string, remarks: string) {
    persistRoster(
      roster.map((row) => (row.candidate_id === candidateId ? { ...row, remarks } : row)),
    );
  }

  const selectedAssessment: Assessment | undefined = selected?.assessment;
  const max = selectedAssessment?.max_score ?? 100;
  const scored = roster.filter((row) => row.score != null);
  const percents = scored.map((row) => pctOf(row.score ?? 0, max));
  const avg = percents.length ? Math.round(percents.reduce((a, n) => a + n, 0) / percents.length) : null;
  const top = percents.length ? Math.max(...percents) : null;
  const low = percents.length ? Math.min(...percents) : null;
  const passed = percents.filter((n) => n >= PASS_PCT).length;
  const needs = percents.filter((n) => n < PASS_PCT).length;
  const unmarked = roster.length - scored.length;
  const failLabel =
    selectedAssessment?.is_final || selectedAssessment?.type === "exam" ? "Failed" : "Needs improvement";
  const sortedAssessments = [...assessments].sort((a, b) => b.date.localeCompare(a.date));

  const rangeCounts = useMemo(
    () => RANGES.map((range) => percents.filter((n) => n >= range.min && n < range.max).length),
    [percents],
  );
  const rangeMax = Math.max(...rangeCounts, 1);

  const analysisRows = [...roster].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div>
      <PageTitle
        actions={
          canWrite && !creating ? (
            <button type="button" className={SAVE_TEXT} onClick={() => setCreating(true)}>
              New assessment
            </button>
          ) : undefined
        }
      >
        Marks
      </PageTitle>
      <CohortSummary />

      {canWrite && creating && (
        <Card className="mt-4 space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm">New assessment</h2>
            <button type="button" className={CANCEL_TEXT} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <SheetInput value={title} onChange={setTitle} onSave={() => create.mutate()} pending={create.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AssessmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <SheetInput type="date" value={date} onChange={setDate} onSave={() => create.mutate()} pending={create.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label>Max score</Label>
              <SheetInput type="number" min={1} value={maxScore} onChange={setMaxScore} onSave={() => create.mutate()} pending={create.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
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
            {type === "exam" && (
              <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
                Official final exam
              </label>
            )}
          </div>
        </Card>
      )}

      {listLoading ? (
        <div className="mt-4" aria-busy="true">
          <TableSkeleton rows={6} cols={4} />
        </div>
      ) : assessments.length === 0 && !creating ? (
        <p className="mt-4 text-base text-muted-foreground">No assessments yet.</p>
      ) : selectedId && selectedLoading && !selectedAssessment ? (
        <div className="mt-4" aria-busy="true">
          <TableSkeleton rows={6} cols={4} />
        </div>
      ) : selectedId && selectedAssessment ? (
        <div className="mt-4 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className={cn(CELL_SELECT, "h-10 max-w-md border border-border/40 px-3")}>
                <SelectValue placeholder="Select assessment" />
              </SelectTrigger>
              <SelectContent>
                {sortedAssessments.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                    {item.is_final ? " · final" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canWrite && (
              <button type="button" className={DELETE_TEXT} disabled={remove.isPending} onClick={() => setPendingDelete(true)}>
                Delete
              </button>
            )}
          </div>

          {canWrite && (
            <div className="grid gap-0 overflow-hidden border border-border/40 sm:grid-cols-5">
              <label className="border-b border-border/40 sm:border-r sm:border-b-0">
                <span className="block bg-primary px-2 py-1 text-[10px] tracking-wide text-primary-foreground uppercase">
                  Title
                </span>
                <SheetInput value={editTitle} onChange={setEditTitle} onSave={() => saveMeta.mutate()} pending={saveMeta.isPending} />
              </label>
              <label className="border-b border-border/40 sm:border-r sm:border-b-0">
                <span className="block bg-primary px-2 py-1 text-[10px] tracking-wide text-primary-foreground uppercase">
                  Type
                </span>
                <Select
                  value={editType}
                  onValueChange={(v) => {
                    const next = v as AssessmentType;
                    setEditType(next);
                    saveMeta.mutate({ type: next, is_final: next === "exam" ? editIsFinal : false });
                  }}
                >
                  <SelectTrigger className={CELL_SELECT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="border-b border-border/40 sm:border-r sm:border-b-0">
                <span className="block bg-primary px-2 py-1 text-[10px] tracking-wide text-primary-foreground uppercase">
                  Date
                </span>
                <SheetInput type="date" value={editDate} onChange={setEditDate} onSave={() => saveMeta.mutate()} pending={saveMeta.isPending} />
              </label>
              <label className="border-b border-border/40 sm:border-r sm:border-b-0">
                <span className="block bg-primary px-2 py-1 text-[10px] tracking-wide text-primary-foreground uppercase">
                  Max score
                </span>
                <SheetInput type="number" min={1} value={editMaxScore} onChange={setEditMaxScore} onSave={() => saveMeta.mutate()} pending={saveMeta.isPending} />
              </label>
              <label>
                <span className="block bg-primary px-2 py-1 text-[10px] tracking-wide text-primary-foreground uppercase">
                  Module
                </span>
                <Select
                  value={editModuleId || "none"}
                  onValueChange={(v) => {
                    const next = v === "none" ? "" : v;
                    setEditModuleId(next);
                    saveMeta.mutate({ module_id: next || null });
                  }}
                >
                  <SelectTrigger className={CELL_SELECT}>
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
              </label>
            </div>
          )}

          <section className="border border-border/40 bg-card p-4 sm:p-5">
            <h2 className="text-center text-lg tracking-tight text-primary">
              {selectedAssessment.title} analysis
            </h2>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Max {max} · {humanize(selectedAssessment.type)}
              {selectedAssessment.is_final ? " · final exam" : ""}
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <MiniTable
                headers={["Metric", "Value"]}
                rows={[
                  ["Total candidates", roster.length],
                  ["Scored", `${scored.length} / ${roster.length}`],
                  ["Average %", avg == null ? "—" : <span className={scoreTone(avg)}>{avg}%</span>],
                  ["Highest %", top == null ? "—" : <span className={scoreTone(top)}>{top}%</span>],
                  ["Lowest %", low == null ? "—" : <span className={scoreTone(low)}>{low}%</span>],
                  [
                    "Passed (≥50%)",
                    scored.length ? (
                      <span className={statusTone("completed")}>
                        {passed} ({Math.round((passed / scored.length) * 100)}%)
                      </span>
                    ) : (
                      "—"
                    ),
                  ],
                  [
                    failLabel,
                    scored.length ? (
                      <span className={statusTone("failed")}>
                        {needs} ({Math.round((needs / scored.length) * 100)}%)
                      </span>
                    ) : (
                      "—"
                    ),
                  ],
                ]}
              />
              <MiniTable
                headers={["Score range", "Candidates"]}
                rows={RANGES.map((range, i) => [range.label, rangeCounts[i]])}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-center text-sm text-primary">Score distribution</h3>
                <div className="flex h-44 items-end gap-2 px-2">
                  {RANGES.map((range, i) => (
                    <div key={range.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <span className="text-[11px] tabular-nums text-muted-foreground">{rangeCounts[i]}</span>
                      <div
                        className={cn("w-full min-h-1", range.bar)}
                        style={{ height: `${Math.max(6, (rangeCounts[i] / rangeMax) * 140)}px` }}
                      />
                      <span className="text-center text-[10px] leading-tight text-muted-foreground">{range.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="mb-3 text-center text-sm text-primary">Outcome mix</h3>
                <DonutChart
                  size={160}
                  strokeWidth={16}
                  centerLabel={String(roster.length)}
                  centerSub="class"
                  segments={[
                    { value: passed, color: "var(--primary)", label: "Passed" },
                    { value: needs, color: "var(--destructive)", label: failLabel },
                    { value: unmarked, color: "var(--muted-foreground)", label: "Unmarked" },
                  ]}
                />
                <ul className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 bg-primary" /> Passed {passed}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 bg-destructive" /> {failLabel} {needs}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 bg-muted-foreground" /> Unmarked {unmarked}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-center text-lg tracking-tight text-primary">Score analysis</h2>
            <div className="overflow-auto border border-border/40">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <thead>
                  <tr>
                    {["Student ID", "Name", `Score / ${max}`, "%", "Status", "Remarks"].map((header) => (
                      <th
                        key={header}
                        className="border border-background/25 bg-primary px-2 py-2 text-left font-medium text-primary-foreground"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysisRows.map((row, i) => {
                    const pct = row.score == null ? null : pctOf(row.score, max);
                    const outcome = scoreOutcome(pct, selectedAssessment.is_final || selectedAssessment.type === "exam");
                    return (
                      <tr key={row.candidate_id} className={i % 2 ? "bg-muted" : "bg-card"}>
                        <td className="border border-border/40 px-2 py-0 font-mono">{row.candidate_code}</td>
                        <td className="border border-border/40 px-2 py-0">{row.full_name}</td>
                        <td className={cn("border border-border/40 p-0", scoreTone(pct))}>
                          {canWrite ? (
                            <SheetInput
                              type="number"
                              min={0}
                              max={max}
                              value={row.score == null ? "" : String(row.score)}
                              onChange={(value) => setScore(row.candidate_id, value)}
                              onSave={() => saveScores.mutate(roster)}
                              pending={saveScores.isPending}
                            />
                          ) : (
                            <span className="block px-2 py-1.5 tabular-nums">{row.score ?? "—"}</span>
                          )}
                        </td>
                        <td className={cn("border border-border/40 px-2 py-1.5 tabular-nums", scoreTone(pct))}>
                          {pct == null ? "—" : `${pct}%`}
                        </td>
                        <td className={cn("border border-border/40 px-2 py-1.5", outcome.className)}>
                          {outcome.label}
                        </td>
                        <td className="border border-border/40 p-0">
                          {canWrite ? (
                            <SheetInput
                              value={row.remarks ?? ""}
                              onChange={(remarks) => setRemarks(row.candidate_id, remarks)}
                              onSave={() => saveScores.mutate(roster)}
                              pending={saveScores.isPending}
                            />
                          ) : (
                            <span className="block px-2 py-1.5">{row.remarks || "—"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete}
        onOpenChange={setPendingDelete}
        title="Delete assessment"
        description="Scores for this quiz, test, or exam will be removed. This cannot be undone."
        confirmLabel="Delete assessment"
        pending={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync();
        }}
      />
    </div>
  );
}
