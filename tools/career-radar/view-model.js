import { normalizePatch, validateId } from './model.js';

/** Presentation only: persisted statuses and the status editor stay canonical.
 * @type {readonly {id: string, label: string, statuses: readonly import('./model.js').ProspectStatus[]}[]}
 */
export const BOARD_COLUMNS = [
  { id: 'prospects', label: 'Prospects', statuses: ['prospect', 'interested'] },
  { id: 'applying', label: 'Applying', statuses: ['applying'] },
  { id: 'applied', label: 'Applied', statuses: ['applied'] },
  { id: 'in-process', label: 'In Process', statuses: ['recruiter', 'interviewing', 'final', 'offer'] },
  { id: 'done', label: 'Done', statuses: ['passed', 'rejected', 'withdrawn', 'closed'] }
];

export const APPLIED_CARD_LIMIT = 10;

/** Known application dates first; undated imports use discovery/creation recency.
 * Dates are ordering hints only, never inferred or written back.
 * @param {import('./data.js').ProspectCard} a @param {import('./data.js').ProspectCard} b
 */
function compareAppliedCards(a, b) {
  if (Boolean(a.applied_on) !== Boolean(b.applied_on)) return a.applied_on ? -1 : 1;
  const aDate = a.applied_on ?? a.discovered_on ?? a.created_at;
  const bDate = b.applied_on ?? b.discovered_on ?? b.created_at;
  return Date.parse(bDate) - Date.parse(aDate)
    || Date.parse(b.created_at) - Date.parse(a.created_at)
    || a.id.localeCompare(b.id);
}

/** @param {string} status */
export function statusLabel(status) {
  return status === 'final' ? 'Final round' : status.charAt(0).toUpperCase() + status.slice(1);
}
/** Calendar dates must not shift to the previous day in the viewer's timezone.
 * @param {string|null} date
 */
export function formatAppliedDate(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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
  return BOARD_COLUMNS.map(column => {
    const grouped = cards.filter(card => column.statuses.includes(card.status));
    if (column.id === 'applied') grouped.sort(compareAppliedCards);
    return { ...column, cards: grouped };
  });
}
/** Limit presentation only; the group retains every prospect and its total count.
 * @param {{id: string, cards: import('./data.js').ProspectCard[]}} group @param {boolean} [expanded]
 */
export function visibleCards(group, expanded = false) {
  return group.id === 'applied' && !expanded ? group.cards.slice(0, APPLIED_CARD_LIMIT) : group.cards;
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
