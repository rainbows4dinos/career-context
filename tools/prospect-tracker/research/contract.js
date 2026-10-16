import { recognizePosting } from '../ingestion/posting-url.js';

export const LIMITS = Object.freeze({ results: 5, toolCalls: 6, outputTokens: 6000, modelTimeoutMs: 120000,
  verificationTimeoutMs: 4000, runTimeoutMs: 145000, verificationBytes: 262144, responseBytes: 1048576, decisions: 100 });
export const MODEL = 'gpt-5.4-mini';

/** Display URLs are never automatically fetched. Network checks use the stricter hosted policy below.
 * Reject IP literals (including normalized decimal/hex IPv4), local names, credentials and control characters.
 * @param {unknown} value @returns {string|null} */
export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value) || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return null;
  try {
    const u = new URL(value), h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !h.includes('.') ||
      !/^[a-z0-9.-]+$/.test(h) || /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(h) ||
      /^\d+(?:\.\d+)*$/.test(h) || h.endsWith('.') || h.split('.').some(x => !x || x.startsWith('-') || x.endsWith('-'))) return null;
    return u.href;
  } catch { return null; }
}

/** Reuse existing vetted platform identity rules. No arbitrary employer DNS or private-network fetch.
 * No adapter API, custom host, model-supplied query or redirect is retrieved.
 * @param {string} value */
export function checkTarget(value) {
  if (!safeUrl(value)) return null;
  try {
    const identity = recognizePosting(value);
    const u = new URL(value);
    u.hash = ''; u.search = '';
    if (u.pathname === '/embed/job_app') {
      u.searchParams.set('for', identity.board); u.searchParams.set('token', identity.posting_id);
    }
    return u.href;
  } catch { return null; }
}

/** Known posting identities ignore tracking; generic identities retain meaningful query parameters.
 * @param {string|null} value */
export function identityKey(value) {
  if (!value || !safeUrl(value)) return null;
  try {
    const p = recognizePosting(value);
    return `${p.provider}:${p.board}:${'region' in p ? p.region : ''}:${p.posting_id}`;
  } catch {
    const u = new URL(value); u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^utm_|^(?:source|ref|gh_src)$/i.test(k)) u.searchParams.delete(k);
    u.searchParams.sort(); u.pathname = u.pathname.replace(/\/$/, ''); return u.href;
  }
}
/** @param {string|null} v */
export const normalized = v => (v ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** @param {{company:string|null,job_title:string|null}} a @param {{company:string|null,job_title:string|null}} b */
export function sameName(a, b) { return !!(normalized(a.company) && normalized(a.job_title) && normalized(a.company) === normalized(b.company) && normalized(a.job_title) === normalized(b.job_title)); }

/** @param {unknown} value @returns {import('./types.ts').Decision[]} */
export function decisionsInput(value) {
  if (!Array.isArray(value) || value.length > LIMITS.decisions) throw new Error('Invalid decision identities.');
  return value.map(d => {
    if (!d || typeof d !== 'object' || !['accept', 'pass'].includes(d.decision) ||
      Object.keys(d).some(k => !['decision','original_url','company','job_title'].includes(k)) ||
      ![d.company,d.job_title].every(v => v === null || typeof v === 'string' && v.length <= 300) ||
      !(d.original_url === null || safeUrl(d.original_url)) || (!d.original_url && (!d.company || !d.job_title))) throw new Error('Invalid decision identity.');
    return { decision: d.decision, original_url: d.original_url, company: d.company, job_title: d.job_title };
  });
}

const string = { type: 'string' }, nullable = { type: ['string', 'null'] };
/** @param {Record<string,unknown>} properties */
const objectSchema = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const candidateSchema = objectSchema({ company: string, job_title: string, location: nullable,
  remote_eligibility: nullable, compensation_text: nullable, original_employer_or_ats_url: nullable,
  discovery_source_url: string, source_check_timestamp: { type: 'null' }, verification_status: string,
  why_fit: { type: 'array', items: string }, concerns_or_unknowns: { type: 'array', items: string }, wildcard_rationale: nullable,
  evidence: { type: 'array', items: objectSchema({ field: string, url: string, support: string }) } });
export const outputSchema = objectSchema({ opportunities: { type: 'array', maxItems: LIMITS.results, items: candidateSchema }, research_notes: { type: 'array', items: string } });

/** Validate all output, even when provider reports schema success. No model status becomes authoritative.
 * @param {unknown} input @returns {{opportunities:import('./types.ts').Candidate[],research_notes:string[]}} */
export function validateOutput(input) {
  /** @param {unknown} v @param {number} [max] */
  const str = (v, max = 2000) => typeof v === 'string' && v.length <= max;
  /** @param {unknown} v */
  const list = v => Array.isArray(v) && v.length <= 20 && v.every(x => str(x));
  const v = /** @type {ReturnType<typeof validateOutput>} */ (input);
  if (!v || !Array.isArray(v.opportunities) || v.opportunities.length > LIMITS.results || !list(v.research_notes) || Object.keys(v).some(k => !['opportunities','research_notes'].includes(k))) throw new Error('Invalid research output.');
  for (const c of v.opportunities) {
    if (!c || Object.keys(c).length !== Object.keys(candidateSchema.properties).length || Object.keys(c).some(k => !(k in candidateSchema.properties)) ||
      !str(c.company,300) || !c.company.trim() || !str(c.job_title,300) || !c.job_title.trim() || !safeUrl(c.discovery_source_url) ||
      !(c.original_employer_or_ats_url === null || safeUrl(c.original_employer_or_ats_url)) ||
      ![c.location,c.remote_eligibility,c.compensation_text,c.wildcard_rationale].every(x => x === null || str(x)) ||
      c.source_check_timestamp !== null || !str(c.verification_status,100) || !list(c.why_fit) || !list(c.concerns_or_unknowns) ||
      !Array.isArray(c.evidence) || c.evidence.length > 30 || c.evidence.some(e => !e || Object.keys(e).sort().join(',') !== 'field,support,url' || !str(e.field,100) || !safeUrl(e.url) || !str(e.support,1000) || !e.support.trim())) throw new Error('Invalid research candidate.');
  }
  return v;
}
