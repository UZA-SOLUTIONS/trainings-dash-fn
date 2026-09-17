import { api, type ApiResponse } from "./api";

export type AssessmentType = "quiz" | "test" | "exam";

export type Assessment = {
  id: string;
  cohort_id: string;
  title: string;
  type: AssessmentType;
  max_score: number;
  date: string;
  module_id: string | null;
  is_final: boolean;
  created_by: string | null;
};

export type AssessmentRosterRow = {
  candidate_id: string;
  candidate_code: string;
  full_name: string;
  score: number | null;
  remarks: string | null;
};

export type CreateAssessmentPayload = {
  title: string;
  type: AssessmentType;
  max_score?: number;
  date: string;
  module_id?: string | null;
  is_final?: boolean;
};

export async function listAssessments(cohortId: string) {
  const { data } = await api.get<ApiResponse<{ assessments: Assessment[] }>>(
    `/cohorts/${cohortId}/assessments`,
  );
  return data.data.assessments;
}

export async function createAssessment(cohortId: string, payload: CreateAssessmentPayload) {
  const { data } = await api.post<ApiResponse<{ assessment: Assessment }>>(
    `/cohorts/${cohortId}/assessments`,
    payload,
  );
  return data.data.assessment;
}

export async function getAssessment(assessmentId: string) {
  const { data } = await api.get<
    ApiResponse<{ assessment: Assessment; roster: AssessmentRosterRow[] }>
  >(`/assessments/${assessmentId}`);
  return data.data;
}

export async function updateAssessment(assessmentId: string, payload: Partial<CreateAssessmentPayload>) {
  const { data } = await api.patch<ApiResponse<{ assessment: Assessment }>>(
    `/assessments/${assessmentId}`,
    payload,
  );
  return data.data.assessment;
}

export async function saveAssessmentScores(
  assessmentId: string,
  scores: Array<{ candidate_id: string; score: number; remarks?: string | null }>,
) {
  const { data } = await api.put<
    ApiResponse<{ assessment: Assessment; roster: AssessmentRosterRow[] }>
  >(`/assessments/${assessmentId}/scores`, { scores });
  return data.data;
}

export async function deleteAssessment(assessmentId: string) {
  const { data } = await api.delete<ApiResponse<{ id: string }>>(`/assessments/${assessmentId}`);
  return data.data;
}
