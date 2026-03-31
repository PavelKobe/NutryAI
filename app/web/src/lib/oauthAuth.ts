import { getAPIBaseURL } from './config';

export function loginWithYandex(): void {
  const base = getAPIBaseURL().replace(/\/$/, '');
  window.location.href = `${base}/api/v1/auth/yandex`;
}
