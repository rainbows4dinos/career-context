import { normalizePatch, STATUSES, validateId } from './model.js';

/** @param {string} status */
export function statusLabel(status) {
  return status === 'final' ? 'Final round' : status.charAt(0).toUpperCase() + status.slice(1);
}
/** @param {string} hash @returns {{kind: 'board'|'new'|'detail'|'missing', id?: string}} */
export function parseRoute(hash) {
  if (!hash || hash === '#/board') return { kind: 'board' };
  if (hash === '#/prospects/new') return { kind: 'new' };
  const match = /^#\/prospects\/([^/]+)$/.exec(hash);
  if (match) {
    try { return { kind: 'detail', id: validateId(match[1]) }; } catch { /* unavailable route */ }
  }
  return { kind: 'missing' };
}
/** @param {import('./data.js').ProspectCard[]} cards */
export function groupCards(cards) {
  return STATUSES.map(status => ({ status, cards: cards.filter(card => card.status === status) }));
}
/** Only core fields belong in this form; never clear assessments/connections.
 * @param {FormData} form @returns {import('./model.js').DetailsPatch}
 */
export function readDetails(form) {
  /** @type {Record<string, string>} */
  const patch = {};
  for (const key of ['company', 'title', 'job_url', 'source', 'location', 'work_arrangement',
    'employment_type', 'compensation_text', 'job_description', 'posted_on', 'discovered_on', 'applied_on', 'notes']) {
    patch[key] = String(form.get(key) ?? '');
  }
  return /** @type {import('./model.js').DetailsPatch} */ (normalizePatch(patch));
}
/** @param {unknown} error */
export function errorMessage(error) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    if (/fetch|network/i.test(error.message)) return 'Could not reach Supabase. Check your connection and try again. Your draft is still here.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
