import { recognizeGreenhouse } from './ingestion/greenhouse-url.js';

/** @param {string|null|undefined} value */
function normalized(value) { return (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US'); }
/** @param {string|null|undefined} value */
function posting(value) {
  if (!value) return null;
  try { const url = new URL(value); if (url.protocol === 'http:') url.protocol = 'https:'; return recognizeGreenhouse(url.href); }
  catch { return null; }
}
/** @param {string|null|undefined} value */
function canonical(value) {
  const recognized = posting(value);
  if (recognized) return recognized.canonical_url;
  try { const url = new URL(value ?? ''); url.hash = ''; return url.href; } catch { return null; }
}
/** Pure conservative matching: different known postings never collapse into a
 * same-company/title match. No fuzzy title or company-suffix stripping.
 * @param {import('./model.js').DetailsPatch} draft
 * @param {import('./data.js').ProspectIdentity[]} prospects @param {string} [ignoreId]
 */
export function duplicateCandidates(draft, prospects, ignoreId) {
  const url = canonical(draft.job_url), identity = posting(draft.job_url);
  return prospects.flatMap(prospect => {
    if (prospect.id === ignoreId) return [];
    const other = posting(prospect.job_url);
    if (url && url === canonical(prospect.job_url)) return [{ prospect, strength: 'strong', reason: 'Same canonical job URL / posting identity' }];
    if (identity && other && identity.canonical_url !== other.canonical_url) return [];
    const sameRole = normalized(draft.company) && normalized(draft.title) && normalized(draft.company) === normalized(prospect.company) && normalized(draft.title) === normalized(prospect.title);
    const conflictingLocation = normalized(draft.location) && normalized(prospect.location) && normalized(draft.location) !== normalized(prospect.location);
    return sameRole && !conflictingLocation ? [{ prospect, strength: 'possible', reason: 'Same company and title; posting identity is not conclusive' }] : [];
  });
}
