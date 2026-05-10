import { getAPIBaseURL } from './config';

function apiUrl(path: string): string {
  const base = getAPIBaseURL().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function detailMessage(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (typeof e === 'object' && e && 'msg' in e ? String((e as { msg: string }).msg) : String(e))).join('; ');
  }
  if (detail && typeof detail === 'object' && 'message' in detail) return String((detail as { message: string }).message);
  return 'Ошибка запроса';
}

export type RegisterResult = { verification_token: string; email: string };

export async function registerWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<RegisterResult> {
  const r = await fetch(apiUrl('/api/v1/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: name || undefined }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(detailMessage(data.detail) || r.statusText);
  }
  return data as RegisterResult;
}

/**
 * Thrown by `loginWithEmail` when the server reports the account exists but
 * the email has not been verified yet. The caller should redirect the user
 * to /verify-email?token=<verification_token>.
 */
export class EmailNotVerifiedError extends Error {
  verificationToken: string;
  emailAddress: string;
  constructor(verificationToken: string, emailAddress: string) {
    super('Email не подтверждён');
    this.name = 'EmailNotVerifiedError';
    this.verificationToken = verificationToken;
    this.emailAddress = emailAddress;
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ token: string; expires_at: number }> {
  const r = await fetch(apiUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 403 && data?.detail && typeof data.detail === 'object' && data.detail.code === 'email_not_verified') {
    throw new EmailNotVerifiedError(String(data.detail.verification_token), String(data.detail.email || email));
  }
  if (!r.ok) {
    throw new Error(detailMessage(data.detail) || r.statusText);
  }
  return data;
}

export type VerifyEmailError =
  | { kind: 'invalid'; attemptsRemaining: number }
  | { kind: 'expired' }
  | { kind: 'locked' }
  | { kind: 'not_found' }
  | { kind: 'token_invalid' }
  | { kind: 'unknown'; message: string };

export class VerifyEmailFailure extends Error {
  info: VerifyEmailError;
  constructor(info: VerifyEmailError, message: string) {
    super(message);
    this.name = 'VerifyEmailFailure';
    this.info = info;
  }
}

export async function verifyEmail(
  verificationToken: string,
  code: string
): Promise<{ token: string; expires_at: number }> {
  const r = await fetch(apiUrl('/api/v1/auth/verify-email'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_token: verificationToken, code }),
  });
  const data = await r.json().catch(() => ({}));
  if (r.ok) {
    return data;
  }
  // Map server outcomes to typed failures so the UI can render specific messages.
  if (r.status === 400 && data?.detail && typeof data.detail === 'object' && data.detail.code === 'invalid_code') {
    const remaining = Number(data.detail.attempts_remaining ?? 0);
    throw new VerifyEmailFailure(
      { kind: 'invalid', attemptsRemaining: remaining },
      `Неверный код${remaining > 0 ? ` (осталось попыток: ${remaining})` : ''}`,
    );
  }
  if (r.status === 410) {
    throw new VerifyEmailFailure({ kind: 'expired' }, 'Срок действия кода истёк, запросите новый');
  }
  if (r.status === 429) {
    throw new VerifyEmailFailure({ kind: 'locked' }, 'Слишком много попыток, запросите новый код');
  }
  if (r.status === 404) {
    throw new VerifyEmailFailure({ kind: 'not_found' }, 'Код не найден, запросите новый');
  }
  if (r.status === 401) {
    throw new VerifyEmailFailure({ kind: 'token_invalid' }, 'Сессия подтверждения истекла, начните регистрацию заново');
  }
  throw new VerifyEmailFailure({ kind: 'unknown', message: detailMessage(data.detail) || r.statusText }, detailMessage(data.detail) || r.statusText);
}

export class ResendCooldownError extends Error {
  canResendAt: number | null;
  constructor(canResendAt: number | null) {
    super('Подождите перед повторной отправкой');
    this.name = 'ResendCooldownError';
    this.canResendAt = canResendAt;
  }
}

export async function resendVerification(verificationToken: string): Promise<void> {
  const r = await fetch(apiUrl('/api/v1/auth/resend-verification'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_token: verificationToken }),
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 429 && data?.detail && typeof data.detail === 'object' && data.detail.code === 'resend_cooldown') {
    const ts = data.detail.can_resend_at;
    throw new ResendCooldownError(typeof ts === 'number' ? ts : null);
  }
  if (!r.ok) {
    throw new Error(detailMessage(data.detail) || r.statusText);
  }
}

export function persistSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('isLougOutManual', 'false');
}
