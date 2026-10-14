import { IngestionError } from './errors.js';
import { recognizeWorkday, sameWorkdayPosting } from './workday-url.js';
import { retrievePosting } from './bounded-fetch.js';
import { jobPostingObjects } from './posting-metadata.js';
import { object, text, plainText, postingText, finishPreview } from './posting-facts.js';
import { normalizePatch } from '../model.js';

/** @typedef {ReturnType<typeof recognizeWorkday>} WorkdayIdentity */

/** Validate the requested posting before optional metadata retrieval.
 * @param {unknown} input @param {WorkdayIdentity} identity
 */
export function validateWorkdayPosting(input, identity) {
  const root = object(input), info = object(root.jobPostingInfo);
  if (text(info.jobPostingId)?.toLowerCase() !== identity.posting_id || info.jobPostingSiteId !== identity.site ||
      (info.posted !== undefined && typeof info.posted !== 'boolean') || (info.canApply !== undefined && typeof info.canApply !== 'boolean')) {
    throw new IngestionError('invalid_posting', 'Workday returned a malformed or mismatched posting.', 502);
  }
  if (info.posted === false) throw new IngestionError('unavailable', 'This Workday posting is no longer public. Enter its details manually if known.', 404);
  if (text(info.externalUrl)) {
    try { if (!sameWorkdayPosting(recognizeWorkday(String(info.externalUrl)), identity)) throw new Error('Mismatch'); }
    catch { throw new IngestionError('invalid_posting', 'Workday returned conflicting posting identities.', 502); }
  }
  return root;
}

const normalized = /** @param {string} value */ value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

/** Workday JSON-LD identifiers are requisitions, not posting anchors. Require
 * the CXS requisition AND title; never weaken another provider's matching.
 * @param {string} html @param {WorkdayIdentity} identity
 * @param {Record<string,unknown>} info @param {string[]} warnings
 */
export function workdayMetadata(html, identity, info, warnings) {
  const req = text(info.jobReqId), title = text(info.title);
  const matches = jobPostingObjects(html, warnings).filter(item => {
    const id = text(object(item.identifier).value) ?? text(item.identifier);
    if (!req || !title || id !== req || !text(item.title) || normalized(String(item.title)) !== normalized(title)) return false;
    if (text(item.url)) {
      try { if (!sameWorkdayPosting(recognizeWorkday(String(item.url)), identity)) return false; }
      catch { return false; }
    }
    return true;
  });
  if (matches.length !== 1) {
    warnings.push('Workday page metadata did not match one exact requisition/title. CXS facts are retained; review missing fields.');
    return {};
  }
  return matches[0];
}

/** Copy only explicit, bounded labeled sections; never infer salary from an
 * arbitrary dollar amount, annualize, select a tier, or silently truncate.
 * @param {string|null} description @param {string[]} warnings
 */
export function labeledWorkdayPay(description, warnings) {
  if (!description) return null;
  const lines = description.split('\n').map(line => line.trim()).filter(Boolean);
  const heading = /^(?:(?:annual|hourly|base|annual base) )?(?:salary|pay|compensation)(?: ranges?| information)?\s*:?$/i;
  const money = /(?:[$€£¥]\s*\d|\b(?:USD|CAD|AUD|EUR|GBP)\s*\d|\d[\d,.]*\s*(?:USD|CAD|AUD|EUR|GBP)\b)/;
  const qualifier = /\b(?:salary|pay|compensation|wages?|rates?)\b/i;
  const boundary = /^(?:benefits|qualifications|required qualifications|preferred qualifications|requirements|responsibilities|equal opportunity(?: statement)?|special requirements|about us)\s*:?$/i;
  const sections = [];
  for (let index = 0; index < lines.length; index++) {
    if (!heading.test(lines[index])) continue;
    const section = [lines[index]];
    let hasMoney = false, cursor = index + 1;
    for (; cursor < lines.length; cursor++) {
      const line = lines[cursor];
      if (heading.test(line) || boundary.test(line)) break;
      if (!money.test(line) && !qualifier.test(line)) {
        warnings.push('A labeled Workday pay section had an ambiguous boundary. Compensation was left blank; review the complete description.');
        return null;
      }
      if (section.length >= 32 || section.join('\n').length + line.length > 4000) {
        warnings.push('A labeled Workday pay section exceeded extraction bounds. Compensation was left blank; review the complete description.');
        return null;
      }
      section.push(line); hasMoney ||= money.test(line);
    }
    if (hasMoney) sections.push(section.join('\n'));
    index = Math.max(index, cursor - 1);
  }
  return sections.join('\n\n') || null;
}

