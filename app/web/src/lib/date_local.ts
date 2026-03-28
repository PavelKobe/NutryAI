/**
 * Календарная дата в локальной TZ браузера (как видит пользователь), YYYY-MM-DD.
 * Не использовать toISOString().split('T')[0] — это UTC и ломает дашборд у MSK и др.
 */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localTodayKey(): string {
  return localDateKey(new Date());
}

/** logged_at с API (ISO или с пробелом) → локальный календарный день пользователя */
export function localDateKeyFromLoggedAt(iso: string | undefined | null): string | null {
  if (!iso || typeof iso !== 'string') return null;
  let t = Date.parse(iso);
  if (Number.isNaN(t) && !iso.includes('T')) {
    t = Date.parse(iso.replace(' ', 'T'));
  }
  if (Number.isNaN(t)) return null;
  return localDateKey(new Date(t));
}
