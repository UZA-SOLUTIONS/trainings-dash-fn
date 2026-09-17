import { api, type ApiResponse } from "./api";
import type { Candidate } from "./candidateService";
import type { StaffUser } from "./authService";

export type CohortCourse = {
  id: string;
  name: string;
  code: string;
  status?: string;
} | null;

export type CohortInstructor = {
  id: string;
  full_name: string | null;
  email: string;
  role: StaffUser["role"];
};

export type Cohort = {
  id: string;
  name: string;
  code: string;
  capacity: number;
  location: string | null;
  start_date: string | null;
  end_date?: string | null;
  notes?: string | null;
  course_id: string | null;
  instructor_ids: string[];
  course?: CohortCourse;
  instructors?: CohortInstructor[];
};

export type CreateCohortPayload = {
  name: string;
  code: string;
  capacity?: number;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  course_id?: string | null;
  instructor_ids?: string[];
};

export async function listCohorts() {
  const { data } = await api.get<ApiResponse<{ cohorts: Cohort[] }>>("/cohorts");
  return data.data.cohorts;
}

export async function getCohort(id: string) {
  const { data } = await api.get<ApiResponse<{ cohort: Cohort; candidates: Candidate[] }>>(
    `/cohorts/${id}`,
  );
  return data.data;
}

export async function createCohort(payload: CreateCohortPayload) {
  const { data } = await api.post<ApiResponse<{ cohort: Cohort }>>("/cohorts", payload);
  return data.data.cohort;
}

export async function updateCohort(id: string, payload: Partial<CreateCohortPayload>) {
  const { data } = await api.patch<ApiResponse<{ cohort: Cohort }>>(`/cohorts/${id}`, payload);
  return data.data.cohort;
}

export async function deleteCohort(id: string) {
  const { data } = await api.delete<ApiResponse<{ cohort: Cohort }>>(`/cohorts/${id}`);
  return data.data.cohort;
}
