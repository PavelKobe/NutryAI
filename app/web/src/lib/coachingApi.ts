/**
 * API-функции для услуги «Личное сопровождение нутрициолога».
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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CoachingFeature {
  text: string;
  included: boolean;
}

export interface CoachingPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: CoachingFeature[] | null;
  is_active: boolean;
}

export interface CoachingStatus {
  has_active: boolean;
  status: 'none' | 'active' | 'expired';
  started_at: string | null;
  expires_at: string | null;
  days_left: number;
  plan: CoachingPlan;
}

export interface CoachingPaymentCreateResponse {
  payment_id: string;
  confirmation_url: string;
}

export interface CoachingMessage {
  id: number;
  sender_role: 'client' | 'nutritionist';
  content: string;
  created_at: string;
}

export interface CoachingMessagesPage {
  items: CoachingMessage[];
  last_id: number;
}

export class CoachingError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ─── Query keys ─────────────────────────────────────────────────────────────

export const coachingPlanKey = ['coaching', 'plan'] as const;
export const coachingStatusKey = ['coaching', 'status'] as const;
export const coachingMessagesKey = (afterId: number = 0) =>
  ['coaching', 'messages', afterId] as const;

// ─── API calls ──────────────────────────────────────────────────────────────

export async function fetchCoachingPlan(): Promise<CoachingPlan> {
  const res = await fetch(apiUrl('/api/v1/coaching/plan'), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch coaching plan: ${res.status}`);
  return res.json();
}

export async function fetchCoachingStatus(): Promise<CoachingStatus> {
  const res = await fetch(apiUrl('/api/v1/coaching/status'), {
    headers: authHeaders(),
  });
  if (!res.ok)
    throw new Error(`Failed to fetch coaching status: ${res.status}`);
  return res.json();
}

export async function createCoachingPayment(): Promise<CoachingPaymentCreateResponse> {
  const res = await fetch(apiUrl('/api/v1/coaching/payments/create'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Payment error: ${res.status}`
    );
  }
  return res.json();
}

export async function fetchCoachingMessages(
  afterId?: number
): Promise<CoachingMessagesPage> {
  const url = new URL(apiUrl('/api/v1/coaching/messages'));
  if (afterId !== undefined && afterId > 0) {
    url.searchParams.set('after', String(afterId));
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok)
    throw new Error(`Failed to fetch coaching messages: ${res.status}`);
  return res.json();
}

export async function sendCoachingMessage(
  content: string
): Promise<CoachingMessage> {
  const res = await fetch(apiUrl('/api/v1/coaching/messages'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: { error?: string; message?: string } | string })
      .detail;
    if (detail && typeof detail === 'object') {
      throw new CoachingError(
        detail.message || `Coaching error: ${res.status}`,
        res.status,
        detail.error
      );
    }
    throw new CoachingError(
      typeof detail === 'string' ? detail : `Coaching error: ${res.status}`,
      res.status
    );
  }
  return res.json();
}
