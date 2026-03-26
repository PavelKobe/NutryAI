import axios, { type AxiosInstance } from 'axios';

export const ADMIN_TOKEN_KEY = 'nutri_admin_token';

function getBaseURL(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const env = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return env ? env.replace(/\/$/, '') : '';
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export interface AuthTokenResponse {
  token: string;
  token_type?: string;
  expires_at: number;
}

export interface AuthMeResponse {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  is_active?: boolean;
  last_login?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  last_login?: string | null;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminUserPatch {
  name?: string | null;
  role?: 'user' | 'admin';
  is_active?: boolean;
}

export interface AdminPayment {
  id: string;
  user_id: string;
  provider: string;
  amount_value: string;
  amount_currency: string;
  status: string;
  yookassa_payment_id?: string | null;
  description?: string | null;
  metadata_json?: unknown;
  captured_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminPaymentListResponse {
  items: AdminPayment[];
  total: number;
  skip: number;
  limit: number;
}

let client: AxiosInstance | null = null;

export function getAdminApi(): AxiosInstance {
  if (typeof window === 'undefined') {
    throw new Error('getAdminApi must run in the browser');
  }
  if (client) return client;

  client = axios.create({
    baseURL: getBaseURL(),
    headers: { 'Content-Type': 'application/json' },
    validateStatus: (s) => s < 500,
  });

  client.interceptors.request.use((config) => {
    const token = getAdminToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => {
      if (res.status === 401 && typeof window !== 'undefined') {
        clearAdminToken();
        const path = window.location.pathname;
        if (!path.startsWith('/admin/login')) {
          window.location.replace('/admin/login');
        }
      }
      return res;
    },
    (err) => Promise.reject(err)
  );

  return client;
}

export async function adminLogin(email: string, password: string): Promise<AuthTokenResponse> {
  const api = getAdminApi();
  const { data, status } = await api.post<AuthTokenResponse>('/api/v1/auth/login', {
    email,
    password,
  });
  if (status !== 200 || !data?.token) {
    const detail = (data as { detail?: string | unknown })?.detail;
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? JSON.stringify(detail)
          : 'Login failed';
    throw new Error(msg);
  }
  return data;
}

export async function adminFetchMe(): Promise<AuthMeResponse> {
  const api = getAdminApi();
  const { data, status } = await api.get<AuthMeResponse>('/api/v1/auth/me');
  if (status !== 200) {
    throw new Error('Failed to load profile');
  }
  return data;
}

function apiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  }
  return fallback;
}

export async function adminGetUser(userId: string): Promise<AdminUser> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminUser>(`/api/v1/admin/users/${userId}`);
  if (status !== 200) {
    throw new Error(apiErrorMessage(data, 'User not found'));
  }
  return data;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const api = getAdminApi();
  const { data, status } = await api.delete(`/api/v1/admin/users/${userId}`);
  if (status !== 204) {
    throw new Error(apiErrorMessage(data, 'Delete failed'));
  }
}

export async function adminListUsers(params: {
  skip?: number;
  limit?: number;
  email_contains?: string;
  role?: string;
}): Promise<AdminUserListResponse> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminUserListResponse>('/api/v1/admin/users', { params });
  if (status !== 200) {
    throw new Error('Failed to load users');
  }
  return data;
}

export async function adminPatchUser(userId: string, body: AdminUserPatch): Promise<AdminUser> {
  const api = getAdminApi();
  const { data, status } = await api.patch<AdminUser>(`/api/v1/admin/users/${userId}`, body);
  if (status !== 200) {
    const d = data as unknown as { detail?: string };
    throw new Error(d?.detail || 'Update failed');
  }
  return data;
}

export async function adminListPayments(params: {
  skip?: number;
  limit?: number;
  user_id?: string;
  status?: string;
}): Promise<AdminPaymentListResponse> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminPaymentListResponse>('/api/v1/admin/payments', {
    params: {
      skip: params.skip,
      limit: params.limit,
      user_id: params.user_id,
      status: params.status,
    },
  });
  if (status !== 200) {
    throw new Error('Failed to load payments');
  }
  return data;
}

export async function adminGetPayment(id: string): Promise<AdminPayment> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminPayment>(`/api/v1/admin/payments/${id}`);
  if (status !== 200) {
    throw new Error('Payment not found');
  }
  return data;
}

export async function adminCapturePayment(id: string): Promise<AdminPayment> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminPayment>(`/api/v1/admin/payments/${id}/capture`, {});
  if (status !== 200) {
    throw new Error(apiErrorMessage(data, 'Capture failed'));
  }
  return data;
}

export async function adminRefundPayment(id: string): Promise<AdminPayment> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminPayment>(`/api/v1/admin/payments/${id}/refund`, {});
  if (status !== 200) {
    throw new Error(apiErrorMessage(data, 'Refund failed'));
  }
  return data;
}
