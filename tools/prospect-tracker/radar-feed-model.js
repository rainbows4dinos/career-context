import { safeUrl, identityKey } from './research/contract.js';
import { validateId } from './model.js';
export const PASS_REASONS = { compensation:'Compensation',scope:'Seniority / scope',management:'Management-heavy',industry:'Company / industry',location:'Location / time zone',work_type:'Work type',already_considered:'Already considered / applied',other:'Other' };
/** @param {unknown} value @returns {Record<string,unknown>} */
function object(value) { if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Invalid opportunity data.'); return /** @type {Record<string,unknown>} */ (value); }
/** @param {unknown} value @param {number} [max] */
function text(value,max=2000) { if (typeof value!=='string' || value.length>max) throw new Error('Invalid opportunity text.');return value; }
/** @param {unknown} value */
function nullable(value) { if(value===null)return null;const v=text(value);return v.trim()?v:null; }
/** @param {unknown} value */
function time(value) { const v=text(value,100);if (!Number.isFinite(Date.parse(v))) throw new Error('Invalid opportunity timestamp.');return v; }
/** @param {unknown} value */
function url(value) { const v=safeUrl(value);if (!v || v.length>2048) throw new Error('Invalid opportunity URL.');return v; }
/** @param {unknown} value */
function list(value) { if (!Array.isArray(value) || value.length>20) throw new Error('Invalid opportunity list.');return value.map(v=>text(v)); }
/** @param {unknown} value @returns {import('./research/types.js').Facts} */
function facts(value) { const v=object(value);return {company:nullable(v.company),job_title:nullable(v.job_title),location:nullable(v.location),remote_eligibility:nullable(v.remote_eligibility),compensation_text:nullable(v.compensation_text)}; }
/** Compact allowlist shared by network decoding and stored-card decoding. No descriptions/raw output.
 * @param {unknown} input @param {number} revision @param {string} timestamp
 * @returns {import('./radar-feed.types.js').Snapshot} */
export function snapshot(input,revision,timestamp) {
  const v=object(input), a=object(v.assessment), check=object(v.verification), application=object(check.application);
  if (!Number.isSafeInteger(revision) || revision<1 || !['uncertain','appears_available','unavailable'].includes(String(check.availability)) || !['unknown','search_only','original_page_consulted'].includes(String(check.consultation)) || !['not_established','control_visible','form_observed'].includes(String(application.status))) throw new Error('Invalid verification data.');
  const sources=v.evidence ?? v.sources;
  if (!Array.isArray(sources) || sources.length>30) throw new Error('Invalid opportunity sources.');
  const result={facts:facts(v.facts),claims:facts(v.claims),assessment:{why_fit:list(a.why_fit),concerns_or_unknowns:list(a.concerns_or_unknowns),wildcard_rationale:nullable(a.wildcard_rationale)},
    verification:{availability:/** @type {import('./research/types.js').Verification['availability']} */(check.availability),consultation:/** @type {import('./research/types.js').Verification['consultation']} */(check.consultation),reason:text(check.reason,100),checked_at:time(check.checked_at),application:{status:/** @type {import('./research/types.js').Verification['application']['status']} */(application.status),url:application.url===null?null:url(application.url)}},
    sources:sources.map(item=>{const s=object(item);if (!['ai_discovery','independent_check'].includes(String(s.origin))) throw new Error('Invalid source origin.');return {field:text(s.field,100),url:url(s.url),origin:/** @type {'ai_discovery'|'independent_check'} */(s.origin)};}),
    original_url:v.original_url===null?null:url(v.original_url),discovery_url:url(v.discovery_url),profile_revision:revision,searched_at:time(timestamp)};
  if (!result.facts.company?.trim() && !result.claims.company?.trim() || !result.facts.job_title?.trim() && !result.claims.job_title?.trim() || new TextEncoder().encode(JSON.stringify(result)).length>28000) throw new Error('Opportunity is missing labels or exceeds the small-card storage limit.');
  opportunityKey(result);
  return result;
}
/** @param {import('./radar-feed.types.js').Snapshot} value */
export function opportunityKey(value) {
  const key=identityKey(value.original_url ?? value.discovery_url);
  if (!key || new TextEncoder().encode(key).length>2048) throw new Error('No usable opportunity identity.');return key;
}
/** @param {unknown} input @returns {import('./radar-feed.types.js').OpportunityRow} */
export function decodeOpportunity(input) {
  const v=object(input), s=object(v.snapshot);
  const card=snapshot(s,Number(s.profile_revision),String(s.searched_at));
  if (!['new','accepted','passed'].includes(String(v.decision)) || v.identity_key!==opportunityKey(card) || !(v.pass_reason===null || typeof v.pass_reason==='string' && Object.hasOwn(PASS_REASONS,v.pass_reason)) || !(v.pass_note===null || typeof v.pass_note==='string' && v.pass_note.length<=500)) throw new Error('Invalid stored opportunity.');
  return {id:validateId(String(v.id)),owner_id:validateId(String(v.owner_id)),identity_key:String(v.identity_key),snapshot:card,decision:/** @type {'new'|'accepted'|'passed'} */(v.decision),pass_reason:/** @type {string|null} */(v.pass_reason),pass_note:/** @type {string|null} */(v.pass_note),decided_at:v.decided_at===null?null:time(v.decided_at),prospect_id:v.prospect_id===null?null:validateId(String(v.prospect_id)),created_at:time(v.created_at),last_seen_at:time(v.last_seen_at),updated_at:time(v.updated_at)};
}
/** @param {unknown} input @param {number} revision @returns {import('./radar-feed.types.js').ResearchResult} */
export function decodeResearch(input,revision) {
  const v=object(input);
  if (!['completed','partial','failed'].includes(String(v.status)) || v.profile_revision!==revision || !Array.isArray(v.opportunities) || v.opportunities.length>5) throw new Error('Research returned an invalid result. Previous results are unchanged.');
  const timestamp=time(v.timestamp), cost=v.estimated_cost===null?null:object(v.estimated_cost).usd;
  return {id:validateId(String(v.id)),timestamp,profile_revision:revision,status:/** @type {'completed'|'partial'|'failed'} */(v.status),opportunities:v.opportunities.map(c=>snapshot(c,revision,timestamp)),estimated_cost:typeof cost==='number' && Number.isFinite(cost) && cost>=0 ? cost:null,message:v.status==='failed'?'Research failed. Previous results are unchanged.':v.status==='partial'?'Research was incomplete. Previous results are kept; review partial leads separately.':'Research completed.'};
}
/** @param {import('./radar-feed.types.js').OpportunityRow[]} rows */
export function decisionInputs(rows) { return rows.filter(r=>r.decision!=='new').sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,100).map(r=>({decision:/** @type {'accept'|'pass'} */(r.decision==='accepted'?'accept':'pass'),original_url:r.snapshot.original_url ?? r.snapshot.discovery_url,company:r.snapshot.claims.company ?? r.snapshot.facts.company,job_title:r.snapshot.claims.job_title ?? r.snapshot.facts.job_title})); }
