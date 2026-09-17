import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCandidate,
  deleteCandidate,
  isSchoolOwned,
  updateCandidate,
  type Candidate,
  type CandidateStatus,
  type TrainingStatus,
} from "@/services/candidateService";
import type { Cohort } from "@/services/cohortService";
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
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STATUSES: CandidateStatus[] = ["enrolled", "waitlisted", "rejected", "withdrawn", "graduated"];
const TRAINING: TrainingStatus[] = ["not_started", "in_progress", "completed", "failed"];

const BLANK = {
  full_name: "",
  national_id: "",
  phone: "",
  email: "",
  date_of_birth: "",
  gender: "",
  district: "",
};

export function CandidatesPanel({
  cohorts,
  candidates,
}: {
  cohorts: Cohort[];
  candidates: Candidate[];
}) {
  const queryClient = useQueryClient();
  const { can, isInstructor } = useAuth();
  const canMembership = can("candidates.membership");
  const canTraining = can("candidates.training");
  const canDelete = can("candidates.delete");
  const canWrite = canMembership;

  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const [pendingDelete, setPendingDelete] = useState<Candidate | null>(null);
  const [rejecting, setRejecting] = useState<Candidate | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (cohortFilter !== "all" && c.cohort_id !== cohortFilter) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.candidate_code.toLowerCase().includes(q) ||
        c.national_id.toLowerCase().includes(q)
      );
    });
  }, [candidates, cohortFilter, search]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["manage-overview"] });
    queryClient.invalidateQueries({ queryKey: ["cohort"] });
    queryClient.invalidateQueries({ queryKey: ["candidate"] });
  }

  const create = useMutation({
    mutationFn: () =>
      createCandidate({
        cohort_id: cohortId,
        full_name: form.full_name.trim(),
        national_id: form.national_id.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        district: form.district.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Candidate added");
      setForm(BLANK);
      setAdding(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      updateCandidate(id, patch),
    onSuccess: () => {
      toast.success("Updated");
      setRejecting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      toast.success("Deleted");
      setPendingDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cohortName = (id: string) => cohorts.find((c) => c.id === id)?.code ?? "—";

  function handleStatusChange(c: Candidate, value: string) {
    if (value === "rejected" && isInstructor) {
      setRejecting(c);
      return;
    }
    update.mutate({ id: c.id, patch: { status: value } });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-muted-foreground">Training</p>
          <h1 className="mt-1 font-display text-4xl font-bold">Candidates</h1>
        </div>
        {canWrite && (
          <Button type="button" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "Add candidate"}
          </Button>
        )}
      </div>

      {adding && (
        <Card className="mt-6 grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cohort</Label>
            <Select value={cohortId} onValueChange={setCohortId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>National ID</Label>
            <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>District</Label>
            <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </div>
          <Button
            type="button"
            disabled={create.isPending || !cohortId || form.full_name.trim().length < 2}
            onClick={() => create.mutate()}
          >
            Save candidate
          </Button>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          placeholder="Search name, code, ID"
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={cohortFilter} onValueChange={setCohortFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cohorts</SelectItem>
            {cohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Training</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/candidates/${c.id}`} className="font-medium hover:underline">
                    {c.full_name}
                  </Link>
                  <p className="font-mono text-sm text-primary">{c.candidate_code}</p>
                  {c.source === "provided" && (
                    <Badge variant="secondary" className="mt-1">
                      UZA provided
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{cohortName(c.cohort_id)}</TableCell>
                <TableCell>
                  {canMembership ? (
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
                  ) : (
                    <Badge>{c.status}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canTraining ? (
                    <Select
                      value={c.training_status}
                      onValueChange={(v) => update.mutate({ id: c.id, patch: { training_status: v } })}
                    >
                      <SelectTrigger className="h-9 w-[150px]">
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
                  ) : (
                    c.training_status
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/candidates/${c.id}`}>Profile</Link>
                    </Button>
                    {canDelete && isSchoolOwned(c) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setPendingDelete(c)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete candidate"
        description={pendingDelete ? `Delete ${pendingDelete.full_name}? Attendance, scores, and issues for this person will also be removed.` : ""}
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
