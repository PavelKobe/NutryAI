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

// ── Subscription types ─────────────────────────────────────────────────────────

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface AdminSubscription {
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  ai_requests_today: number;
  daily_ai_limit: number;
  requests_date: string;
}

export interface AdminSubscriptionListResponse {
  items: AdminSubscription[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminSubscriptionActivate {
  plan_id: string;
  expires_at?: string | null;
}

export interface AdminPlan {
  id: string;
  name: string;
  price_monthly: string | null;
  price_yearly: string | null;
  daily_ai_limit: number;
  trial_days: number | null;
  features: PlanFeature[] | null;
}

export interface AdminPlanPatch {
  name?: string;
  price_monthly?: number | null;
  price_yearly?: number | null;
  daily_ai_limit?: number;
  features?: PlanFeature[];
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

// ── Subscription management ────────────────────────────────────────────────────

export async function adminListSubscriptions(params: {
  skip?: number;
  limit?: number;
  plan_id?: string;
  status?: string;
}): Promise<AdminSubscriptionListResponse> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminSubscriptionListResponse>(
    '/api/v1/admin/subscriptions',
    { params }
  );
  if (status !== 200) throw new Error('Failed to load subscriptions');
  return data;
}

export async function adminActivateSubscription(
  userId: string,
  body: AdminSubscriptionActivate
): Promise<AdminSubscription> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminSubscription>(
    `/api/v1/admin/subscriptions/${userId}/activate`,
    body
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Activate failed'));
  return data;
}

export async function adminDeactivateSubscription(userId: string): Promise<AdminSubscription> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminSubscription>(
    `/api/v1/admin/subscriptions/${userId}/deactivate`,
    {}
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Deactivate failed'));
  return data;
}

// ── Plan management ────────────────────────────────────────────────────────────

export async function adminListPlans(): Promise<AdminPlan[]> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminPlan[]>('/api/v1/admin/plans');
  if (status !== 200) throw new Error('Failed to load plans');
  return data;
}

export async function adminPatchPlan(planId: string, body: AdminPlanPatch): Promise<AdminPlan> {
  const api = getAdminApi();
  const { data, status } = await api.patch<AdminPlan>(`/api/v1/admin/plans/${planId}`, body);
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Update failed'));
  return data;
}

// ── Coaching management ────────────────────────────────────────────────────────

export interface AdminCoachingPlan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  duration_days: number;
  features: PlanFeature[] | null;
  is_active: boolean;
}

export interface AdminCoachingPlanPatch {
  name?: string;
  description?: string | null;
  price?: number | null;
  duration_days?: number;
  features?: PlanFeature[];
  is_active?: boolean;
}

export interface AdminCoachingClient {
  user_id: string;
  user_email: string;
  user_name?: string | null;
  status: 'active' | 'expired';
  started_at: string;
  expires_at: string;
  days_left: number;
  last_message_at?: string | null;
  unread_count?: number;
}

export interface AdminCoachingClientListResponse {
  items: AdminCoachingClient[];
  total: number;
  skip: number;
  limit: number;
}

export interface AdminCoachingClientDetail {
  user_id: string;
  user_email: string;
  user_name?: string | null;
  status: 'active' | 'expired';
  started_at: string;
  expires_at: string;
  days_left: number;
}

export interface AdminCoachingClientProfile {
  user_id: string;
  user_email: string;
  user_name?: string | null;
  gender?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  target_weight_kg?: number | null;
  activity_level?: string | null;
  goal?: string | null;
  target_calories?: number | null;
  target_protein?: number | null;
  target_fat?: number | null;
  target_carbs?: number | null;
  allergies?: string | null;
  cuisine_preferences?: string | null;
  budget_per_week?: number | null;
  cooking_time_minutes?: number | null;
}

export interface AdminCoachingMealLog {
  id: number;
  meal_type?: string | null;
  food_name?: string | null;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  portion_grams?: number | null;
  photo_url?: string | null;
  logged_at?: string | null;
  created_at?: string | null;
}

export interface AdminCoachingMealLogList {
  items: AdminCoachingMealLog[];
}

