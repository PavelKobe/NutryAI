let runtimeConfig: { API_BASE_URL: string } | null = null;
let configLoading = true;

const defaultConfig = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
};

export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        runtimeConfig = await response.json();
      }
    }
  } catch {
    /* use default */
  } finally {
    configLoading = false;
  }
}

export function getConfig() {
  if (configLoading) {
    return defaultConfig;
  }
  if (runtimeConfig) {
    return runtimeConfig;
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return { API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL };
  }
  return defaultConfig;
}

export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};
