/**
 * Web Push API + Badging API helpers.
 *
 * Поддерживает оба контекста — пользовательский (`/api/v1/push/*`,
 * `localStorage.token`) и админский (`/api/v1/admin/push/*`,
 * `sessionStorage.nutri_admin_token`). Контекст выбирается по
 * `window.location.pathname.startsWith('/admin')`.
 */

import { getAPIBaseURL } from './config';
import { getServiceWorkerRegistration } from './register-sw';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UnreadCounts {
  coaching_unread: number;
}

export type PushPermission = 'default' | 'granted' | 'denied';

export const coachingUnreadKey = ['coaching-unread'] as const;

// ─── Detection helpers ──────────────────────────────────────────────────────

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS legacy: navigator.standalone (нестандартное поле)
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return false;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

export function isIOSWithoutPWA(): boolean {
  return isIOS() && !isPWAInstalled();
}

/** Chrome / Edge / Yandex / Opera / Brave / Arc — все на базе Chromium. */
export function isChromiumLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // Исключаем iOS-браузеры (CriOS, FxiOS) — они на WebKit и не дают beforeinstallprompt
  if (/CriOS|FxiOS|EdgiOS/i.test(ua)) return false;
  return /Chrome|Chromium|Edg|YaBrowser|OPR|Brave/i.test(ua);
}

export function getPermission(): PushPermission {
  if (typeof Notification === 'undefined') return 'default';
  return Notification.permission as PushPermission;
}

// ─── HTTP helpers ───────────────────────────────────────────────────────────

function isAdminContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/admin');
}

function pickToken(): string | null {
  if (typeof window === 'undefined') return null;
  if (isAdminContext()) {
    try {
      return sessionStorage.getItem('nutri_admin_token');
    } catch {
      return null;
    }
  }
  return localStorage.getItem('token');
}

function apiBase(): string {
  const base = getAPIBaseURL().replace(/\/$/, '');
  return isAdminContext() ? `${base}/api/v1/admin/push` : `${base}/api/v1/push`;
}

function authHeaders(): HeadersInit {
  const token = pickToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── VAPID key cache ────────────────────────────────────────────────────────

let cachedPublicKey: string | null = null;

export async function getVapidPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await fetch(`${apiBase()}/vapid-public-key`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to get VAPID public key: ${res.status}`);
  }
  const data = (await res.json()) as { public_key: string };
  cachedPublicKey = data.public_key;
  return cachedPublicKey;
}

// ─── Encoding helpers ───────────────────────────────────────────────────────

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    out[i] = rawData.charCodeAt(i);
  }
  return out;
}

function bufToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Subscription ──────────────────────────────────────────────────────────

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const reg = await getServiceWorkerRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function ensurePermission(): Promise<PushPermission> {
  if (typeof Notification === 'undefined') return 'default';
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    return result as PushPermission;
  }
  return Notification.permission as PushPermission;
}

export async function subscribeUser(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push не поддерживается этим браузером');
  }

  const perm = await ensurePermission();
  if (perm !== 'granted') {
    throw new Error('Permission not granted');
  }

  const reg = await getServiceWorkerRegistration();
  if (!reg) throw new Error('Service Worker не зарегистрирован');

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await sendSubscriptionToBackend(existing);
    return existing;
  }

  const publicKey = await getVapidPublicKey();
  // Cast: TS 5.7+ generic Uint8Array<ArrayBufferLike> не сужается до BufferSource
  // автоматически. Run-time это валидный Uint8Array<ArrayBuffer>.
  const applicationServerKey = urlBase64ToUint8Array(publicKey) as BufferSource;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  await sendSubscriptionToBackend(sub);
  return sub;
}

export async function unsubscribeUser(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  try {
    await removeSubscriptionFromBackend(sub.endpoint);
  } catch (err) {
    console.warn('Failed to unsubscribe on server:', err);
  }
  await sub.unsubscribe();
}

export async function sendSubscriptionToBackend(
  sub: PushSubscription
): Promise<void> {
  const json = sub.toJSON();
  const keys = (json.keys || {}) as Record<string, string>;
  // На некоторых платформах sub.toJSON().keys может быть пустой
  const p256dh =
    keys.p256dh || bufToBase64Url(sub.getKey ? sub.getKey('p256dh') : null);
  const auth =
    keys.auth || bufToBase64Url(sub.getKey ? sub.getKey('auth') : null);

  const body = {
    endpoint: sub.endpoint,
    keys: { p256dh, auth },
    user_agent:
      typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
  };

  const res = await fetch(`${apiBase()}/subscribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to register push subscription: ${res.status}`);
  }
}

export async function removeSubscriptionFromBackend(
  endpoint: string
): Promise<void> {
  await fetch(`${apiBase()}/unsubscribe`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ endpoint }),
  });
}

// ─── Badging API ────────────────────────────────────────────────────────────

export async function setBadgeCount(n: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (n > 0 && typeof nav.setAppBadge === 'function') {
      await nav.setAppBadge(n);
    } else if (typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge();
    }
  } catch {
    // ignore — Badging API недоступен
  }
}

// ─── Counters & mark-read ───────────────────────────────────────────────────

export async function fetchUnreadCounts(): Promise<UnreadCounts> {
  const res = await fetch(`${apiBase()}/unread-counts`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch unread counts: ${res.status}`);
  }
  return res.json();
}

export async function markCoachingRead(opts?: {
  clientId?: string;
}): Promise<number> {
  const body = opts?.clientId ? { client_id: opts.clientId } : {};
  const res = await fetch(`${apiBase()}/coaching/mark-read`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { updated: number };
  return data.updated || 0;
}

export async function sendTestPush(
  title?: string,
  body?: string
): Promise<{ sent: number }> {
  const res = await fetch(`${apiBase()}/test`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    throw new Error(`Test push failed: ${res.status}`);
  }
  return res.json();
}
