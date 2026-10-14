import { IngestionError } from './errors.js';
import { recognizeWorkable } from './workable-url.js';
import { retrievePosting } from './bounded-fetch.js';
import { object, text, plainText, postingText, finishPreview } from './posting-facts.js';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** @param {unknown} input @param {ReturnType<typeof recognizeWorkable>} identity */
export function validateWorkablePosting(input, identity) {
  const raw = object(input);
  if (raw.shortcode !== identity.posting_id || typeof raw.state !== 'string' || typeof raw.isInternal !== 'boolean' || typeof raw.accountUid !== 'string' || !UUID.test(raw.accountUid)) {
    throw new IngestionError('invalid_posting', 'Workable returned a malformed or mismatched posting.', 502);
  }
  if (raw.state !== 'published' || raw.isInternal) throw new IngestionError('unavailable', 'This Workable posting is not publicly available. Add it manually if you have its details.', 404);
  return raw;
}

/** Never infer an employer from a slug or accept conflicting account metadata.
 * @param {unknown} input @param {Record<string,unknown>} job @param {ReturnType<typeof recognizeWorkable>} identity */
export function validateWorkableAccount(input, job, identity) {
  const account = object(input);
  if (account.subdomain !== identity.board || typeof account.uid !== 'string' || account.uid !== job.accountUid) {
    throw new IngestionError('invalid_posting', 'Workable returned conflicting company and posting identities.', 502);
  }
  return account;
}

/** @param {Record<string,unknown>} raw @param {string[]} warnings */
function location(raw, warnings) {
  // Only explicitly public entries are used. An absent list's primary location
  // has no separate visibility marker in the observed public detail contract.
  const entries = Array.isArray(raw.locations) ? raw.locations.map(object).filter(item => {
    if (item.hidden === false) return true;
    if (item.hidden !== true) warnings.push('A Workable location had ambiguous visibility and was omitted.');
    return false;
  }) : object(raw.location).hidden === true ? [] : [object(raw.location)];
  return [...new Set(entries.map(item => [...new Set([plainText(item.city), plainText(item.region), plainText(item.country)].filter(Boolean))].join(', ')).filter(Boolean))].join('; ') || null;
}

/** @param {Record<string,unknown>} raw @param {ReturnType<typeof recognizeWorkable>} identity
 * @param {Record<string,unknown>} account @param {string} originalUrl @param {Date} now
 * @param {string[]} [warnings] @param {string} [discoveredOn] */
export function normalizeWorkable(raw, identity, account, originalUrl, now, warnings = [], discoveredOn = now.toISOString().slice(0, 10)) {
  /** @type {import('../model.js').DetailsPatch} */
  const draft = { job_url: identity.canonical_url, discovered_on: discoveredOn };
  /** @type {Record<string,string>} */
  const sources = { job_url: 'Workable account and shortcode identity', discovered_on: 'First captured in Prospect Tracker (UTC default)' };
  const company = plainText(account.name), title = plainText(raw.title);
  if (company) { draft.company = company; sources.company = 'Matched public account.name'; }
  if (title) { draft.title = title; sources.title = 'title'; }
  const place = location(raw, warnings);
  if (place) { draft.location = place; sources.location = 'Public locations city/region/country; primary location only when locations is absent'; }
  const sections = [['description', 'Description'], ['requirements', 'Requirements'], ['benefits', 'Benefits']].flatMap(([key, label]) => {
    const content = postingText(raw[key], null);
    return content ? [`${label}\n\n${content}`] : [];
  });
  if (sections.length) { draft.job_description = sections.join('\n\n'); sources.job_description = 'description, requirements and benefits (complete plain-text sections)'; }
  const arrangements = /** @type {const} */ ({ remote: 'remote', hybrid: 'hybrid', on_site: 'onsite' });
  const arrangement = typeof raw.workplace === 'string' && Object.hasOwn(arrangements, raw.workplace) ? arrangements[/** @type {keyof typeof arrangements} */ (raw.workplace)] : undefined;
  if (arrangement === 'remote' && raw.remote === false || arrangement === 'onsite' && raw.remote === true) warnings.push('Workable workplace and remote flags conflict. Work arrangement is left blank for review.');
  else if (arrangement) { draft.work_arrangement = arrangement; sources.work_arrangement = 'workplace'; }
  else if (!text(raw.workplace) && raw.remote === true) { draft.work_arrangement = 'remote'; sources.work_arrangement = 'remote=true'; }
  else if (text(raw.workplace)) warnings.push('Workable supplied an unsupported workplace value. Complete work arrangement manually.');
  // Only the employment code verified in the spike is mapped.
  if (raw.type === 'full') { draft.employment_type = 'Full-time'; sources.employment_type = 'type=full'; }
  else if (text(raw.type)) warnings.push('Workable supplied an unsupported employment type. Complete it manually.');
  if (text(raw.published)) warnings.push(`Workable reports published at ${String(raw.published)}. This may be a republication; Posted date is left blank for review.`);
  return finishPreview(draft, identity, originalUrl, now, sources, warnings, 'workable-public-job-detail');
}

/** @param {string} url @param {{fetcher: typeof fetch, signal: AbortSignal, now?: Date, discoveredOn?: string}} options */
export async function ingestWorkable(url, options) {
  const identity = recognizeWorkable(url);
  // Map access denials without changing existing providers' error behavior.
  /** @type {typeof fetch} */
  const fetcher = async (target, init) => {
    const response = await options.fetcher(target, init);
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel().catch(() => {});
      throw new IngestionError('inaccessible', 'Workable denied access to this public posting. Try later or enter it manually.', 502);
    }
    return response;
  };
  const raw = validateWorkablePosting(await retrievePosting(fetcher, identity.retrieval_url, options.signal, 'Workable'), identity);
  /** @type {string[]} */ const warnings = [];
  /** @type {Record<string,unknown>} */ let account = {};
  let metadata;
  try {
    metadata = await retrievePosting(fetcher, `https://apply.workable.com/api/v1/accounts/${identity.board}?full=true`, options.signal, 'Workable');
  } catch {
    options.signal.throwIfAborted();
    warnings.push('Workable company metadata could not be retrieved within security/size limits. Posting facts are retained; complete Company manually.');
  }
  // Valid JSON with a missing/conflicting account binding is a hard failure.
  if (metadata !== undefined) account = validateWorkableAccount(metadata, raw, identity);
  options.signal.throwIfAborted();
  return normalizeWorkable(raw, identity, account, url, options.now ?? new Date(), warnings, options.discoveredOn);
}