export interface AdminCoachingMealPlan {
  id?: number | null;
  plan_data?: string | null;
  week_start?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface AdminCoachingMessage {
  id: number;
  sender_role: 'client' | 'nutritionist';
  content: string;
  created_at: string;
}

export interface AdminCoachingMessagesPage {
  items: AdminCoachingMessage[];
  last_id: number;
}

export interface AdminCoachingExtendResponse {
  user_id: string;
  expires_at: string;
  days_left: number;
}

export async function adminGetCoachingPlan(): Promise<AdminCoachingPlan> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingPlan>('/api/v1/admin/coaching/plan');
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to load coaching plan'));
  return data;
}

export async function adminPatchCoachingPlan(
  body: AdminCoachingPlanPatch
): Promise<AdminCoachingPlan> {
  const api = getAdminApi();
  const { data, status } = await api.patch<AdminCoachingPlan>(
    '/api/v1/admin/coaching/plan',
    body
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Update failed'));
  return data;
}

export async function adminListCoachingClients(params: {
  skip?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'expired' | 'all';
}): Promise<AdminCoachingClientListResponse> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingClientListResponse>(
    '/api/v1/admin/coaching/clients',
    { params }
  );
  if (status !== 200) throw new Error('Failed to load coaching clients');
  return data;
}

export async function adminGetCoachingClient(
  userId: string
): Promise<AdminCoachingClientDetail> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingClientDetail>(
    `/api/v1/admin/coaching/clients/${userId}`
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Client not found'));
  return data;
}

export async function adminGetCoachingClientProfile(
  userId: string
): Promise<AdminCoachingClientProfile> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingClientProfile>(
    `/api/v1/admin/coaching/clients/${userId}/profile`
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to load profile'));
  return data;
}

export async function adminGetCoachingClientMealLogs(
  userId: string,
  params?: { date_from?: string; date_to?: string; limit?: number }
): Promise<AdminCoachingMealLogList> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingMealLogList>(
    `/api/v1/admin/coaching/clients/${userId}/meal-logs`,
    { params }
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to load meal logs'));
  return data;
}

export async function adminGetCoachingClientMealPlan(
  userId: string
): Promise<AdminCoachingMealPlan> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingMealPlan>(
    `/api/v1/admin/coaching/clients/${userId}/meal-plan`
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to load meal plan'));
  return data;
}

export async function adminFetchCoachingMessages(
  userId: string,
  afterId?: number
): Promise<AdminCoachingMessagesPage> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingMessagesPage>(
    `/api/v1/admin/coaching/clients/${userId}/messages`,
    { params: afterId ? { after: afterId } : {} }
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to load messages'));
  return data;
}

export async function adminSendCoachingMessage(
  userId: string,
  content: string
): Promise<AdminCoachingMessage> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminCoachingMessage>(
    `/api/v1/admin/coaching/clients/${userId}/messages`,
    { content }
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to send message'));
  return data;
}

export interface AdminCoachingUserCandidate {
  user_id: string;
  user_email: string;
  user_name?: string | null;
  user_role: string;
  is_active: boolean;
  coaching_status: 'none' | 'active' | 'expired';
  expires_at?: string | null;
  days_left: number;
}

export interface AdminCoachingUserCandidateList {
  items: AdminCoachingUserCandidate[];
  total: number;
  skip: number;
  limit: number;
}

export async function adminListAllUsersForCoaching(params: {
  skip?: number;
  limit?: number;
  search?: string;
  coaching_status?: 'none' | 'active' | 'expired';
  role?: 'user' | 'admin' | 'all';
}): Promise<AdminCoachingUserCandidateList> {
  const api = getAdminApi();
  const { data, status } = await api.get<AdminCoachingUserCandidateList>(
    '/api/v1/admin/coaching/all-users',
    { params }
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Failed to load users'));
  return data;
}

export async function adminActivateCoaching(
  userId: string,
  days?: number
): Promise<AdminCoachingExtendResponse> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminCoachingExtendResponse>(
    `/api/v1/admin/coaching/clients/${userId}/activate`,
    days ? { days } : {}
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Activation failed'));
  return data;
}

export async function adminExtendCoaching(
  userId: string,
  days: number
): Promise<AdminCoachingExtendResponse> {
  const api = getAdminApi();
  const { data, status } = await api.post<AdminCoachingExtendResponse>(
    `/api/v1/admin/coaching/clients/${userId}/extend`,
    {},
    { params: { days } }
  );
  if (status !== 200) throw new Error(apiErrorMessage(data, 'Extension failed'));
  return data;
}
