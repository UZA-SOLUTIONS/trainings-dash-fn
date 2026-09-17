import { api, type ApiResponse } from "./api";

export type CourseStatus = "draft" | "active" | "archived";

export type Course = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  duration_weeks: number;
  status: CourseStatus;
  module_count?: number;
};

export type CreateCoursePayload = {
  name: string;
  code: string;
  description?: string | null;
  duration_weeks?: number;
  status?: CourseStatus;
};

export async function listCourses(opts: { active?: boolean } = {}) {
  const params = opts.active ? { active: "true" } : undefined;
  const { data } = await api.get<ApiResponse<{ courses: Course[] }>>("/courses", { params });
  return data.data.courses;
}

export async function getCourse(id: string) {
  const { data } = await api.get<
    ApiResponse<{ course: Course; modules: import("./moduleService").TrainingModule[] }>
  >(`/courses/${id}`);
  return data.data;
}

export async function createCourse(payload: CreateCoursePayload) {
  const { data } = await api.post<ApiResponse<{ course: Course }>>("/courses", payload);
  return data.data.course;
}

export async function updateCourse(id: string, payload: Partial<CreateCoursePayload>) {
  const { data } = await api.patch<ApiResponse<{ course: Course }>>(`/courses/${id}`, payload);
  return data.data.course;
}

export async function deleteCourse(id: string) {
  const { data } = await api.delete<ApiResponse<{ course: Course }>>(`/courses/${id}`);
  return data.data.course;
}
