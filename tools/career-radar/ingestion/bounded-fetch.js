import { IngestionError } from './errors.js';

/** Enforce limits on streamed, decoded bytes, not just Content-Length.
 * @param {Request|Response} value @param {number} limit @param {AbortSignal} signal
 */
export async function readBounded(value, limit, signal) {
  if (Number(value.headers.get('content-length')) > limit) throw new IngestionError('too_large', 'The request or posting is too large.', 413);
  const reader = value.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const decoder = new TextDecoder();
  let text = '';
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value: chunk } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += chunk.byteLength;
      if (size > limit) throw new IngestionError('too_large', 'The request or posting is too large.', 413);
      text += decoder.decode(chunk, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Destinations must be constructed by the provider adapter, never upstream HTML.
 * @param {typeof fetch} fetcher @param {string} url @param {AbortSignal} signal
 * @param {string} [provider] @param {'json'|'html'} [format]
 */
export async function retrievePosting(fetcher, url, signal, provider = 'Greenhouse', format = 'json') {
  const response = await fetcher(url, {
    method: 'GET', redirect: 'manual', signal, headers: { Accept: format === 'json' ? 'application/json' : 'text/html' }
  });
  try {
    if (response.status === 404 || response.status === 410) throw new IngestionError('unavailable', 'This posting is unavailable or has expired. Add it manually if you have its details.', 404);
    if (response.status === 429) throw new IngestionError('upstream_busy', `${provider} is limiting requests. Try again later or enter the details manually.`, 503);
    if (response.status >= 300 && response.status < 400) throw new IngestionError('redirect_blocked', `${provider} redirected this request. Redirects are not supported; use a hosted posting link.`, 502);
    if (!response.ok) throw new IngestionError('retrieval_failed', `${provider} could not retrieve this posting. Try again or add it manually.`, 502);
    if (!response.headers.get('content-type')?.toLowerCase().includes(format === 'json' ? 'application/json' : 'text/html')) throw new IngestionError('invalid_posting', `${provider} returned an unexpected response.`, 502);
    const text = await readBounded(response, 1024 * 1024, signal);
    if (format === 'html') return text;
    try { return /** @type {unknown} */ (JSON.parse(text)); }
    catch { throw new IngestionError('invalid_posting', `${provider} returned invalid posting data.`, 502); }
  } finally { await response.body?.cancel().catch(() => {}); }
}