/** Structured JobPosting salary values only, with their explicit interval.
 * @param {unknown} input @param {string[]} warnings
 */
function structuredPay(input, warnings) {
  if (input == null) return null;
  const entries = Array.isArray(input) ? input : [input];
  const parts = [];
  for (const entry of entries) {
    const salary = object(entry), value = object(salary.value), currency = plainText(salary.currency);
    const min = value.minValue ?? value.value, max = value.maxValue ?? value.value;
    if (!currency || typeof min !== 'number' || typeof max !== 'number' || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
      warnings.push('Structured Workday compensation was incomplete; no partial range or preferred tier was inferred.'); return null;
    }
    const label = plainText(salary.name), interval = plainText(value.unitText);
    parts.push(`${label ? label + ': ' : ''}${currency} ${min}–${max}${interval ? ' · ' + interval : ''}`);
    if (!interval) warnings.push('Structured Workday compensation had no pay interval; none was inferred.');
  }
  return parts.join('\n') || null;
}

/** @param {Record<string,unknown>} root @param {WorkdayIdentity} identity
 * @param {Record<string,unknown>} metadata @param {string} originalUrl
 * @param {Date} now @param {string[]} [warnings] @param {string} [discoveredOn]
 */
export function normalizeWorkday(root, identity, metadata, originalUrl, now, warnings = [], discoveredOn = now.toISOString().slice(0, 10)) {
  const info = object(root.jobPostingInfo);
  /** @type {import('../model.js').DetailsPatch} */
  const draft = { job_url: identity.canonical_url, discovered_on: discoveredOn };
  /** @type {Record<string,string>} */
  const sources = { job_url: 'Validated Workday posting identity', discovered_on: 'First captured in Career Radar (UTC default)' };
  const company = plainText(object(root.hiringOrganization).name), metadataCompany = plainText(object(metadata.hiringOrganization).name);
  if (company && metadataCompany && normalized(company) !== normalized(metadataCompany)) warnings.push('Workday employer names conflict between CXS and metadata. Company was left blank for review.');
  else if (company || metadataCompany) {
    draft.company = company ?? metadataCompany ?? undefined; sources.company = 'Explicit hiringOrganization.name (legal entity preserved)';
    warnings.push('Workday may supply a legal entity rather than an employer brand. Review Company; no tenant name or stripped prefix was substituted.');
  }
  const title = plainText(info.title); if (title) { draft.title = title; sources.title = 'jobPostingInfo.title'; }
  const locations = [plainText(info.location), ...(Array.isArray(info.additionalLocations) ? info.additionalLocations.map(plainText) : []), plainText(object(info.country).descriptor)].filter(Boolean);
  const eligible = (Array.isArray(metadata.applicantLocationRequirements) ? metadata.applicantLocationRequirements : [metadata.applicantLocationRequirements]).map(value => plainText(object(value).name)).filter(Boolean);
  if (eligible.length) locations.push('Eligible locations: ' + [...new Set(eligible)].join('; '));
  if (locations.length) { draft.location = [...new Set(locations)].join('; '); sources.location = 'CXS primary/additional locations, supplied country and matched eligibility'; }
  const arrangements = /** @type {const} */ ({ remote: 'remote', hybrid: 'hybrid', onsite: 'onsite', flexible: 'flexible' });
  const remote = plainText(info.remoteType), key = remote?.toLowerCase().replace(/[\s-]/g, '');
  const arrangement = key && Object.hasOwn(arrangements, key) ? arrangements[/** @type {keyof typeof arrangements} */ (key)] : undefined;
  const telecommute = metadata.jobLocationType === 'TELECOMMUTE';
  if (telecommute && remote && arrangement !== 'remote') warnings.push('Workday work arrangement conflicts: CXS remoteType and TELECOMMUTE metadata differ. Work arrangement was left blank.');
  else if (arrangement || (!remote && telecommute)) { draft.work_arrangement = arrangement ?? 'remote'; sources.work_arrangement = arrangement ? 'Explicit CXS remoteType' : 'Matched JobPosting.jobLocationType'; }
  else if (remote) warnings.push(`Workday remoteType (${remote}) has no unambiguous mapping. Complete work arrangement manually.`);
  const employment = plainText(info.timeType);
  if (employment) { draft.employment_type = employment; sources.employment_type = 'CXS timeType; full/part-time does not imply permanent employment'; }
  const description = postingText(info.jobDescription, null);
  if (description) { draft.job_description = description; sources.job_description = 'Complete CXS jobDescription converted to inert plain text'; }
  const pay = metadata.baseSalary != null ? structuredPay(metadata.baseSalary, warnings) : labeledWorkdayPay(description, warnings);
  if (pay) { draft.compensation_text = pay; sources.compensation_text = metadata.baseSalary != null ? 'Matched explicit JobPosting.baseSalary; no annualization' : 'Bounded labeled pay section; all supplied tiers/qualifications retained'; }
  const posted = text(metadata.datePosted);
  if (posted) {
    try {
      if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(posted) || !Number.isFinite(Date.parse(posted))) throw new Error('Ambiguous date');
      normalizePatch({ posted_on: posted.slice(0, 10) });
      const start = text(info.startDate);
      if (start && start !== posted.slice(0, 10)) warnings.push('Workday publication dates conflict between CXS and metadata. Posted date was left blank.');
      else { draft.posted_on = posted.slice(0, 10); sources.posted_on = 'Matched JobPosting.datePosted (current posting publication, not inferred from relative text)'; }
    } catch { warnings.push('Workday publication metadata contains an invalid or ambiguous date; complete it manually.'); }
  }
  if (info.canApply === false) warnings.push('Workday reports that application is not currently available. This does not change Radar status.');
  const result = finishPreview(draft, identity, originalUrl, now, sources, warnings, 'workday-cxs-detail');
  result.identity.requisition_id = text(info.jobReqId);
  return result;
}

