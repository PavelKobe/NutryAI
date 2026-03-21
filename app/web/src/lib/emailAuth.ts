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

export async function registerWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<{ token: string; expires_at: number }> {
  const r = await fetch(apiUrl('/api/v1/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: name || undefined }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(detailMessage(data.detail) || r.statusText);
  }
  return data;
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
  if (!r.ok) {
    throw new Error(detailMessage(data.detail) || r.statusText);
  }
  return data;
}

export function persistSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('isLougOutManual', 'false');
}
