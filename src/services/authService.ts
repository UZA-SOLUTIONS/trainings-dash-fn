import { api, TOKEN_KEY, type ApiResponse } from "./api";

export type StaffRole = "admin" | "instructor";

export type StaffUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  created_at?: string;
};

type AuthPayload = { user: StaffUser; token: string };

export type CreateStaffPayload = {
  email: string;
  password: string;
  full_name: string;
  role: StaffRole;
};

export async function login(email: string, password: string) {
  const { data } = await api.post<ApiResponse<AuthPayload>>("/auth/login", {
    email,
    password,
  });
  localStorage.setItem(TOKEN_KEY, data.data.token);
  return data.data;
}

export async function register(full_name: string, email: string, password: string) {
  const { data } = await api.post<ApiResponse<AuthPayload>>("/auth/register", {
    full_name,
    email,
    password,
  });
  localStorage.setItem(TOKEN_KEY, data.data.token);
  return data.data;
}

export async function createStaffAccount(payload: CreateStaffPayload) {
  const { data } = await api.post<ApiResponse<{ user: StaffUser }>>("/auth/staff", payload);
  return data.data.user;
}

export async function listStaffAccounts() {
  const { data } = await api.get<ApiResponse<{ users: StaffUser[] }>>("/auth/staff");
  return data.data.users;
}

export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore
  }
  localStorage.removeItem(TOKEN_KEY);
}

export async function getMe() {
  const { data } = await api.get<ApiResponse<{ user: StaffUser }>>("/auth/me");
  return data.data.user;
}

export async function updateProfile(full_name: string, email: string) {
  const { data } = await api.patch<ApiResponse<{ user: StaffUser }>>("/auth/me", {
    full_name,
    email,
  });
  return data.data.user;
}

export async function changePassword(current_password: string, new_password: string) {
  const { data } = await api.patch<ApiResponse<{ user: StaffUser }>>("/auth/password", {
    current_password,
    new_password,
  });
  return data.data.user;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
