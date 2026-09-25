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
import { CANCEL_TEXT, DELETE_TEXT, formatDob, LINK_TEXT, SAVE_TEXT, cn, statusTone } from "@/lib/utils";
import { CELL_SELECT, SheetInput } from "@/components/ui/sheet-input";
import { PageTitle } from "@/components/layout/PageTitle";
import { useI18n } from "@/i18n/LanguageContext";

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
  const { t, label } = useI18n();
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
      toast.success(t("toast.candidateAdded"));
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
      toast.success(t("toast.updated"));
      setRejecting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      toast.success(t("toast.deleted"));
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
      <PageTitle
        actions={
          canWrite ? (
            <button
              type="button"
              className={adding ? CANCEL_TEXT : SAVE_TEXT}
              onClick={() => setAdding((v) => !v)}
            >
              {adding ? t("common.close") : t("action.addCandidate")}
            </button>
          ) : undefined
        }
      >
        {t("page.candidates")}
      </PageTitle>

      {adding && (
        <Card className="mt-6 grid gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("col.cohort")}</Label>
            <Select value={cohortId} onValueChange={setCohortId}>
              <SelectTrigger>
                <SelectValue placeholder={t("empty.selectCohort")} />
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
            <Label>{t("col.fullName")}</Label>
            <SheetInput
              value={form.full_name}
              onChange={(full_name) => setForm({ ...form, full_name })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("col.nationalId")}</Label>
            <SheetInput
              value={form.national_id}
              onChange={(national_id) => setForm({ ...form, national_id })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("col.phone")}</Label>
            <SheetInput
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("col.email")}</Label>
            <SheetInput
              type="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("col.dob")}</Label>
            <SheetInput
              type="date"
              value={form.date_of_birth}
              onChange={(date_of_birth) => setForm({ ...form, date_of_birth })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("col.gender")}</Label>
            <SheetInput
              value={form.gender}
              onChange={(gender) => setForm({ ...form, gender })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("col.district")}</Label>
            <SheetInput
              value={form.district}
              onChange={(district) => setForm({ ...form, district })}
              onSave={() => create.mutate()}
              pending={create.isPending}
            />
          </div>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          placeholder={t("empty.searchCandidates")}
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={cohortFilter} onValueChange={setCohortFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("empty.allCohorts")}</SelectItem>
            {cohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4 overflow-hidden rounded-none border-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.candidate")}</TableHead>
              <TableHead>{t("col.code")}</TableHead>
              <TableHead>{t("col.cohort")}</TableHead>
              <TableHead>{t("col.nationalId")}</TableHead>
              <TableHead>{t("col.email")}</TableHead>
              <TableHead>{t("col.dob")}</TableHead>
              <TableHead>{t("col.district")}</TableHead>
              <TableHead>{t("col.status")}</TableHead>
              <TableHead>{t("col.training")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  {canMembership && isSchoolOwned(c) ? (
                    <SheetInput
                      value={c.full_name}
                      onSave={(full_name) => update.mutate({ id: c.id, patch: { full_name } })}
                      pending={update.isPending}
                    />
                  ) : (
                    <Link to={`/candidates/${c.id}`} className={LINK_TEXT}>
                      {c.full_name}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <span className="text-primary">{c.candidate_code}</span>
                  {c.source === "provided" && (
                    <Badge variant="secondary" className="ml-2">
                      {t("badge.uzaProvided")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{cohortName(c.cohort_id)}</TableCell>
                <TableCell className="font-mono">
                  {canMembership && isSchoolOwned(c) ? (
                    <SheetInput
                      className="font-mono"
                      value={c.national_id || ""}
                      onSave={(national_id) => update.mutate({ id: c.id, patch: { national_id } })}
                      pending={update.isPending}
                    />
                  ) : (
                    c.national_id || "—"
                  )}
                </TableCell>
                <TableCell>
                  {canMembership && isSchoolOwned(c) ? (
                    <SheetInput
                      type="email"
                      value={c.email || ""}
                      onSave={(email) =>
                        update.mutate({ id: c.id, patch: { email: email.trim() || null } })
                      }
                      pending={update.isPending}
                    />
                  ) : (
                    c.email || "—"
                  )}
                </TableCell>
                <TableCell>
                  {canMembership && isSchoolOwned(c) ? (
                    <SheetInput
                      type="date"
                      value={c.date_of_birth ?? ""}
                      onSave={(date_of_birth) =>
                        update.mutate({
                          id: c.id,
                          patch: { date_of_birth: date_of_birth || null },
                        })
                      }
                      pending={update.isPending}
                    />
                  ) : (
                    formatDob(c.date_of_birth)
                  )}
                </TableCell>
                <TableCell>
                  {canMembership && isSchoolOwned(c) ? (
                    <SheetInput
                      value={c.district ?? ""}
                      onSave={(district) =>
                        update.mutate({
                          id: c.id,
                          patch: { district: district.trim() || null },
                        })
                      }
                      pending={update.isPending}
                    />
                  ) : (
                    c.district || "—"
                  )}
                </TableCell>
                    <TableCell className={canMembership ? "p-0" : statusTone(c.status)}>
                  {canMembership ? (
                    <Select value={c.status} onValueChange={(v) => handleStatusChange(c, v)}>
                      <SelectTrigger className={cn(CELL_SELECT, statusTone(c.status))}>
                        <SelectValue>{label(c.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className={statusTone(s)}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    label(c.status)
                  )}
                </TableCell>
                <TableCell className={canTraining ? "p-0" : statusTone(c.training_status)}>
                  {canTraining ? (
                    <Select
                      value={c.training_status}
                      onValueChange={(v) => update.mutate({ id: c.id, patch: { training_status: v } })}
                    >
                      <SelectTrigger className={cn(CELL_SELECT, statusTone(c.training_status))}>
                        <SelectValue>{label(c.training_status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING.map((s) => (
                          <SelectItem key={s} value={s} className={statusTone(s)}>
                            {label(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    label(c.training_status)
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Link to={`/candidates/${c.id}`} className={LINK_TEXT}>
                      {t("col.profile")}
                    </Link>
                    {canDelete && isSchoolOwned(c) && (
                      <button
                        type="button"
                        className={DELETE_TEXT}
                        onClick={() => setPendingDelete(c)}
                      >
                        {t("common.delete")}
                      </button>
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
        title={t("dialog.deleteCandidate")}
        description={pendingDelete ? t("dialog.deleteCandidateBody", { name: pendingDelete.full_name }) : ""}
        confirmLabel={t("dialog.deleteCandidateConfirm")}
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
        title={t("dialog.disqualify")}
        description={t("dialog.disqualifyBody")}
        confirmLabel={t("dialog.reject")}
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
