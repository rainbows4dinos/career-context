/** @typedef {import('./database.types.ts').Database} Database */
/** @typedef {Database['public']['Tables']['prospects']['Row']} ProspectRow */
/** @typedef {Database['public']['Tables']['prospect_status_events']['Row']} StatusEvent */
/** @typedef {'prospect'|'interested'|'applying'|'applied'|'recruiter'|'interviewing'|'final'|'offer'|'passed'|'rejected'|'withdrawn'|'closed'} ProspectStatus */
/** @typedef {'remote'|'hybrid'|'onsite'|'flexible'} WorkArrangement */
/** @typedef {1|2|3|4|5} Score */
/** @typedef {{id: string, name: string, role?: string, relationship?: string, contact?: string, notes?: string}} Connection */
/** @typedef {Omit<ProspectRow, 'status'|'work_arrangement'|'connections'> & {status: ProspectStatus, work_arrangement: WorkArrangement|null, connections: Connection[]}} Prospect */

/** @type {readonly ProspectStatus[]} */
export const STATUSES = Object.freeze([
  'prospect', 'interested', 'applying', 'applied', 'recruiter', 'interviewing',
  'final', 'offer', 'passed', 'rejected', 'withdrawn', 'closed'
]);
/** @type {readonly WorkArrangement[]} */
export const WORK_ARRANGEMENTS = Object.freeze(['remote', 'hybrid', 'onsite', 'flexible']);

/** @type {readonly ['experience_fit','level_fit','compensation_fit','consumer_fit','domain_fit','craft_interaction_fit','systems_fit','work_style_fit','logistics_fit','relationship_strength','overall_assessment','personal_interest']} */
export const SCORE_FIELDS = Object.freeze([
  'experience_fit', 'level_fit', 'compensation_fit', 'consumer_fit', 'domain_fit',
  'craft_interaction_fit', 'systems_fit', 'work_style_fit', 'logistics_fit',
  'relationship_strength', 'overall_assessment', 'personal_interest'
]);
/** @typedef {typeof SCORE_FIELDS[number]} ScoreField */
/** @typedef {Partial<Record<ScoreField, Score|null>> & {assessment_rationale?: string|null, assessment_concerns?: string|null}} AssessmentPatch */
/** @typedef {{company?: string, title?: string, job_url?: string|null, source?: string|null, location?: string|null, work_arrangement?: WorkArrangement|null, employment_type?: string|null, compensation_text?: string|null, job_description?: string|null, posted_on?: string|null, discovered_on?: string|null, applied_on?: string|null, notes?: string|null}} DetailsPatch */
/** @typedef {DetailsPatch & AssessmentPatch & {connections?: Connection[]}} ProspectPatch */
/** @typedef {ProspectPatch & {id: string, company: string, title: string, status?: ProspectStatus}} NewProspect */

const TEXT_FIELDS = [
  'company', 'title', 'job_url', 'source', 'location', 'employment_type',
  'compensation_text', 'job_description', 'notes', 'assessment_rationale', 'assessment_concerns'
];
const DATE_FIELDS = ['posted_on', 'discovered_on', 'applied_on'];
const EDITABLE_FIELDS = new Set([...TEXT_FIELDS, ...DATE_FIELDS, ...SCORE_FIELDS, 'work_arrangement', 'connections']);

/** @param {unknown} value @param {string} [field] @returns {string} */
export function validateId(value, field = 'id') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${field} must be a UUID`);
  }
  return value;
}

/** @param {unknown} value @returns {ProspectStatus} */
export function validateStatus(value) {
  if (!STATUSES.includes(/** @type {ProspectStatus} */ (value))) throw new Error('Invalid prospect status');
  return /** @type {ProspectStatus} */ (value);
}

/** @param {unknown} value @param {string} field @returns {string|null} */
function optionalText(value, field) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error(`${field} must be text or null`);
  return value.trim() || null;
}

/** @param {string} value @returns {string} */
export function validateHttpUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Links must use HTTP/HTTPS without embedded credentials');
  }
  return value;
}

/** @param {unknown} value @returns {Connection[]} */
export function validateConnections(value) {
  if (!Array.isArray(value)) throw new Error('connections must be an array');
  const ids = new Set();
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid connection');
    const allowed = ['id', 'name', 'role', 'relationship', 'contact', 'notes'];
    for (const key of Object.keys(item)) if (!allowed.includes(key)) throw new Error(`Unknown connection field: ${key}`);
    const id = validateId(item.id, 'connection id');
    if (ids.has(id)) throw new Error('Connection IDs must be unique within a prospect');
    ids.add(id);
    const name = optionalText(item.name, 'connection name');
    if (!name) throw new Error('Connection name is required');
    /** @type {Connection} */
    const connection = { id, name };
    for (const key of /** @type {const} */ (['role', 'relationship', 'contact', 'notes'])) {
      if (item[key] !== undefined) {
        const text = optionalText(item[key], key);
        if (text) connection[key] = text;
      }
    }
    // Contact is free text, but URI-like contact values must be safe to link.
    if (connection.contact && /^[a-z][a-z0-9+.-]*:/i.test(connection.contact)) validateHttpUrl(connection.contact);
    return connection;
  });
}

/**
 * Validate a patch at runtime too; TypeScript alone cannot protect JS callers.
 * Undefined is omitted, null clears optional values, and empty text becomes null.
 * @param {ProspectPatch} patch
 * @returns {Database['public']['Tables']['prospects']['Update']}
 */
export function normalizePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Patch must be an object');
  /** @type {Record<string, import('./database.types.ts').Json|undefined>} */
  const result = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!EDITABLE_FIELDS.has(key)) throw new Error(`Field cannot be edited: ${key}`);
    if (value === undefined) continue;
    if (TEXT_FIELDS.includes(key)) {
      const text = optionalText(value, key);
      if (['company', 'title'].includes(key) && !text) throw new Error(`${key} is required`);
      if (key === 'job_url' && text) validateHttpUrl(text);
      result[key] = text;
    } else if (DATE_FIELDS.includes(key)) {
      const date = optionalText(value, key);
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
        throw new Error(`${key} must be a valid YYYY-MM-DD date`);
      }
      result[key] = date;
    } else if (SCORE_FIELDS.includes(/** @type {ScoreField} */ (key))) {
      if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5)) {
        throw new Error(`${key} must be an integer from 1 to 5 or null`);
      }
      result[key] = value;
    } else if (key === 'work_arrangement') {
      const arrangement = optionalText(value, key);
      if (arrangement && !WORK_ARRANGEMENTS.includes(/** @type {WorkArrangement} */ (arrangement))) throw new Error('Invalid work arrangement');
      result[key] = arrangement;
    } else if (key === 'connections') {
      result[key] = validateConnections(value).map(connection => ({ ...connection }));
    }
  }
  return /** @type {Database['public']['Tables']['prospects']['Update']} */ (result);
}

/** @param {ProspectRow} row @returns {Prospect} */
export function decodeProspect(row) {
  const arrangement = row.work_arrangement;
  if (arrangement !== null && !WORK_ARRANGEMENTS.includes(/** @type {WorkArrangement} */ (arrangement))) throw new Error('Invalid stored work arrangement');
  return {
    ...row, status: validateStatus(row.status),
    work_arrangement: /** @type {WorkArrangement|null} */ (arrangement),
    connections: validateConnections(row.connections)
  };
}
