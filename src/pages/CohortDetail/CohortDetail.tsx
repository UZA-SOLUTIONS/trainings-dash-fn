import { Fragment, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import {
  bulkCreateCandidates,
  deleteCandidate,
  isSchoolOwned,
  updateCandidate,
  type Candidate,
} from "@/services/candidateService";
import { CohortClassroomHeader } from "@/components/classroom/CohortClassroomHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { TableSkeleton } from "@/components/feedback/Skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const STATUSES = ["enrolled", "waitlisted", "rejected", "withdrawn", "graduated"] as const;
const TRAINING = ["not_started", "in_progress", "completed", "failed"] as const;

type BulkRow = { full_name: string; national_id: string; phone: string };

function emptyRows(): BulkRow[] {
  return [
    { full_name: "", national_id: "", phone: "" },
    { full_name: "", national_id: "", phone: "" },
    { full_name: "", national_id: "", phone: "" },
  ];
}

export default function CohortDetail() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(emptyRows);
  const [pendingDelete, setPendingDelete] = useState<Candidate | null>(null);
  const [rejecting, setRejecting] = useState<Candidate | null>(null);
  const { can, isInstructor } = useAuth();
  const canMembership = can("candidates.membership");
  const canTraining = can("candidates.training");
  const canDelete = can("candidates.delete");

  const { data, isPending } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["cohort", cohortId] });
    queryClient.invalidateQueries({ queryKey: ["manage-overview"] });
  }

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      await updateCandidate(id, patch);
    },
    onSuccess: () => {
      toast.success("Candidate updated");
      setRejecting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      toast.success("Candidate deleted");
      setPendingDelete(null);
      setOpenId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: () =>
      bulkCreateCandidates(
        cohortId!,
        bulkRows.filter((r) => r.full_name.trim() && r.national_id.trim() && r.phone.trim()),
      ),
    onSuccess: (result) => {
      toast.success(`${result.created.length} added${result.errors.length ? `, ${result.errors.length} failed` : ""}`);
      if (result.errors.length) {
        result.errors.forEach((err) => toast.error(`Row ${err.index + 1}: ${err.message}`));
      }
      setBulkRows(emptyRows());
      setBulkOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cohort = data?.cohort;
  const candidates = (data?.candidates ?? []) as Candidate[];
  const enrolled = candidates.filter((c) => c.status === "enrolled" || c.status === "graduated");
  const waiting = candidates.filter((c) => c.status === "waitlisted");
  const inactive = candidates.filter((c) => c.status === "rejected" || c.status === "withdrawn");

  function handleStatusChange(c: Candidate, value: string) {
    if (value === "rejected" && isInstructor) {
      setRejecting(c);
      return;
    }
    update.mutate({ id: c.id, patch: { status: value } });
  }

  function CandidateTable({ rows, empty }: { rows: Candidate[]; empty: string }) {
    if (rows.length === 0) return <p className="text-base text-muted-foreground">{empty}</p>;
    return (
      <Card className="overflow-hidden border-border/70 shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Candidate</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Training</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const open = openId === c.id;
              return (
                <Fragment key={c.id}>
                  <TableRow>
                    <TableCell>
                      <Link to={`/candidates/${c.id}`} className="font-medium hover:underline">
                        {c.full_name}
                      </Link>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-primary">
                        {c.candidate_code}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "enrolled" ? "default" : "secondary"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.training_status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canMembership && (
                          <Select value={c.status} onValueChange={(v) => handleStatusChange(c, v)}>
                            <SelectTrigger className="h-9 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {canDelete && isSchoolOwned(c) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setPendingDelete(c)}
                          >
                            Delete
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setOpenId(open ? null : c.id)}>
                          {open ? "Hide" : "Details"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="bg-muted/20 p-5">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <h3 className="text-eyebrow text-muted-foreground">Identity</h3>
                            {!isSchoolOwned(c) && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                UZA provided this person. Identity cannot be edited here.
                              </p>
                            )}
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">National ID</Label>
                                <Input
                                  defaultValue={c.national_id}
                                  disabled={!isSchoolOwned(c)}
                                  onBlur={(e) =>
                                    isSchoolOwned(c) &&
                                    update.mutate({ id: c.id, patch: { national_id: e.target.value } })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Email</Label>
                                <Input
                                  defaultValue={c.email ?? ""}
                                  disabled={!isSchoolOwned(c)}
                                  onBlur={(e) =>
                                    isSchoolOwned(c) &&
                                    update.mutate({ id: c.id, patch: { email: e.target.value || null } })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Date of birth</Label>
                                <Input
                                  type="date"
                                  defaultValue={c.date_of_birth ?? ""}
                                  disabled={!isSchoolOwned(c)}
                                  onBlur={(e) =>
                                    isSchoolOwned(c) &&
                                    update.mutate({
                                      id: c.id,
                                      patch: { date_of_birth: e.target.value || null },
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">District</Label>
                                <Input
                                  defaultValue={c.district ?? ""}
                                  disabled={!isSchoolOwned(c)}
                                  onBlur={(e) =>
                                    isSchoolOwned(c) &&
                                    update.mutate({ id: c.id, patch: { district: e.target.value || null } })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-eyebrow text-muted-foreground">Training</h3>
                            <div className="mt-3 space-y-3">
                              {canTraining ? (
                                <>
                                  <Select
                                    value={c.training_status}
                                    onValueChange={(v) =>
                                      update.mutate({ id: c.id, patch: { training_status: v } })
                                    }
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {TRAINING.map((s) => (
                                        <SelectItem key={s} value={s}>
                                          {s}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {c.status === "graduated" && (
                                    <Button asChild variant="outline" size="sm">
                                      <Link to={`/candidates/${c.id}/certificate`}>Print certificate</Link>
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p className="text-sm">Attendance: {c.attendance_percentage ?? "—"}%</p>
                                  <p className="text-sm">Exam: {c.exam_score ?? "—"}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <div>
      <CohortClassroomHeader cohort={cohort} loading={isPending} />
      <div className="mt-6">
        {isPending && <TableSkeleton />}
        {cohort && (
          <>
            {canMembership && (
              <div className="mb-6">
                <Button type="button" variant="outline" onClick={() => setBulkOpen((v) => !v)}>
                  {bulkOpen ? "Close bulk add" : "Bulk add candidates"}
                </Button>
                {bulkOpen && (
                  <Card className="mt-4 space-y-3 p-5">
                    {bulkRows.map((row, index) => (
                      <div key={index} className="grid gap-3 md:grid-cols-3">
                        <Input
                          placeholder="Full name"
                          value={row.full_name}
                          onChange={(e) => {
                            const next = [...bulkRows];
                            next[index] = { ...row, full_name: e.target.value };
                            setBulkRows(next);
                          }}
                        />
                        <Input
                          placeholder="National ID"
                          value={row.national_id}
                          onChange={(e) => {
                            const next = [...bulkRows];
                            next[index] = { ...row, national_id: e.target.value };
                            setBulkRows(next);
                          }}
                        />
                        <Input
                          placeholder="Phone"
                          value={row.phone}
                          onChange={(e) => {
                            const next = [...bulkRows];
                            next[index] = { ...row, phone: e.target.value };
                            setBulkRows(next);
                          }}
                        />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setBulkRows([...bulkRows, { full_name: "", national_id: "", phone: "" }])}>
                        Add row
                      </Button>
                      <Button type="button" disabled={bulk.isPending} onClick={() => bulk.mutate()}>
                        {bulk.isPending ? "Adding…" : "Save rows"}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}
            <Section title={`Enrolled (${enrolled.length})`}>
              <CandidateTable rows={enrolled} empty="No candidates enrolled yet." />
            </Section>
            <Section title={`Waiting list (${waiting.length})`}>
              <CandidateTable rows={waiting} empty="Nobody is waiting for a seat." />
            </Section>
            {inactive.length > 0 && (
              <Section title={`Rejected / withdrawn (${inactive.length})`}>
                <CandidateTable rows={inactive} empty="" />
              </Section>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete candidate"
        description={pendingDelete ? `Delete “${pendingDelete.full_name}”? Related attendance, scores, and issues will be removed.` : ""}
        confirmLabel="Delete candidate"
        pending={remove.isPending}
        onConfirm={async () => {
          if (pendingDelete) await remove.mutateAsync(pendingDelete.id);
        }}
      />
      <ReasonDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
        title="Disqualify candidate"
        description="A reason is required to reject this candidate."
        confirmLabel="Reject"
        pending={update.isPending}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          await update.mutateAsync({
            id: rejecting.id,
            patch: { status: "rejected", disqualification_reason: reason },
          });
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-eyebrow text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
