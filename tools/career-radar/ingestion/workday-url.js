import { IngestionError } from './errors.js';

// Only clusters exercised in the compatibility spike. Expanding this set needs
// a public detail smoke check; do not accept arbitrary Workday-looking hosts.
const CLUSTERS = new Set(['1', '3', '5', '103']);
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const ANCHOR = /^[A-Za-z0-9][A-Za-z0-9_-]{0,350}_[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;
const TENANT_HOST = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.wd([1-9][0-9]{0,2})\.myworkdayjobs\.com$/;
const SHARED_HOST = /^wd([1-9][0-9]{0,2})\.myworkdaysite\.com$/;

/** Recognize public detail URLs only. Never resolve an upstream URL hint.
 * @param {string} input
 */
export function recognizeWorkday(input) {
  let url;
  try { url = new URL(input); } catch { throw new IngestionError('invalid_url', 'Enter a complete HTTPS job URL.'); }
  if (input.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port || input.includes('\\') || /\/(?:\.|%2e){1,2}(?=[/?#]|$)/i.test(input)) {
    throw new IngestionError('invalid_url', 'Use an HTTPS posting URL without credentials, custom ports or traversal.');
  }
  const hosted = TENANT_HOST.exec(url.hostname), shared = SHARED_HOST.exec(url.hostname);
  const cluster = hosted?.[2] ?? shared?.[1];
  const unsupported = () => new IngestionError('unsupported_url', 'Use a public Workday job detail link on a supported wd1, wd3, wd5 or wd103 hosted site. Custom domains and other routes are not supported.');
  if (!cluster || !CLUSTERS.has(cluster)) throw unsupported();
  let parts;
  try { parts = url.pathname.replace(/\/$/, '').split('/').slice(1).map(decodeURIComponent); }
  catch { throw new IngestionError('invalid_url', 'The Workday URL contains invalid encoding.'); }
  if (parts.some(part => !part || /[/\\%]/.test(part) || [...part].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) || part === '.' || part === '..')) throw unsupported();
  if (/^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(parts[0] ?? '')) parts.shift();
  let tenant = hosted?.[1];
  if (shared) {
    if (parts.shift() !== 'recruiting') throw unsupported();
    tenant = parts.shift();
  }
  const site = parts.shift();
  if (!tenant || !TOKEN.test(tenant) || !site || !TOKEN.test(site) || parts.shift() !== 'job' || ![1, 2].includes(parts.length)) throw unsupported();
  const anchor = parts.at(-1);
  if (!anchor || !ANCHOR.test(anchor) || (parts.length === 2 && (parts[0].length > 200 || !/^[\p{L}\p{N} _.,()-]+$/u.test(parts[0])))) throw unsupported();
  const detailPath = '/job/' + parts.map(encodeURIComponent).join('/');
  const publicRoot = shared ? `/recruiting/${tenant}/${site}` : `/${site}`;
  const canonical = new URL(`https://${url.hostname}${publicRoot}${detailPath}`);
  for (const [key, value] of url.searchParams) {
    if (!/^utm_/i.test(key) && !['source', 'sourceid'].includes(key.toLowerCase())) canonical.searchParams.append(key, value);
  }
  return {
    provider: /** @type {const} */ ('workday'),
    // Preserve host/environment/site boundaries. Location and locale are aliases,
    // not identity; case-insensitive anchors retain their complete repost suffix.
    board: `${url.hostname}/${tenant}/${site}`, posting_id: anchor.toLowerCase(),
    canonical_url: canonical.href,
    retrieval_url: `https://${url.hostname}/wday/cxs/${tenant}/${site}${detailPath}`,
    metadata_url: `https://${url.hostname}${publicRoot}${detailPath}`, site
  };
}

/** @param {ReturnType<typeof recognizeWorkday>} a @param {ReturnType<typeof recognizeWorkday>} b */
export function sameWorkdayPosting(a, b) { return a.board === b.board && a.posting_id === b.posting_id; }
