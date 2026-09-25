import { useState, type ReactNode } from "react";
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
import { Card } from "@/components/ui/card";
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
import { DELETE_TEXT, formatDob, LINK_TEXT, SAVE_TEXT, cn, statusTone } from "@/lib/utils";
import { CELL_SELECT, SheetInput } from "@/components/ui/sheet-input";
import { CertificatePreviewDialog } from "@/components/certificate/CertificatePreviewDialog";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";
import { useI18n } from "@/i18n/LanguageContext";

const STATUSES = ["enrolled", "waitlisted", "rejected", "withdrawn", "graduated"] as const;
const TRAINING = ["not_started", "in_progress", "completed", "failed"] as const;

type BulkRow = { full_name: string; national_id: string; phone: string };

function emptyRows(): BulkRow[] {
  return [{ full_name: "", national_id: "", phone: "" }];
}

export default function CohortDetail() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(emptyRows);
  const [pendingDelete, setPendingDelete] = useState<Candidate | null>(null);
  const [rejecting, setRejecting] = useState<Candidate | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { can, isInstructor } = useAuth();
  const { t, label } = useI18n();
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
      toast.success(t("toast.updated"));
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
      <Card className="overflow-hidden rounded-none border-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("col.candidate")}</TableHead>
              <TableHead>{t("col.code")}</TableHead>
              <TableHead>{t("col.phone")}</TableHead>
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
            {rows.map((c) => {
              const owned = isSchoolOwned(c);
              const canEditId = canMembership && owned;
              return (
                  <TableRow key={c.id}>
                    <TableCell>
                      {canEditId ? (
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
                    <TableCell className="font-mono text-sm text-primary">
                      {c.candidate_code}
                    </TableCell>
                    <TableCell>
                      {canEditId ? (
                        <SheetInput
                          value={c.phone ?? ""}
                          onSave={(phone) => update.mutate({ id: c.id, patch: { phone } })}
                          pending={update.isPending}
                        />
                      ) : (
                        c.phone ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {canEditId ? (
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
                      {canEditId ? (
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
                      {canEditId ? (
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
                      {canEditId ? (
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
                          onValueChange={(v) =>
                            update.mutate({ id: c.id, patch: { training_status: v } })
                          }
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
                        {c.status === "graduated" && (
                          <button
                            type="button"
                            className={LINK_TEXT}
                            onClick={() => setPreviewId(c.id)}
                          >
                            {t("page.certificate")}
                          </button>
                        )}
                        {canDelete && owned && (
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
              );
            })}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <div>
      <PageTitle>{t("page.roster")}</PageTitle>
      <CohortSummary />
      <div className="space-y-6">
        {isPending && <TableSkeleton />}
        {cohort && (
          <>
            {canMembership && (
              <div>
                <h2 className="mb-1 text-xs text-muted-foreground">{t("roster.bulkAdd")}</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("col.fullName")}</TableHead>
                      <TableHead>{t("col.nationalId")}</TableHead>
                      <TableHead>{t("col.phone")}</TableHead>
                      <TableHead>{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <SheetInput
                            value={row.full_name}
                            onChange={(full_name) => {
                              const next = [...bulkRows];
                              next[index] = { ...row, full_name };
                              setBulkRows(next);
                            }}
                            onSave={() => bulk.mutate()}
                            pending={bulk.isPending}
                            placeholder={t("col.fullName")}
                          />
                        </TableCell>
                        <TableCell>
                          <SheetInput
                            value={row.national_id}
                            onChange={(national_id) => {
                              const next = [...bulkRows];
                              next[index] = { ...row, national_id };
                              setBulkRows(next);
                            }}
                            onSave={() => bulk.mutate()}
                            pending={bulk.isPending}
                            placeholder={t("col.nationalId")}
                          />
                        </TableCell>
                        <TableCell>
                          <SheetInput
                            value={row.phone}
                            onChange={(phone) => {
                              const next = [...bulkRows];
                              next[index] = { ...row, phone };
                              setBulkRows(next);
                            }}
                            onSave={() => bulk.mutate()}
                            pending={bulk.isPending}
                            placeholder={t("col.phone")}
                          />
                        </TableCell>
                        <TableCell>
                          {bulkRows.length > 1 && (
                            <button
                              type="button"
                              className={DELETE_TEXT}
                              onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== index))}
                            >
                              {t("common.remove")}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-2">
                  <button
                    type="button"
                    className={SAVE_TEXT}
                    onClick={() =>
                      setBulkRows([...bulkRows, { full_name: "", national_id: "", phone: "" }])
                    }
                  >
                    {t("roster.addRow")}
                  </button>
                </div>
              </div>
            )}
            <Section title={t("roster.enrolledN", { count: enrolled.length })}>
              <CandidateTable rows={enrolled} empty={t("empty.noEnrolledYet")} />
            </Section>
            <Section title={t("roster.waitingN", { count: waiting.length })}>
              <CandidateTable rows={waiting} empty={t("empty.noWaiting")} />
            </Section>
            {inactive.length > 0 && (
              <Section title={t("roster.inactiveN", { count: inactive.length })}>
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
      <CertificatePreviewDialog
        candidateId={previewId}
        open={Boolean(previewId)}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
