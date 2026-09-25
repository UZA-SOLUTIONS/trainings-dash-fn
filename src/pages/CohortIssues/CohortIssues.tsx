import { Fragment, useState } from "react";
import { useParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import {
  createCohortIssue,
  deleteIssue,
  listCohortIssues,
  updateIssue,
  type IssueCategory,
  type IssueSeverity,
  type IssueStatus,
} from "@/services/issueService";
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
import { CANCEL_TEXT, DELETE_TEXT, LINK_TEXT, SAVE_TEXT, statusTone } from "@/lib/utils";
import { PageTitle } from "@/components/layout/PageTitle";
import { CohortSummary } from "@/components/layout/CohortSummary";
import { useI18n } from "@/i18n/LanguageContext";

const CATEGORIES: IssueCategory[] = ["academic", "conduct", "attendance", "health", "other"];
const SEVERITIES: IssueSeverity[] = ["low", "medium", "high"];
const STATUSES: IssueStatus[] = ["open", "in_progress", "resolved"];

function formatReported(value: string, locale: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export default function CohortIssues() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { t, label, locale } = useI18n();
  const canWrite = can("issues.write");

  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [reporting, setReporting] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [category, setCategory] = useState<IssueCategory>("academic");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: cohortData } = useQuery({
    queryKey: ["cohort", cohortId],
    queryFn: () => getCohort(cohortId!),
    enabled: Boolean(cohortId),
  });

  const { data: issues = [], isPending: issuesLoading } = useQuery({
    queryKey: ["issues", cohortId, statusFilter],
    queryFn: () =>
      listCohortIssues(cohortId!, statusFilter === "all" ? {} : { status: statusFilter }),
    enabled: Boolean(cohortId),
    placeholderData: keepPreviousData,
  });

  const candidates = (cohortData?.candidates ?? []).filter(
    (c) => c.status === "enrolled" || c.status === "graduated",
  );

  const create = useMutation({
    mutationFn: () =>
      createCohortIssue(cohortId!, {
        candidate_id: candidateId,
        category,
        severity,
        title: title.trim(),
        description: description.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Issue reported");
      setTitle("");
      setDescription("");
      setReporting(false);
      queryClient.invalidateQueries({ queryKey: ["issues", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { status?: IssueStatus; resolution_notes?: string | null };
    }) => updateIssue(id, payload),
    onSuccess: () => {
      toast.success("Issue updated");
      setResolvingId(null);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["issues", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteIssue(id),
    onSuccess: () => {
      toast.success("Issue deleted");
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["issues", cohortId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageTitle
        actions={
          <>
            {canWrite && !reporting && (
              <button type="button" className={SAVE_TEXT} onClick={() => setReporting(true)}>
              {t("issues.report")}
            </button>
            )}
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as IssueStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("issues.allStatuses")}</SelectItem>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {label(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      >
        {t("page.issues")}
      </PageTitle>
      <CohortSummary />
      <section className="space-y-4">

        {canWrite && reporting && (
          <Card className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm">{t("issues.report")}</h2>
              <button type="button" className={CANCEL_TEXT} onClick={() => setReporting(false)}>
                {t("common.cancel")}
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("col.candidate")}</Label>
                <Select value={candidateId || undefined} onValueChange={setCandidateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("issues.selectCandidate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} ({c.candidate_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("col.category")}</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as IssueCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {label(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("col.severity")}</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as IssueSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {label(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("col.title")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>{t("issues.details")}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <button
              type="button"
              className={SAVE_TEXT}
              disabled={create.isPending || !candidateId || title.trim().length < 2}
              onClick={() => create.mutate()}
            >
              {create.isPending ? t("action.reporting") : t("action.reportIssue")}
            </button>
          </Card>
        )}

        {issuesLoading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : issues.length === 0 ? (
          <p className="text-base text-muted-foreground">{t("issues.noneYet")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.title")}</TableHead>
                <TableHead>{t("col.candidate")}</TableHead>
                <TableHead>{t("col.category")}</TableHead>
                <TableHead>{t("col.severity")}</TableHead>
                <TableHead>{t("col.status")}</TableHead>
                <TableHead>{t("col.reported")}</TableHead>
                {canWrite && <TableHead>{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <Fragment key={issue.id}>
                  <TableRow>
                    <TableCell>
                      <p>{issue.title}</p>
                      {issue.description && (
                        <p className="mt-0.5 text-muted-foreground">{issue.description}</p>
                      )}
                      {issue.resolution_notes && (
                        <p className="mt-0.5 text-muted-foreground">
                          {t("issues.resolution")}: {issue.resolution_notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {issue.candidate_name}
                      <span className="ml-1 font-mono text-muted-foreground">{issue.candidate_code}</span>
                    </TableCell>
                    <TableCell>{label(issue.category)}</TableCell>
                    <TableCell className={statusTone(issue.severity)}>{label(issue.severity)}</TableCell>
                    <TableCell className={statusTone(issue.status)}>{label(issue.status)}</TableCell>
                    <TableCell>{formatReported(issue.created_at, locale)}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <div className="flex flex-wrap gap-3">
                          {issue.status !== "in_progress" && (
                            <button
                              type="button"
                              className={LINK_TEXT}
                              onClick={() =>
                                update.mutate({ id: issue.id, payload: { status: "in_progress" } })
                              }
                            >
                              {t("status.in_progress")}
                            </button>
                          )}
                          {issue.status !== "open" && (
                            <button
                              type="button"
                              className={LINK_TEXT}
                              onClick={() =>
                                update.mutate({
                                  id: issue.id,
                                  payload: { status: "open", resolution_notes: null },
                                })
                              }
                            >
                              {t("issues.reopen")}
                            </button>
                          )}
                          {issue.status !== "resolved" && (
                            <button
                              type="button"
                              className={SAVE_TEXT}
                              onClick={() => {
                                setResolvingId(issue.id);
                                setResolutionNotes(issue.resolution_notes ?? "");
                              }}
                            >
                              {t("issues.resolve")}
                            </button>
                          )}
                          <button
                            type="button"
                            className={DELETE_TEXT}
                            onClick={() => setPendingDelete(issue.id)}
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {resolvingId === issue.id && (
                    <TableRow>
                      <TableCell colSpan={canWrite ? 7 : 6}>
                        <div className="space-y-2">
                          <Label>{t("issues.resolutionNotes")}</Label>
                          <Textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                          />
                          <button
                            type="button"
                            className={SAVE_TEXT}
                            disabled={update.isPending}
                            onClick={() =>
                              update.mutate({
                                id: issue.id,
                                payload: {
                                  status: "resolved",
                                  resolution_notes: resolutionNotes.trim() || null,
                                },
                              })
                            }
                          >
                            {t("issues.saveResolution")}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={t("dialog.deleteIssue")}
        description={t("dialog.deleteIssueBody")}
        confirmLabel={t("dialog.deleteIssueConfirm")}
        pending={remove.isPending}
        onConfirm={async () => {
          if (pendingDelete) await remove.mutateAsync(pendingDelete);
        }}
      />
    </div>
  );
}