/** @param {string} url @param {{fetcher: typeof fetch, signal: AbortSignal, now?: Date, discoveredOn?: string}} options */
export async function ingestWorkday(url, options) {
  const identity = recognizeWorkday(url);
  /** @type {typeof fetch} */
  const fetcher = async (target, init) => {
    const response = await options.fetcher(target, init);
    if (response.status === 403) {
      await response.body?.cancel().catch(() => {});
      throw new IngestionError('inaccessible', 'Workday denied access to this posting. It may be unavailable or access-restricted; a 403 does not prove it expired. Enter details manually if known.', 502);
    }
    return response;
  };
  const root = validateWorkdayPosting(await retrievePosting(fetcher, identity.retrieval_url, options.signal, 'Workday'), identity);
  /** @type {string[]} */ const warnings = [];
  /** @type {Record<string,unknown>} */ let metadata = {};
  try {
    const html = await retrievePosting(fetcher, identity.metadata_url, options.signal, 'Workday', 'html');
    metadata = workdayMetadata(/** @type {string} */ (html), identity, object(root.jobPostingInfo), warnings);
  } catch {
    options.signal.throwIfAborted();
    warnings.push('Workday page metadata could not be retrieved within security/size limits. CXS facts are retained; dates and other unsupported facts remain blank.');
  }
  return normalizeWorkday(root, identity, metadata, url, options.now ?? new Date(), warnings, options.discoveredOn);
}
