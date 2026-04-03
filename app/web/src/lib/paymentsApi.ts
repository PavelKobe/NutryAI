/**
 * API-функции для работы с платежами YooKassa.
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

export interface PaymentCreateResponse {
  payment_id: string;
  confirmation_url: string;
}

export interface PaymentOut {
  id: string;
  status: string;
  amount_value: number;
  amount_currency: string;
  billing: string | null;
  description: string | null;
  yookassa_payment_id: string | null;
  confirmation_url: string | null;
  paid_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Создаёт платёж и возвращает URL для редиректа на YooKassa.
 */
export async function createPayment(
  billing: 'monthly' | 'yearly'
): Promise<PaymentCreateResponse> {
  const res = await fetch(apiUrl('/api/v1/payments/create'), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ billing }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Payment error: ${res.status}`
    );
  }

  return res.json();
}

/**
 * Возвращает список платежей текущего пользователя.
 */
export async function fetchMyPayments(): Promise<{
  items: PaymentOut[];
  total: number;
}> {
  const res = await fetch(apiUrl('/api/v1/payments/my'), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch payments: ${res.status}`);
  return res.json();
}

/**
 * Получает статус конкретного платежа.
 */
export async function fetchPayment(paymentId: string): Promise<PaymentOut> {
  const res = await fetch(apiUrl(`/api/v1/payments/${paymentId}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch payment: ${res.status}`);
  return res.json();
}
