import axios from "axios";

const RAW = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export const TOKEN_KEY = "training_dash_token";
export const AUTH_EXPIRED_EVENT = "training-dash:auth-expired";

function resolveUrl(url: string | undefined) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && RAW.endsWith("/api")) {
    return `${RAW}${url}`;
  }
  return url;
}

export const api = axios.create({
  baseURL: RAW,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const staffToken = localStorage.getItem(TOKEN_KEY);
  if (staffToken) config.headers.Authorization = `Bearer ${staffToken}`;
  if (typeof config.url === "string") {
    config.url = resolveUrl(config.url);
    if (config.url?.startsWith("http")) {
      config.baseURL = undefined;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status as number | undefined;
    const message =
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot reach the API. Check that the backend is running and VITE_API_URL is correct."
        : error.message || "Request failed");
    const code = error.response?.data?.error;

    if (status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = code;
    err.status = status;
    return Promise.reject(err);
  },
);

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error?: string;
};

export async function healthCheck() {
  const { data } = await api.get<ApiResponse<{ status: string }>>("/health");
  return data.data;
}
