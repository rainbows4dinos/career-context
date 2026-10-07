import { ingestGreenhouse } from './greenhouse.js';
import { IngestionError } from './greenhouse-url.js';
import { readBounded } from './bounded-fetch.js';

/** HTTP boundary; dependencies injected for deterministic function tests.
 * @param {{ownerId: string, allowedOrigins: string[], authenticate: (token: string, signal: AbortSignal) => Promise<string|null>, fetcher: typeof fetch, timeoutMs?: number}} options
 */
export function createIngestionHandler(options) {
  /** @param {Request} request */
  return async (request) => {
    const origin = request.headers.get('origin');
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (origin && options.allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    /** @param {unknown} body @param {number} [status] */
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(options.ownerId) || !options.allowedOrigins.length) {
      return reply({ error: { code: 'not_configured', message: 'URL import is not configured yet. Manual entry is still available.' } }, 503);
    }
    if (origin && !options.allowedOrigins.includes(origin)) return reply({ error: { code: 'origin_denied', message: 'This origin is not permitted.' } }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply({ error: { code: 'method_not_allowed', message: 'Use POST.' } }, 405);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    request.signal.addEventListener('abort', cancel, { once: true });
    if (request.signal.aborted) cancel();
    const timer = setTimeout(cancel, options.timeoutMs ?? 15000);
    try {
      const authorization = request.headers.get('authorization') ?? '';
      const token = /^Bearer ([^\s]{1,8192})$/i.exec(authorization)?.[1];
      if (!token) throw new IngestionError('unauthorized', 'Sign in to retrieve a posting.', 401);
      const owner = await options.authenticate(token, controller.signal);
      if (!owner) throw new IngestionError('unauthorized', 'Your session expired. Sign in again.', 401);
      if (owner !== options.ownerId) throw new IngestionError('forbidden', 'This account is not permitted to retrieve postings.', 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new IngestionError('invalid_request', 'Expected a JSON request.');
      const bodyText = await readBounded(request, 4096, controller.signal);
      let body;
      try { body = JSON.parse(bodyText); } catch { throw new IngestionError('invalid_request', 'Expected valid JSON.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'url') || typeof body.url !== 'string') {
        throw new IngestionError('invalid_request', 'Supply only a posting URL.');
      }
      const preview = await ingestGreenhouse(body.url.trim(), { fetcher: options.fetcher, signal: controller.signal });
      controller.signal.throwIfAborted();
      return reply(preview);
    } catch (error) {
      if (controller.signal.aborted) return reply({ error: { code: 'timeout', message: 'Retrieval timed out or was canceled. Try again or enter details manually.' } }, 504);
      if (error instanceof IngestionError) return reply({ error: { code: error.code, message: error.message } }, error.status);
      return reply({ error: { code: 'retrieval_failed', message: 'Could not retrieve this posting. Try again or add it manually.' } }, 502);
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort', cancel);
    }
  };
}

/** Verify actual user identity with Supabase Auth, never trust decoded claims alone.
 * Only a public key is needed; this component never has database privileges.
 * @param {{supabaseUrl: string, publishableKey: string}} config @param {typeof fetch} fetcher
 */
export function createAuthenticator(config, fetcher) {
  /** @param {string} token @param {AbortSignal} signal */
  return async (token, signal) => {
    const response = await fetcher(`${config.supabaseUrl}/auth/v1/user`, {
      redirect: 'manual', signal,
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    try {
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new IngestionError('auth_unavailable', 'Could not verify your session. Try again shortly.', 503);
      const user = JSON.parse(await readBounded(response, 32768, signal));
      return typeof user.id === 'string' && user.role === 'authenticated' && user.is_anonymous !== true ? user.id : null;
    } finally { await response.body?.cancel().catch(() => {}); }
  };
}
