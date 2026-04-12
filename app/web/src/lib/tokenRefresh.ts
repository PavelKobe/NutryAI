/**
 * Silent token refresh: при 401 отправляет старый JWT на /auth/refresh,
 * получает новый токен и сохраняет в localStorage.
 *
 * Используется как обёртка для fetch — при 401 автоматически обновляет токен
 * и повторяет запрос один раз.
 */

import { getAPIBaseURL } from './config';

let refreshPromise: Promise<string | null> | null = null;

/**
 * Попытаться обновить токен через /auth/refresh.
 * Если несколько запросов получили 401 одновременно — все ждут один refresh.
 */
export async function refreshToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefresh(): Promise<string | null> {
  const oldToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!oldToken) return null;

  try {
    const base = getAPIBaseURL().replace(/\/$/, '');
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oldToken}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Обёртка для fetch с автоматическим refresh при 401.
 * Использование: вместо fetch(url, opts) → authFetch(url, opts)
 */
export async function authFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, init);

  if (res.status !== 401) return res;

  // Попробовать обновить токен
  const newToken = await refreshToken();
  if (!newToken) return res;

  // Повторить запрос с новым токеном
  const newHeaders = new Headers(init?.headers);
  newHeaders.set('Authorization', `Bearer ${newToken}`);
  return fetch(url, { ...init, headers: newHeaders });
}
