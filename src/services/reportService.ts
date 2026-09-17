import { api, type ApiResponse } from "./api";
import type { Cohort } from "./cohortService";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type AttendanceReport = {
  cohort: Cohort;
  sessions: Array<{
    id: string;
    date: string;
    session_label: string;
    activity_notes: string | null;
  }>;
  rows: Array<{
    candidate_id: string;
    candidate_code: string;
    full_name: string;
    attendance_percentage: number | null;
    present: number;
    late: number;
    absent: number;
    excused: number;
    by_date: Record<string, string>;
  }>;
};

export type ScoresReport = {
  cohort: Cohort;
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    max_score: number;
    date: string;
    is_final: boolean;
  }>;
  rows: Array<{
    candidate_id: string;
    candidate_code: string;
    full_name: string;
    exam_score: number | null;
    scores: Record<string, number | null>;
  }>;
};

export type IssuesReport = {
  cohort: Cohort;
  issues: Array<{
    id: string;
    candidate_code: string | null;
    candidate_name: string | null;
    category: string;
    severity: string;
    status: string;
    title: string;
    description: string | null;
    resolution_notes: string | null;
    created_at: string;
    resolved_at: string | null;
  }>;
};

export async function getAttendanceReport(
  cohortId: string,
  params: { from?: string; to?: string } = {},
) {
  const { data } = await api.get<ApiResponse<AttendanceReport>>(
    `/cohorts/${cohortId}/reports/attendance`,
    { params },
  );
  return data.data;
}

export async function getScoresReport(cohortId: string) {
  const { data } = await api.get<ApiResponse<ScoresReport>>(`/cohorts/${cohortId}/reports/scores`);
  return data.data;
}

export async function getIssuesReport(cohortId: string, params: { status?: string } = {}) {
  const { data } = await api.get<ApiResponse<IssuesReport>>(`/cohorts/${cohortId}/reports/issues`, {
    params,
  });
  return data.data;
}

export async function downloadAttendanceCsv(
  cohortId: string,
  filename: string,
  params: { from?: string; to?: string } = {},
) {
  const { data } = await api.get(`/cohorts/${cohortId}/reports/attendance`, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
  triggerDownload(data as Blob, filename);
}

export async function downloadScoresCsv(cohortId: string, filename: string) {
  const { data } = await api.get(`/cohorts/${cohortId}/reports/scores`, {
    params: { format: "csv" },
    responseType: "blob",
  });
  triggerDownload(data as Blob, filename);
}

export async function downloadIssuesCsv(
  cohortId: string,
  filename: string,
  params: { status?: string } = {},
) {
  const { data } = await api.get(`/cohorts/${cohortId}/reports/issues`, {
    params: { ...params, format: "csv" },
    responseType: "blob",
  });
  triggerDownload(data as Blob, filename);
}
