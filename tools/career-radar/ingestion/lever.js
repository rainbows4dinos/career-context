import { IngestionError } from './errors.js';
import { recognizePosting, samePosting } from './posting-url.js';
import { retrievePosting } from './bounded-fetch.js';
import { retrieveMetadata } from './posting-metadata.js';
import { object, text, postingText, plainText, finishPreview } from './posting-facts.js';
import { normalizePatch } from '../model.js';

/** Validate a single response before optional metadata retrieval.
 * @param {unknown} input @param {import('./preview.js').PostingIdentity} identity
 */
export function validateLeverPosting(input, identity) {
  const raw = object(input);
  if (text(raw.id)?.toLowerCase() !== identity.posting_id) throw new IngestionError('invalid_posting', 'Lever returned a malformed or mismatched posting.', 502);
  if (text(raw.hostedUrl)) {
    try { if (!samePosting(recognizePosting(String(raw.hostedUrl)), identity)) throw new Error('Mismatch'); }
    catch { throw new IngestionError('invalid_posting', 'Lever returned conflicting posting identities.', 502); }
  }
  return raw;
}

/** @param {Record<string,unknown>} raw @param {string[]} warnings */
function description(raw, warnings) {
  const combined = postingText(raw.description, raw.descriptionPlain);
  const blocks = combined ? [combined] : [postingText(raw.opening, raw.openingPlain), postingText(raw.descriptionBody, raw.descriptionBodyPlain)].filter(Boolean);
  if (Array.isArray(raw.lists)) for (const value of raw.lists) {
    const list = object(value);
    const content = postingText(list.content, null);
    if (content) blocks.push([postingText(list.text, null), content].filter(Boolean).join('\n'));
    else warnings.push('A Lever description section had no supported content; review the posting manually.');
  }
  const closing = postingText(raw.additional, raw.additionalPlain);
  if (closing) blocks.push(closing);
  return blocks.join('\n\n') || null;
}

/** @param {Record<string,unknown>} raw @param {string[]} warnings */
function compensation(raw, warnings) {
  const range = object(raw.salaryRange);
  const parts = [];
  if (Object.keys(range).length) {
    if (typeof range.min === 'number' && typeof range.max === 'number' && Number.isFinite(range.min) && Number.isFinite(range.max) && range.min >= 0 && range.max >= range.min && text(range.currency)) {
      parts.push(`${String(range.currency)} ${range.min.toLocaleString('en-US')}–${range.max.toLocaleString('en-US')}${text(range.interval) ? ' · ' + String(range.interval) : ''}`);
      if (!text(range.interval)) warnings.push('Lever did not specify a pay interval. No annual/hourly interval was inferred.');
    } else warnings.push('An incomplete or invalid Lever salary range was omitted; review its salary description.');
  }
  const explanation = postingText(raw.salaryDescription, raw.salaryDescriptionPlain);
  if (explanation) parts.push(explanation);
  return parts.join('\n\n') || null;
}

/** @param {Record<string,unknown>} raw @param {import('./preview.js').PostingIdentity} identity
 * @param {Record<string,unknown>} metadata @param {string} originalUrl @param {Date} now
 * @param {string[]} [warnings] @param {string} [discoveredOn]
 */
export function normalizeLever(raw, identity, metadata, originalUrl, now, warnings = [], discoveredOn = now.toISOString().slice(0, 10)) {
  /** @type {import('../model.js').DetailsPatch} */
  const draft = { job_url: identity.canonical_url, discovered_on: discoveredOn };
  /** @type {Record<string,string>} */
  const sources = { job_url: 'Lever posting identity', discovered_on: 'First captured in Career Radar (UTC default)' };
  const company = postingText(object(metadata.hiringOrganization).name, null);
  const title = postingText(raw.text, null);
  if (company) { draft.company = company; sources.company = 'Hosted JobPosting.hiringOrganization.name'; }
  if (title) { draft.title = title; sources.title = 'text'; }
  const categories = object(raw.categories);
  const locations = [plainText(categories.location), ...(Array.isArray(categories.allLocations) ? categories.allLocations.map(plainText) : []), plainText(raw.country)].filter(Boolean);
  if (locations.length) { draft.location = [...new Set(locations)].join('; '); sources.location = 'categories.location/allLocations and supplied country'; }
  const arrangements = /** @type {const} */ ({ 'on-site': 'onsite', remote: 'remote', hybrid: 'hybrid' });
  const arrangement = typeof raw.workplaceType === 'string' && Object.hasOwn(arrangements, raw.workplaceType) ? arrangements[/** @type {keyof typeof arrangements} */ (raw.workplaceType)] : undefined;
  if (arrangement) { draft.work_arrangement = arrangement; sources.work_arrangement = 'workplaceType'; }
  const employment = plainText(categories.commitment);
  if (employment) { draft.employment_type = employment; sources.employment_type = 'categories.commitment'; }
  const details = description(raw, warnings);
  if (details) { draft.job_description = details; sources.job_description = 'Combined opening/body, lists and additional closing content (plain text)'; }
  const pay = compensation(raw, warnings);
  if (pay) { draft.compensation_text = pay; sources.compensation_text = 'salaryRange and salaryDescription; explicit interval only'; }
  // createdAt is not publication. Use only a matched page's explicit datePosted.
  const posted = text(metadata.datePosted);
  if (posted && /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(posted) && Number.isFinite(Date.parse(posted))) {
    try { normalizePatch({ posted_on: posted.slice(0, 10) }); draft.posted_on = posted.slice(0, 10); sources.posted_on = 'Matched hosted JobPosting.datePosted (source calendar date)'; }
    catch { warnings.push('Lever posting metadata has an invalid publication date; complete it manually.'); }
  } else if (posted) warnings.push('Lever posting metadata has an ambiguous publication date; complete it manually.');
  return finishPreview(draft, identity, originalUrl, now, sources, warnings, 'lever-postings-api');
}

/** @param {string} url @param {{fetcher: typeof fetch, signal: AbortSignal, now?: Date, discoveredOn?: string}} options */
export async function ingestLever(url, options) {
  const identity = recognizePosting(url);
  if (identity.provider !== 'lever') throw new IngestionError('unsupported_url', 'Use a Lever hosted posting link.');
  const raw = validateLeverPosting(await retrievePosting(options.fetcher, identity.retrieval_url, options.signal, 'Lever'), identity);
  /** @type {string[]} */ const warnings = [];
  const metadata = await retrieveMetadata(identity, text(raw.text), options, warnings);
  return normalizeLever(raw, identity, metadata, url, options.now ?? new Date(), warnings, options.discoveredOn);
}
