import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ListSkeleton, TableSkeleton } from "@/components/feedback/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { humanize } from "@/lib/utils";

function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
    mutationFn: () =>
      updateAssessment(selectedId!, {
        title: editTitle.trim(),
        type: editType,
        max_score: Number(editMaxScore) || 100,
        date: editDate,
        module_id: editModuleId || null,
        is_final: editType === "exam" ? editIsFinal : false,
      }),
    onSuccess: () => {
      toast.success("Assessment updated");
      queryClient.invalidateQueries({ queryKey: ["assessments", cohortId] });
      queryClient.invalidateQueries({ queryKey: ["assessment", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["report-scores", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveScores = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Select an assessment first");
      const payload = roster
        .map((row) => ({
          candidate_id: row.candidate_id,
          score: row.score,
          remarks: row.remarks,
        }))
        .filter((row): row is { candidate_id: string; score: number; remarks: string | null } =>
          row.score != null && Number.isFinite(row.score),
        );
      if (payload.length === 0) throw new Error("Enter at least one score before saving");
      return saveAssessmentScores(selectedId, payload);
    },
    onSuccess: (data) => {
      setRoster(data.roster);
      toast.success("Scores saved");
      queryClient.invalidateQueries({ queryKey: ["assessment", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["cohort", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setScore(candidateId: string, value: string) {
    setRoster((rows) =>
      rows.map((row) =>
        row.candidate_id === candidateId
          ? { ...row, score: value === "" ? null : Number(value) }
          : row,
      ),
    );
  }

  function setRemarks(candidateId: string, remarks: string) {
    setRoster((rows) =>
      rows.map((row) => (row.candidate_id === candidateId ? { ...row, remarks } : row)),
    );
  }

  const selectedAssessment: Assessment | undefined = selected?.assessment;
  const scoredCount = roster.filter((row) => row.score != null).length;

  return (
    <div>
      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-6">
          {canWrite && (
            creating ? (
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">New assessment</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Max score</Label>
                <Input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
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
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isFinal}
                    onChange={(e) => setIsFinal(e.target.checked)}
                  />
                  Official final exam (updates candidate exam score)
                </label>
              )}
              <Button
                type="button"
                disabled={create.isPending || title.trim().length < 2}
                onClick={() => create.mutate()}
              >
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </Card>
            ) : (
              <Button type="button" variant="outline" onClick={() => setCreating(true)}>
                New assessment
              </Button>
            )
          )}

          <div>
            <h2 className="text-eyebrow text-muted-foreground">Assessments</h2>
            {listLoading ? (
              <div className="mt-3" aria-busy="true">
                <ListSkeleton rows={5} />
              </div>
            ) : assessments.length === 0 ? (
              <p className="mt-3 text-base text-muted-foreground">No assessments yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {assessments.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="secondary">{humanize(item.type)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatShortDate(item.date)} · max {item.max_score}
                      {item.is_final ? " · final exam" : ""}
                      {item.module_id
                        ? ` · ${modules.find((m) => m.id === item.module_id)?.name ?? "module"}`
                        : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {!selectedId ? (
            <p className="text-base text-muted-foreground">Select an assessment to enter scores.</p>
          ) : selectedLoading && !selectedAssessment ? (
            <div aria-busy="true">
              <TableSkeleton rows={6} cols={3} />
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">{selectedAssessment?.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Max {selectedAssessment?.max_score} · {humanize(selectedAssessment?.type ?? "")}
                    {roster.length > 0 ? ` · ${scoredCount} / ${roster.length} scored` : ""}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" disabled={saveScores.isPending} onClick={() => saveScores.mutate()}>
                      {saveScores.isPending ? "Saving…" : "Save scores"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() => setPendingDelete(true)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              {canWrite && (
                <Card className="mb-4 grid gap-4 p-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={editType} onValueChange={(v) => setEditType(v as AssessmentType)}>
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
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max score</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editMaxScore}
                      onChange={(e) => setEditMaxScore(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Module</Label>
                    <Select
                      value={editModuleId || "none"}
                      onValueChange={(v) => setEditModuleId(v === "none" ? "" : v)}
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
                  {editType === "exam" && (
                    <label className="flex items-center gap-2 self-end text-sm">
                      <input
                        type="checkbox"
                        checked={editIsFinal}
                        onChange={(e) => setEditIsFinal(e.target.checked)}
                      />
                      Official final exam
                    </label>
                  )}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saveMeta.isPending || editTitle.trim().length < 2}
                      onClick={() => saveMeta.mutate()}
                    >
                      {saveMeta.isPending ? "Saving…" : "Save assessment"}
                    </Button>
                  </div>
                </Card>
              )}
              <Card className="overflow-hidden border-border/70 shadow-none">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Candidate</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Remarks</TableHead>
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
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={selectedAssessment?.max_score}
                                className="h-9 w-28"
                                value={row.score ?? ""}
                                onChange={(e) => setScore(row.candidate_id, e.target.value)}
                              />
                              <span className="text-sm text-muted-foreground">
                                / {selectedAssessment?.max_score}
                              </span>
                            </div>
                          ) : (
                            row.score != null ? `${row.score} / ${selectedAssessment?.max_score}` : "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {canWrite ? (
                            <Input
                              className="h-9"
                              value={row.remarks ?? ""}
                              onChange={(e) => setRemarks(row.candidate_id, e.target.value)}
                            />
                          ) : (
                            row.remarks || "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
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
            </>
          )}
        </div>
      </section>
    </div>
  );
}
