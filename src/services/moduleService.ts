import { api, type ApiResponse } from "./api";

export type ModuleStatus = "draft" | "active" | "archived";

export type ModuleContentSection = {
  id?: string;
  title: string;
  body: string;
  sort_order: number;
};

export type ModuleAttachment = {
  id?: string;
  name: string;
  mime_type: string;
  size: number;
  /** Present only when uploading a new/replaced file */
  data?: string;
};

export type TrainingModule = {
  id: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  name: string;
  code: string;
  description: string | null;
  content: string | null;
  contents: ModuleContentSection[];
  attachments: ModuleAttachment[];
  sort_order: number;
  duration_hours: number;
  status: ModuleStatus;
};

export type CreateModulePayload = {
  course_id: string;
  name: string;
  code: string;
  description?: string | null;
  content?: string | null;
  contents?: ModuleContentSection[];
  attachments?: ModuleAttachment[];
  sort_order?: number;
  duration_hours?: number;
  status?: ModuleStatus;
};

export async function listModules(opts: { courseId?: string; active?: boolean } = {}) {
  const params: Record<string, string> = {};
  if (opts.courseId) params.course_id = opts.courseId;
  if (opts.active) params.active = "true";
  const { data } = await api.get<ApiResponse<{ modules: TrainingModule[] }>>("/modules", {
    params: Object.keys(params).length ? params : undefined,
  });
  return data.data.modules;
}

export async function getModule(id: string) {
  const { data } = await api.get<ApiResponse<{ module: TrainingModule }>>(`/modules/${id}`);
  return data.data.module;
}

export async function createModule(payload: CreateModulePayload) {
  const { data } = await api.post<ApiResponse<{ module: TrainingModule }>>("/modules", payload);
  return data.data.module;
}

export async function updateModule(id: string, payload: Partial<CreateModulePayload>) {
  const { data } = await api.patch<ApiResponse<{ module: TrainingModule }>>(
    `/modules/${id}`,
    payload,
  );
  return data.data.module;
}

export async function deleteModule(id: string) {
  const { data } = await api.delete<ApiResponse<{ module: TrainingModule }>>(`/modules/${id}`);
  return data.data.module;
}

/** Absolute URL for downloading a module attachment */
export function moduleAttachmentUrl(moduleId: string, attachmentId: string) {
  const base = api.defaults.baseURL?.replace(/\/$/, "") || "";
  return `${base}/modules/${moduleId}/attachments/${attachmentId}`;
}

/** Download with auth header (needed for draft modules in the dashboard) */
export async function downloadModuleAttachment(
  moduleId: string,
  attachmentId: string,
  fileName: string,
) {
  const { data } = await api.get(`/modules/${moduleId}/attachments/${attachmentId}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
