import { IngestionError } from './errors.js';
import { recognizeGreenhouse } from './greenhouse-url.js';
import { recognizeWorkday } from './workday-url.js';

export const PROVIDER_NAMES = /** @type {const} */ ({ greenhouse: 'Greenhouse', ashby: 'Ashby', lever: 'Lever', workday: 'Workday' });
export const INGESTION_METHODS = /** @type {const} */ ({ greenhouse: 'greenhouse-job-board-api', ashby: 'ashby-job-posting-api', lever: 'lever-postings-api', workday: 'workday-cxs-detail' });
const UUID = '[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}';
const ASHBY = new RegExp(`^/([A-Za-z0-9_-]{1,100})/(${UUID})(?:/application)?/?$`);
const LEVER = new RegExp(`^/([A-Za-z0-9_-]{1,100})/(${UUID})(?:/apply)?/?$`);

/** Unknown parameters remain intact. They are never forwarded upstream.
 * @param {URL} input @param {string} base @param {string[]} known
 */
function canonical(input, base, known) {
  const url = new URL(base);
  for (const [key, value] of input.searchParams) {
    if (!/^utm_/i.test(key) && !known.includes(key.toLowerCase())) url.searchParams.append(key, value);
  }
  return url.href;
}

/** URL recognition only; safe in the browser and independent of retrieval.
 * Posting identities are provider + board/site + region (Lever) + posting ID.
 * @param {string} input
 */
export function recognizePosting(input) {
  let url;
  try { url = new URL(input); } catch { throw new IngestionError('invalid_url', 'Enter a complete HTTPS job URL.'); }
  if (input.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new IngestionError('invalid_url', 'Use an HTTPS posting URL without credentials or a custom port.');
  }
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname)) return recognizeGreenhouse(input);
  if (url.hostname.endsWith('.myworkdayjobs.com') || url.hostname.endsWith('.myworkdaysite.com')) return recognizeWorkday(input);
  if (url.hostname === 'jobs.ashbyhq.com') {
    const match = ASHBY.exec(url.pathname);
    if (!match) throw new IngestionError('unsupported_url', 'Use an Ashby job detail URL, not a board listing.');
    const [, board, id] = match;
    const posting_id = id.toLowerCase();
    return { provider: /** @type {const} */ ('ashby'), board, posting_id,
      canonical_url: canonical(url, `https://jobs.ashbyhq.com/${board}/${posting_id}`, ['source', 'ashby_source']),
      retrieval_url: `https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true` };
  }
  if (['jobs.lever.co', 'jobs.eu.lever.co'].includes(url.hostname)) {
    const match = LEVER.exec(url.pathname);
    if (!match) throw new IngestionError('unsupported_url', 'Use a Lever job detail URL, not a board listing.');
    const [, board, id] = match;
    const posting_id = id.toLowerCase();
    const region = url.hostname === 'jobs.eu.lever.co' ? /** @type {const} */ ('eu') : /** @type {const} */ ('global');
    const apiHost = region === 'eu' ? 'api.eu.lever.co' : 'api.lever.co';
    return { provider: /** @type {const} */ ('lever'), board, posting_id, region,
      canonical_url: canonical(url, `https://${url.hostname}/${board}/${posting_id}`, ['source', 'lever-source', 'lever-origin', 'lever-via']),
      retrieval_url: `https://${apiHost}/v0/postings/${board}/${posting_id}?mode=json` };
  }
  throw new IngestionError('unsupported_url', 'URL import supports hosted Greenhouse, Ashby, Lever and limited Workday job links. Other sites can still be entered manually.');
}

/** Ignore tracking/unknown query differences when comparing a known posting.
 * @param {ReturnType<typeof recognizePosting>} a @param {ReturnType<typeof recognizePosting>} b
 */
export function samePosting(a, b) {
  return a.provider === b.provider && a.board === b.board && a.posting_id === b.posting_id &&
    ('region' in a ? a.region : null) === ('region' in b ? b.region : null);
}
