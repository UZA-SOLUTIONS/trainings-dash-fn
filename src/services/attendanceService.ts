import { api, type ApiResponse } from "./api";

export type SessionLabel = "full_day" | "morning" | "afternoon";
export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type AttendanceSession = {
  id: string;
  cohort_id: string;
  date: string;
  session_label: SessionLabel;
  activity_notes: string | null;
  module_id: string | null;
  recorded_by: string | null;
};

export type AttendanceRosterRow = {
  candidate_id: string;
  candidate_code: string;
  full_name: string;
  status: AttendanceStatus | null;
  note: string | null;
};

export async function listAttendanceSessions(
  cohortId: string,
  params: { date?: string; session_label?: SessionLabel } = {},
) {
  const { data } = await api.get<ApiResponse<{ sessions: AttendanceSession[] }>>(
    `/cohorts/${cohortId}/attendance/sessions`,
    { params },
  );
  return data.data.sessions;
}

export async function createAttendanceSession(
  cohortId: string,
  payload: {
    date: string;
    session_label?: SessionLabel;
    activity_notes?: string | null;
    module_id?: string | null;
  },
) {
  const { data } = await api.post<ApiResponse<{ session: AttendanceSession }>>(
    `/cohorts/${cohortId}/attendance/sessions`,
    payload,
  );
  return data.data.session;
}

export async function getAttendanceSession(sessionId: string) {
  const { data } = await api.get<
    ApiResponse<{
      session: AttendanceSession;
      roster: AttendanceRosterRow[];
    }>
  >(`/attendance/sessions/${sessionId}`);
  return data.data;
}

export async function updateAttendanceSession(
  sessionId: string,
  payload: {
    activity_notes?: string | null;
    session_label?: SessionLabel;
    module_id?: string | null;
  },
) {
  const { data } = await api.patch<ApiResponse<{ session: AttendanceSession }>>(
    `/attendance/sessions/${sessionId}`,
    payload,
  );
  return data.data.session;
}

export async function saveAttendanceRecords(
  sessionId: string,
  records: Array<{ candidate_id: string; status: AttendanceStatus; note?: string | null }>,
) {
  const { data } = await api.put<
    ApiResponse<{
      session: AttendanceSession;
      roster: AttendanceRosterRow[];
    }>
  >(`/attendance/sessions/${sessionId}/records`, { records });
  return data.data;
}

export async function deleteAttendanceSession(sessionId: string) {
  const { data } = await api.delete<ApiResponse<{ id: string }>>(
    `/attendance/sessions/${sessionId}`,
  );
  return data.data;
}
