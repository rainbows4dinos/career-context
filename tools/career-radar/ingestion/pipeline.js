import { recognizePosting } from './posting-url.js';
import { ingestGreenhouse } from './greenhouse.js';
import { ingestAshby } from './ashby.js';
import { ingestLever } from './lever.js';

/** Shared entry, independent of UI, authentication and writes.
 * @param {string} url @param {{fetcher: typeof fetch, signal: AbortSignal, now?: Date, discoveredOn?: string}} options
 */
export function ingestPosting(url, options) {
  const identity = recognizePosting(url);
  const adapter = { greenhouse: ingestGreenhouse, ashby: ingestAshby, lever: ingestLever }[identity.provider];
  return adapter(url, options);
}
