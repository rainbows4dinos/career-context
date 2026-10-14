import { IngestionError } from './errors.js';
import { recognizePosting, samePosting } from './posting-url.js';
import { retrievePosting } from './bounded-fetch.js';
import { retrieveMetadata } from './posting-metadata.js';
import { object, text, descriptionText, postingText, finishPreview } from './posting-facts.js';

/** Select the exact identity, never the first job or a fuzzy title match.
 * @param {unknown} input @param {import('./preview.js').PostingIdentity} identity
 */
export function selectAshbyPosting(input, identity) {
  const board = object(input);
  if (board.apiVersion !== '1' || !Array.isArray(board.jobs)) throw new IngestionError('invalid_posting', 'Ashby returned an unsupported or malformed job board.', 502);
  const matches = board.jobs.filter(value => {
    const job = object(value);
    const idMatches = text(job.id)?.toLowerCase() === identity.posting_id;
    let urlMatches = false;
    if (text(job.jobUrl)) {
      try { urlMatches = samePosting(recognizePosting(String(job.jobUrl)), identity); } catch { /* Never fetch an upstream URL. */ }
      if (idMatches && !urlMatches) throw new IngestionError('invalid_posting', 'Ashby returned conflicting posting identities.', 502);
    }
    if (urlMatches && text(job.id) && !idMatches) throw new IngestionError('invalid_posting', 'Ashby returned conflicting posting identities.', 502);
    return idMatches || urlMatches;
  });
  if (!matches.length) throw new IngestionError('unavailable', 'This Ashby posting is unavailable or no longer in the public job board. Add it manually if you have its details.', 404);
  if (matches.length !== 1) throw new IngestionError('invalid_posting', 'Ashby returned more than one entry for this posting.', 502);
  return object(matches[0]);
}

/** @param {Record<string,unknown>} raw */
function location(raw) {
  const entries = [{ location: raw.location, address: object(raw.address).postalAddress },
    ...(Array.isArray(raw.secondaryLocations) ? raw.secondaryLocations.map(object) : [])];
  return [...new Set(entries.map(entry => {
    const address = object(entry.address);
    const label = text(entry.location);
    const parts = [label, ...[text(address.addressLocality), text(address.addressRegion), text(address.addressCountry)].filter(part => {
      if (!part || !label) return !!part;
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !new RegExp(`(^|[\\s,;—–()/\\-])${escaped}(?=$|[\\s,;—–()/\\-])`, 'i').test(label);
    })].filter(Boolean);
    return [...new Set(parts)].join(', ');
  }).filter(Boolean))].join('; ') || null;
}

/** Retain every tier, qualification, component and explicit interval.
 * @param {unknown} input @param {string[]} warnings
 */
function compensation(input, warnings) {
  const raw = object(input);
  const sections = [];
  const summary = postingText(raw.compensationTierSummary, null) ?? postingText(raw.scrapeableCompensationSalarySummary, null);
  if (summary) sections.push(summary);
  /** @param {unknown} value */
  const componentText = value => {
    const item = object(value);
    const lines = [text(item.compensationType), postingText(item.summary, null)].filter(Boolean);
    if (item.minValue != null || item.maxValue != null) {
      if (typeof item.minValue === 'number' && typeof item.maxValue === 'number' && Number.isFinite(item.minValue) && Number.isFinite(item.maxValue) && item.minValue >= 0 && item.maxValue >= item.minValue) lines.push(`${text(item.currencyCode) ? text(item.currencyCode) + ' ' : ''}${item.minValue.toLocaleString('en-US')}–${item.maxValue.toLocaleString('en-US')}`);
      else warnings.push('An incomplete or invalid Ashby compensation range was omitted; review its supplied summary and description.');
    }
    if (lines.length && text(item.interval) && item.interval !== 'NONE') lines.push(`Interval: ${String(item.interval)}`);
    return lines.join(' · ');
  };
  if (Array.isArray(raw.compensationTiers) && raw.compensationTiers.length) {
    for (const value of raw.compensationTiers) {
      const tier = object(value);
      const lines = [postingText(tier.title, null), postingText(tier.tierSummary, null), postingText(tier.additionalInformation, null)].filter(Boolean);
      if (Array.isArray(tier.components)) lines.push(...tier.components.map(componentText).filter(Boolean));
      if (lines.length) sections.push(lines.join('\n'));
    }
  } else if (Array.isArray(raw.summaryComponents)) sections.push(...raw.summaryComponents.map(componentText).filter(Boolean));
  return sections.join('\n\n') || null;
}

