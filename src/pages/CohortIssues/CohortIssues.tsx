import { useState } from "react";
import { useParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCohort } from "@/services/cohortService";
import {
  createCohortIssue,
  listCohortIssues,
  updateIssue,
  type IssueCategory,
  type IssueSeverity,
  type IssueStatus,
} from "@/services/issueService";
import { CohortClassroomHeader } from "@/components/classroom/CohortClassroomHeader";
import { Badge } from "@/components/ui/badge";
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
import { ListSkeleton } from "@/components/feedback/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CATEGORIES: IssueCategory[] = ["academic", "conduct", "attendance", "health", "other"];
const SEVERITIES: IssueSeverity[] = ["low", "medium", "high"];
const STATUSES: IssueStatus[] = ["open", "in_progress", "resolved"];

function statusBadge(status: IssueStatus) {
  if (status === "resolved") return <Badge variant="secondary">Resolved</Badge>;
  if (status === "in_progress") return <Badge>In progress</Badge>;
  return <Badge variant="outline">Open</Badge>;
}

export default function CohortIssues() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("issues.write");

  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [candidateId, setCandidateId] = useState("");
  const [category, setCategory] = useState<IssueCategory>("academic");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const { data: cohortData, isPending: cohortLoading } = useQuery({
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

  return (
    <div>
      <CohortClassroomHeader cohort={cohortData?.cohort} loading={cohortLoading} />

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        {canWrite && (
          <Card className="h-fit space-y-4 p-5">
            <h2 className="font-display text-xl font-semibold">Report an issue</h2>
            <div className="space-y-1.5">
              <Label>Candidate</Label>
              <Select value={candidateId || undefined} onValueChange={setCandidateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate" />
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
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as IssueCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as IssueSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Details</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button
              type="button"
              disabled={create.isPending || !candidateId || title.trim().length < 2}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Reporting…" : "Report issue"}
            </Button>
          </Card>
        )}

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Issue log</h2>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as IssueStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {issuesLoading ? (
            <ListSkeleton rows={4} />
          ) : issues.length === 0 ? (
            <p className="text-base text-muted-foreground">No issues reported yet.</p>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <Card key={issue.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{issue.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {issue.candidate_name} · {issue.candidate_code} · {issue.category} ·{" "}
                        {issue.severity}
                      </p>
                    </div>
                    {statusBadge(issue.status)}
                  </div>
                  {issue.description && <p className="text-sm">{issue.description}</p>}
                  {issue.resolution_notes && (
                    <p className="text-sm text-muted-foreground">
                      Resolution: {issue.resolution_notes}
                    </p>
                  )}
                  {canWrite && (
                    <div className="flex flex-wrap gap-2">
                      {issue.status !== "in_progress" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            update.mutate({ id: issue.id, payload: { status: "in_progress" } })
                          }
                        >
                          In progress
                        </Button>
                      )}
                      {issue.status !== "open" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            update.mutate({
                              id: issue.id,
                              payload: { status: "open", resolution_notes: null },
                            })
                          }
                        >
                          Reopen
                        </Button>
                      )}
                      {issue.status !== "resolved" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResolvingId(issue.id);
                            setResolutionNotes(issue.resolution_notes ?? "");
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  )}
                  {resolvingId === issue.id && (
                    <div className="space-y-2">
                      <Label>Resolution notes</Label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
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
                        Save resolution
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
