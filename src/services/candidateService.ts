import { api, type ApiResponse } from "./api";
import type { Cohort } from "./cohortService";

export type CandidateStatus =
  | "enrolled"
  | "waitlisted"
  | "rejected"
  | "withdrawn"
  | "graduated";

export type TrainingStatus = "not_started" | "in_progress" | "completed" | "failed";

export function isSchoolOwned(candidate: { source?: string | null }) {
  return candidate.source === "institution";
}

export type Candidate = {
  id: string;
  candidate_code: string;
  cohort_id: string;
  status: CandidateStatus;
  waitlist_position: number | null;
  training_status: TrainingStatus;
  full_name: string;
  national_id: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string;
  email: string | null;
  district: string | null;
  attendance_percentage: number | null;
  exam_score: number | null;
  instructor_notes: string | null;
  disqualification_reason: string | null;
  source?: "provided" | "institution";
  created_at?: string;
};

export type CreateCandidatePayload = {
  cohort_id: string;
  full_name: string;
  national_id: string;
  phone: string;
  email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  district?: string | null;
  status?: CandidateStatus;
};

export type UpdateCandidatePatch = Partial<
  Pick<
    Candidate,
    | "full_name"
    | "national_id"
    | "phone"
    | "email"
    | "date_of_birth"
    | "gender"
    | "district"
    | "status"
    | "training_status"
    | "instructor_notes"
    | "attendance_percentage"
    | "exam_score"
    | "disqualification_reason"
  >
>;

export type CandidateProfileIssue = {
  id: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string | null;
  created_at?: string;
};

export type CandidateProfileSession = {
  id: string;
  date: string;
  session_label: string;
  activity_notes: string | null;
  module_id: string | null;
  status: string | null;
  note: string | null;
};

export type CandidateProfileScore = {
  assessment_id: string;
  title: string;
  type: string;
  date: string;
  max_score: number;
  is_final: boolean;
  score: number | null;
  remarks: string | null;
};

export type CandidateProfile = {
  candidate: Candidate;
  cohort: Cohort | null;
  issues: CandidateProfileIssue[];
  recent_sessions: CandidateProfileSession[];
  scores: CandidateProfileScore[];
};

export async function listCandidates(opts: { cohortId?: string } = {}) {
  const { data } = await api.get<ApiResponse<{ candidates: Candidate[] }>>("/candidates", {
    params: opts.cohortId ? { cohortId: opts.cohortId } : undefined,
  });
  return data.data.candidates;
}

export async function getCandidate(id: string) {
  const { data } = await api.get<ApiResponse<CandidateProfile>>(`/candidates/${id}`);
  return data.data;
}

export async function createCandidate(payload: CreateCandidatePayload) {
  const { data } = await api.post<ApiResponse<{ candidate: Candidate }>>("/candidates", payload);
  return data.data.candidate;
}

export async function bulkCreateCandidates(
  cohortId: string,
  candidates: Array<Omit<CreateCandidatePayload, "cohort_id">>,
) {
  const { data } = await api.post<
    ApiResponse<{
      created: Candidate[];
      errors: Array<{ index: number; national_id?: string; message: string }>;
    }>
  >("/candidates/bulk", { cohort_id: cohortId, candidates });
  return data.data;
}

export async function updateCandidate(id: string, patch: UpdateCandidatePatch) {
  const { data } = await api.patch<ApiResponse<{ candidate: Candidate }>>(
    `/candidates/${id}`,
    patch,
  );
  return data.data.candidate;
}

export async function deleteCandidate(id: string) {
  const { data } = await api.delete<ApiResponse<{ id: string }>>(`/candidates/${id}`);
  return data.data;
}