/** Pure adapter: Ashby's last-published date is not an original posting date.
 * @param {Record<string,unknown>} raw @param {import('./preview.js').PostingIdentity} identity
 * @param {Record<string,unknown>} metadata @param {string} originalUrl @param {Date} now
 * @param {string[]} [warnings] @param {string} [discoveredOn]
 */
export function normalizeAshby(raw, identity, metadata, originalUrl, now, warnings = [], discoveredOn = now.toISOString().slice(0, 10)) {
  /** @type {import('../model.js').DetailsPatch} */
  const draft = { job_url: identity.canonical_url, discovered_on: discoveredOn };
  /** @type {Record<string,string>} */
  const sources = { job_url: 'Ashby posting identity', discovered_on: 'First captured in Career Radar (UTC default)' };
  const company = postingText(object(metadata.hiringOrganization).name, null);
  const title = postingText(raw.title, null);
  if (company) { draft.company = company; sources.company = 'Hosted JobPosting.hiringOrganization.name'; }
  if (title) { draft.title = title; sources.title = 'title'; }
  const place = location(raw);
  if (place) { draft.location = descriptionText(place); sources.location = 'location, secondaryLocations and supplied addresses'; }
  const description = postingText(raw.descriptionHtml, raw.descriptionPlain);
  if (description) { draft.job_description = description; sources.job_description = 'descriptionHtml/descriptionPlain (plain text)'; }
  const arrangements = /** @type {const} */ ({ Remote: 'remote', Hybrid: 'hybrid', OnSite: 'onsite' });
  const arrangement = typeof raw.workplaceType === 'string' && Object.hasOwn(arrangements, raw.workplaceType) ? arrangements[/** @type {keyof typeof arrangements} */ (raw.workplaceType)] : undefined;
  if ((arrangement === 'remote' && raw.isRemote === false) || (arrangement === 'onsite' && raw.isRemote === true)) warnings.push('Ashby workplaceType and isRemote conflict. Work arrangement is left blank for review.');
  else if (arrangement) { draft.work_arrangement = arrangement; sources.work_arrangement = 'workplaceType'; }
  else if (raw.isRemote === true) { draft.work_arrangement = 'remote'; sources.work_arrangement = 'isRemote=true'; }
  const employmentTypes = /** @type {const} */ ({ FullTime: 'Full-time', PartTime: 'Part-time', Intern: 'Internship', Contract: 'Contract', Temporary: 'Temporary' });
  const employment = text(raw.employmentType);
  if (employment) { draft.employment_type = Object.hasOwn(employmentTypes, employment) ? employmentTypes[/** @type {keyof typeof employmentTypes} */ (employment)] : employment; sources.employment_type = 'employmentType'; }
  const pay = compensation(raw.compensation, warnings);
  if (pay) { draft.compensation_text = pay; sources.compensation_text = 'All supplied compensation tiers/components; explicit intervals only'; }
  if (text(raw.publishedAt)) warnings.push(`Ashby reports last published at ${String(raw.publishedAt)}. This can be republication; Posted date is left blank rather than treating it as the original posting date.`);
  return finishPreview(draft, identity, originalUrl, now, sources, warnings, 'ashby-job-posting-api');
}

/** @param {string} url @param {{fetcher: typeof fetch, signal: AbortSignal, now?: Date, discoveredOn?: string}} options */
export async function ingestAshby(url, options) {
  const identity = recognizePosting(url);
  if (identity.provider !== 'ashby') throw new IngestionError('unsupported_url', 'Use an Ashby hosted posting link.');
  const raw = selectAshbyPosting(await retrievePosting(options.fetcher, identity.retrieval_url, options.signal, 'Ashby'), identity);
  /** @type {string[]} */ const warnings = [];
  const metadata = await retrieveMetadata(identity, text(raw.title), options, warnings);
  return normalizeAshby(raw, identity, metadata, url, options.now ?? new Date(), warnings, options.discoveredOn);
}
