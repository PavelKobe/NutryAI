/**
 * API-функции для работы с подписками.
 * Использует прямые fetch-запросы с Bearer-токеном из localStorage.
 */

import { getAPIBaseURL } from './config';

function apiUrl(path: string): string {
  const base = getAPIBaseURL().replace(/\/$/, '');
  return `${base}${path}`;
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number | null;
  price_yearly: number | null;
  daily_ai_limit: number;
  trial_days: number | null;
}

export interface UserSubscriptionStatus {
  plan_id: string;
  plan_name: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  ai_requests_today: number;
  daily_ai_limit: number;
  requests_date: string;
  is_expired: boolean;
}

export interface SubscriptionStatusResponse {
  subscription: UserSubscriptionStatus;
  plans: SubscriptionPlan[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Текущая подписка авторизованного пользователя + список всех тарифов.
 * Требует Bearer-токен.
 */
export async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const res = await fetch(apiUrl('/api/v1/subscription/status'), {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch subscription status: ${res.status}`);
  }
  return res.json();
}

/**
 * Публичный список тарифных планов (без авторизации).
 */
export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const res = await fetch(apiUrl('/api/v1/subscription/plans'));
  if (!res.ok) {
    throw new Error(`Failed to fetch plans: ${res.status}`);
  }
  return res.json();
}
