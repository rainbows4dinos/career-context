import { normalizePatch, validateId } from './model.js';

/** Presentation only: persisted statuses and the status editor stay canonical.
 * @type {readonly {id: string, label: string, statuses: readonly import('./model.js').ProspectStatus[], dropStatus: import('./model.js').ProspectStatus|null}[]}
 */
export const BOARD_COLUMNS = [
  { id: 'prospects', label: 'Prospects', statuses: ['prospect', 'interested', 'applying'], dropStatus: 'prospect' },
  { id: 'applied', label: 'Applied', statuses: ['applied'], dropStatus: 'applied' },
  { id: 'in-process', label: 'In-Process', statuses: ['recruiter', 'interviewing', 'final', 'offer'], dropStatus: 'recruiter' },
  { id: 'done', label: 'Done', statuses: ['passed', 'rejected', 'withdrawn', 'closed'], dropStatus: null }
];

/** Same-column drops never change a status, including grouped/legacy statuses.
 * @param {import('./model.js').ProspectStatus} status @param {string} destination
 * @returns {null|{kind:'default', status:import('./model.js').ProspectStatus}|{kind:'choose', statuses:readonly import('./model.js').ProspectStatus[]}} */
export function resolveBoardDrop(status, destination) {
  const column = BOARD_COLUMNS.find(column => column.id === destination);
  if (!column || column.statuses.includes(status)) return null;
  return column.dropStatus ? { kind: 'default', status: column.dropStatus } : { kind: 'choose', statuses: column.statuses };
}

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
/** Filter after central column ordering; never mutate or reorder the source data.
 * @param {import('./data.js').ProspectCard[]} cards @param {string} query */
export function searchBoardGroups(cards, query) {
  const search = query.trim().toLowerCase();
  return groupCards(cards).map(group => ({
    ...group, total: group.cards.length,
    cards: search ? group.cards.filter(card => card.company.toLowerCase().includes(search) || card.title.toLowerCase().includes(search)) : group.cards
  }));
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
