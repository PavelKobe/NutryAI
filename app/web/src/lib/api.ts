/* MetaGPTX SDK touches `window` at init — lazy-load only in the browser. */

import { getAPIBaseURL } from './config';
import { refreshToken } from './tokenRefresh';

const serverStub: unknown = new Proxy(
  function stubFn() {
    return Promise.resolve({ data: null });
  } as unknown as object,
  {
    apply: () => Promise.resolve({ data: null }),
    get: () => serverStub,
  }
);

function getRealClient(): ReturnType<
  typeof import('@metagptx/web-sdk').createClient
> {
  const { createClient } = require('@metagptx/web-sdk') as typeof import('@metagptx/web-sdk');
  const base = getAPIBaseURL().replace(/\/$/, '');
  return createClient({ baseURL: base });
}

let browserClient: ReturnType<
  typeof import('@metagptx/web-sdk').createClient
> | null = null;

/** SDK вшивает Bearer в axios только при createClient(); после логина токен в LS обновляется, а старый инстанс остаётся без заголовка → 401. */
let browserClientTokenSnapshot: string | null = null;

function currentStoredToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function getBrowserClient() {
  const tokenNow = currentStoredToken();
  if (!browserClient || browserClientTokenSnapshot !== tokenNow) {
    browserClient = getRealClient();
    browserClientTokenSnapshot = tokenNow;

    // Add 401 interceptor for automatic token refresh
    try {
      const axios = (browserClient as unknown as { defaults?: { adapter?: unknown }; interceptors?: { response?: { use: Function } } });
      if (axios.interceptors?.response?.use) {
        axios.interceptors.response.use(
          (res: unknown) => res,
          async (err: { response?: { status?: number }; config?: Record<string, unknown> }) => {
            if (
              err.response?.status === 401 &&
              err.config &&
              !(err.config as Record<string, unknown>)._retried
            ) {
              const newToken = await refreshToken();
              if (newToken) {
                // Mark as retried to prevent infinite loops
                (err.config as Record<string, unknown>)._retried = true;
                // Force client to pick up new token from localStorage
                browserClient = null;
                browserClientTokenSnapshot = null;
                const freshClient = getBrowserClient();
                const axiosInstance = freshClient as unknown as { request: (config: unknown) => Promise<unknown> };
                if (axiosInstance.request) {
                  return axiosInstance.request(err.config);
                }
              }
            }
            throw err;
          },
        );
      }
    } catch {
      // SDK may not expose axios interceptors — silent fail
    }
  }
  return browserClient;
}

export const client = new Proxy(
  {} as ReturnType<typeof import('@metagptx/web-sdk').createClient>,
  {
    get(_target, prop: string | symbol) {
      if (typeof window === 'undefined') {
        return (serverStub as Record<string | symbol, unknown>)[prop] ?? serverStub;
      }
      const real = getBrowserClient();
      const value = (real as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(real);
      }
      return value;
    },
  }
);
