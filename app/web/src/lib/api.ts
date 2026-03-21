/* MetaGPTX SDK touches `window` at init — lazy-load only in the browser. */

import { getAPIBaseURL } from './config';

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

function getBrowserClient() {
  if (!browserClient) {
    browserClient = getRealClient();
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
