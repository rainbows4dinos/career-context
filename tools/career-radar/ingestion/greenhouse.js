import { descriptionText } from './posting-facts.js';
export { descriptionText } from './posting-facts.js';
import { normalizePatch } from '../model.js';
import { IngestionError, recognizeGreenhouse } from './greenhouse-url.js';
import { retrievePosting } from './bounded-fetch.js';

/** @typedef {import('./preview.js').IngestionPreview} IngestionPreview */

/** @param {unknown} value */
function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? /** @type {Record<string,unknown>} */ (value) : {}; }
/** @param {unknown} value */
function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }

/** Pure normalization; never reads or writes prospects. Unknown facts stay absent.
 * @param {unknown} input @param {ReturnType<typeof recognizeGreenhouse>} identity
 * @param {string} originalUrl @param {Date} now @param {string} [discoveredOn]
 * @returns {IngestionPreview}
 */
export function normalizeGreenhouse(input, identity, originalUrl, now, discoveredOn = now.toISOString().slice(0, 10)) {
  const raw = object(input);
  if (String(raw.id) !== identity.posting_id) throw new IngestionError('invalid_posting', 'The returned posting does not match the requested job.', 502);
  /** @type {import('../model.js').DetailsPatch} */
  const draft = { job_url: identity.canonical_url, discovered_on: discoveredOn };
  /** @type {Record<string,string>} */
  const fieldSources = { job_url: 'Greenhouse posting identity', discovered_on: 'First captured in Career Radar (UTC default)' };
  const warnings = [];
  const company = text(raw.company_name), title = text(raw.title), location = text(object(raw.location).name);
  if (company && descriptionText(company)) { draft.company = descriptionText(company); fieldSources.company = 'company_name'; }
  if (title && descriptionText(title)) { draft.title = descriptionText(title); fieldSources.title = 'title'; }
  if (location) { draft.location = descriptionText(location); fieldSources.location = 'location.name'; }
  const description = text(raw.content);
  if (description) { draft.job_description = descriptionText(description) || null; fieldSources.job_description = 'content (plain text)'; }
  const arrangements = location ? ['remote', 'hybrid', 'onsite'].filter(word => new RegExp(`(^|[\\s,;(/-])${word}(?=$|[\\s,;)/-])`, 'i').test(location)) : [];
  if (arrangements.length === 1 && !/\b(?:not|no)\s+(?:remote|hybrid|onsite)\b/i.test(location ?? '')) {
    draft.work_arrangement = /** @type {import('../model.js').WorkArrangement} */ (arrangements[0]); fieldSources.work_arrangement = 'Explicit location label';
  }
  // Custom employer-defined metadata has no standardized semantics: do not guess.
  const firstPublished = text(raw.first_published);
  if (firstPublished && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(firstPublished) && Number.isFinite(Date.parse(firstPublished))) {
    try { normalizePatch({ posted_on: firstPublished.slice(0, 10) }); draft.posted_on = firstPublished.slice(0, 10); fieldSources.posted_on = 'first_published (source calendar date)'; }
    catch { warnings.push('The publication date is invalid; complete it manually if known.'); }
  } else if (firstPublished) warnings.push('The publication date is ambiguous; complete it manually if known.');
  if (Array.isArray(raw.pay_input_ranges) && raw.pay_input_ranges.length) {
    const ranges = [];
    for (const value of raw.pay_input_ranges) {
      const range = object(value);
      if (typeof range.min_cents !== 'number' || typeof range.max_cents !== 'number' || !Number.isSafeInteger(range.min_cents) || !Number.isSafeInteger(range.max_cents) || range.min_cents < 0 || range.max_cents < range.min_cents || !text(range.currency_type)) {
        warnings.push('An incomplete or invalid compensation range was omitted. Review the description.'); continue;
      }
      const label = text(range.title), blurb = text(range.blurb);
      ranges.push(`${label ? descriptionText(label) + ': ' : ''}${text(range.currency_type)} ${(range.min_cents / 100).toLocaleString('en-US')}–${(range.max_cents / 100).toLocaleString('en-US')}${blurb ? '\n' + descriptionText(blurb) : ''}`);
    }
    if (ranges.length) { draft.compensation_text = ranges.join('\n\n'); fieldSources.compensation_text = 'All supported pay_input_ranges'; warnings.push('Greenhouse does not specify the pay interval here. Confirm annual/hourly and range applicability; no interval was inferred.'); }
  }
  for (const [key, label] of [['company','Company'], ['title','Title'], ['compensation_text','Compensation'], ['location','Location'], ['work_arrangement','Work arrangement'], ['employment_type','Employment type'], ['posted_on','Posted date'], ['job_description','Job description']]) {
    if (!draft[/** @type {keyof typeof draft} */ (key)]) warnings.push(`${label} was not supplied unambiguously. ${key === 'company' || key === 'title' ? 'Required before saving.' : 'Leave blank or complete it manually.'}`);
  }
  return { draft: /** @type {import('../model.js').DetailsPatch} */ (normalizePatch(draft)), identity: { ...identity, requisition_id: text(raw.requisition_id) }, original_url: originalUrl, retrieved_at: now.toISOString(), method: 'greenhouse-job-board-api', field_sources: fieldSources, warnings };
}

/** Shared pipeline for manual capture and future callers; no UI/auth/database dependency.
 * @param {string} url @param {{fetcher: typeof fetch, signal: AbortSignal, now?: Date, discoveredOn?: string}} options
 */
export async function ingestGreenhouse(url, options) {
  const identity = recognizeGreenhouse(url);
  const posting = await retrievePosting(options.fetcher, identity.retrieval_url, options.signal);
  return normalizeGreenhouse(posting, identity, url, options.now ?? new Date(), options.discoveredOn);
}
