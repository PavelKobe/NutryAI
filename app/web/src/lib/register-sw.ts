/**
 * Регистрирует Service Worker (`/sw.js`).
 *
 * Раньше работал только в production. Теперь регистрирует и в dev — это нужно
 * для тестирования Web Push через HTTPS-туннель (ngrok). Локальный http://localhost
 * также допускается — браузеры разрешают SW и Push на localhost.
 *
 * Можно отключить через `NEXT_PUBLIC_DISABLE_SW=1`.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (process.env.NEXT_PUBLIC_DISABLE_SW === '1') {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

/** Возвращает активную SW-регистрацию, ждёт её готовности. */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.error('SW ready failed:', err);
    return null;
  }
}
