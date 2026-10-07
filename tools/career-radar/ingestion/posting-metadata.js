import { Parser } from 'htmlparser2';
import { retrievePosting } from './bounded-fetch.js';
import { object, text } from './posting-facts.js';
import { recognizePosting, samePosting, PROVIDER_NAMES } from './posting-url.js';

/** Bounded JSON-LD parsing from a known ATS page only. No script execution,
 * resource loading, remote contexts, canonical-link following or DOM scraping.
 * @param {string} html @param {import('./preview.js').PostingIdentity} identity
 * @param {string|null} expectedTitle @param {string[]} warnings
 */
export function postingMetadata(html, identity, expectedTitle, warnings) {
  /** @type {unknown[]} */ const roots = [];
  let active = false, buffer = '', scripts = 0;
  const parser = new Parser({
    onopentag(name, attrs) { if (name === 'script') { active = /^application\/ld\+json(?:\s*;|$)/i.test(attrs.type ?? '') && scripts++ < 32; buffer = ''; } },
    ontext(value) { if (active) buffer += value; },
    onclosetag(name) { if (name === 'script' && active) { try { roots.push(JSON.parse(buffer)); } catch { warnings.push('A posting metadata block was malformed and ignored.'); } active = false; } }
  });
  parser.end(html);
  /** @type {Record<string,unknown>[]} */ const candidates = [];
  const queue = roots.map(value => ({ value, depth: 0 }));
  for (let index = 0; index < queue.length && index < 2000; index++) {
    const { value, depth } = queue[index];
    if (depth > 20) continue;
    if (Array.isArray(value)) { queue.push(...value.slice(0, 2000).map(value => ({ value, depth: depth + 1 }))); continue; }
    const item = object(value);
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (types.includes('JobPosting')) candidates.push(item);
    if (item['@graph']) queue.push({ value: item['@graph'], depth: depth + 1 });
  }
  const normalized = /** @param {string} value */ value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
  const matches = candidates.filter(item => {
    const id = text(object(item.identifier).value) ?? text(item.identifier);
    if (id && id.toLowerCase() !== identity.posting_id) return false;
    if (text(item.url)) {
      try { if (!samePosting(recognizePosting(String(item.url)), identity)) return false; }
      catch { return false; }
    }
    const title = text(item.title);
    if (expectedTitle && title && normalized(title) !== normalized(expectedTitle)) return false;
    return !!id || !!text(item.url) || !!(title && expectedTitle && normalized(title) === normalized(expectedTitle));
  });
  if (matches.length !== 1) {
    warnings.push('The hosted page had no unambiguous matching JobPosting metadata. Company remains missing; complete it manually.');
    return {};
  }
  return matches[0];
}

/** Optional employer metadata cannot discard already-supported API facts.
 * Cancellation/deadlines still abort the whole operation.
 * @param {import('./preview.js').PostingIdentity} identity @param {string|null} title
 * @param {{fetcher: typeof fetch, signal: AbortSignal}} options @param {string[]} warnings
 */
export async function retrieveMetadata(identity, title, options, warnings) {
  // Reconstruct a fixed hosted path, discarding all input query parameters.
  const host = identity.provider === 'ashby' ? 'jobs.ashbyhq.com' :
    identity.provider === 'lever' && identity.region === 'eu' ? 'jobs.eu.lever.co' : 'jobs.lever.co';
  const target = `https://${host}/${identity.board}/${identity.posting_id}`;
  try {
    const html = await retrievePosting(options.fetcher, target, options.signal, PROVIDER_NAMES[identity.provider], 'html');
    return postingMetadata(/** @type {string} */ (html), identity, title, warnings);
  } catch {
    options.signal.throwIfAborted();
    warnings.push('The hosted posting metadata could not be retrieved within the security/size limits. API facts are retained; complete Company manually.');
    return {};
  }
}
