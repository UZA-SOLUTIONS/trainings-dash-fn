import { api, type ApiResponse } from "./api";

export type IssueCategory = "academic" | "conduct" | "attendance" | "health" | "other";
export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "open" | "in_progress" | "resolved";

export type CandidateIssue = {
  id: string;
  candidate_id: string;
  cohort_id: string;
  reported_by: string | null;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string | null;
  status: IssueStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  candidate_name: string | null;
  candidate_code: string | null;
};

export type CreateIssuePayload = {
  candidate_id: string;
  category: IssueCategory;
  severity?: IssueSeverity;
  title: string;
  description?: string | null;
};

export async function listCohortIssues(
  cohortId: string,
  params: { status?: IssueStatus; candidate_id?: string } = {},
) {
  const { data } = await api.get<ApiResponse<{ issues: CandidateIssue[] }>>(
    `/cohorts/${cohortId}/issues`,
    { params },
  );
  return data.data.issues;
}

export async function createCohortIssue(cohortId: string, payload: CreateIssuePayload) {
  const { data } = await api.post<ApiResponse<{ issue: CandidateIssue }>>(
    `/cohorts/${cohortId}/issues`,
    payload,
  );
  return data.data.issue;
}

export async function updateIssue(
  issueId: string,
  payload: Partial<{
    category: IssueCategory;
    severity: IssueSeverity;
    title: string;
    description: string | null;
    status: IssueStatus;
    resolution_notes: string | null;
  }>,
) {
  const { data } = await api.patch<ApiResponse<{ issue: CandidateIssue }>>(
    `/issues/${issueId}`,
    payload,
  );
  return data.data.issue;
}
