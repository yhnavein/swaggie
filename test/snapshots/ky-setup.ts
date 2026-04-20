/**
 * Ky client setup — GENERATED ONCE, will NOT be overwritten on subsequent runs.
 * Re-generate intentionally with: swaggie ... --clientSetup <path> --forceSetup
 *
 * This file configures the ky HTTP client used by the generated API client.
 * Because ky requires hooks to be provided at creation time, this file exports
 * a `createKyConfig()` function that is called by `initKyHttp()` in api.ts.
 *
 * Usage in your app:
 *   import { initKyHttp } from './clientsetup-ky-with-setup';
 *   initKyHttp(); // call once at startup, e.g. in a React provider or main.ts
 *
 * If you need to pass runtime values into hooks (e.g. an auth token getter),
 * store them in module-level variables and expose a configuration function:
 *
 *   let _getToken: () => Promise<string> = () => Promise.resolve('');
 *
 *   export function configureKyClient(opts: { getToken: () => Promise<string> }) {
 *     _getToken = opts.getToken;
 *   }
 *
 * Then call configureKyClient(...) before initKyHttp() at startup.
 */
import type { Options as KyOptions } from 'ky';

export type KySetupConfig = Pick<KyOptions, 'hooks' | 'prefix' | 'retry' | 'timeout'>;

/**
 * Returns the ky configuration used to create the HTTP client instance.
 * Called once by `initKyHttp()` in the generated api.ts.
 *
 * Add your hooks here — beforeRequest for auth/headers, afterResponse for
 * error handling and monitoring, beforeError for error enrichment.
 */
export function createKyConfig(): KySetupConfig {
  return {
    prefix: '',
    hooks: {
      beforeRequest: [
        // TODO: Add request hooks, e.g. attach an Authorization header:
        // async ({ request }) => {
        //   const token = await _getToken();
        //   if (token) request.headers.set('Authorization', `Bearer ${token}`);
        // },
      ],
      afterResponse: [
        // TODO: Add response hooks, e.g. handle 401 Unauthorized:
        // async ({ response }) => {
        //   if (response.status === 401) {
        //     await loginWithRedirect({ returnTo: window.location.toString() });
        //   }
        // },
      ],
      beforeError: [
        // TODO: Add error hooks, e.g. enrich errors with request context:
        // ({ error }) => error,
      ],
    },
  };
}
