import { opportunityKey, decodeResearch } from './radar-feed-model.js';
import { identityKey } from './research/contract.js';
import { duplicateCandidates } from './duplicate-match.js';
/** @typedef {import('./radar-feed.types.js').OpportunityRow} Row */
/** @typedef {import('./radar-feed.types.js').Snapshot} Snapshot */
/** @param {Snapshot} card */
export function trackerDraft(card) { return {company:card.facts.company ?? card.claims.company ?? '',title:card.facts.job_title ?? card.claims.job_title ?? '',job_url:card.original_url ?? card.discovery_url,location:card.facts.location,compensation_text:card.facts.compensation_text,source:'Career Radar',notes:!card.facts.company || !card.facts.job_title ? 'Company or role was AI-reported and unverified in Career Radar. Confirm against the original posting.':null}; }
/** Keep generic tracking aliases consistent with Radar's identity normalization.
 * @param {Snapshot} card @param {import('./data.js').ProspectIdentity[]} prospects */
export function trackerMatches(card,prospects) {
  const key=opportunityKey(card);
  const exact=prospects.filter(p=>identityKey(p.job_url)===key).map(prospect=>({prospect,strength:'strong',reason:'Same normalized posting identity'}));
  return [...exact,...duplicateCandidates(trackerDraft(card),prospects).filter(m=>!exact.some(e=>e.prospect.id===m.prospect.id))];
}
/** Possible prior Radar reviews remain visible as warnings, never silently merged by name.
 * @param {Snapshot} card @param {Row[]} rows */
export function radarMatches(card,rows) {
  return duplicateCandidates(trackerDraft(card),rows.map(r=>({id:r.id,company:r.snapshot.facts.company ?? r.snapshot.claims.company ?? '',title:r.snapshot.facts.job_title ?? r.snapshot.claims.job_title ?? '',job_url:r.snapshot.original_url ?? r.snapshot.discovery_url,location:r.snapshot.facts.location,status:/** @type {'prospect'|'passed'|'interested'} */(r.decision==='passed'?'passed':r.decision==='accepted'?'interested':'prospect'),applied_on:null,updated_at:r.updated_at})));
}
/** @param {{owner:string,data:ReturnType<typeof import('./radar-feed-data.js').createOpportunityData>,tracker:ReturnType<typeof import('./data.js').createRadarDataAccess>,loadProfile:()=>Promise<{revision:number,reviewed_at:string}|null>,research?:(revision:number,rows:Row[],signal:AbortSignal)=>Promise<unknown>,onChange:()=>void}} options */
export function createFeedController(options) {
  const state={rows:/** @type {Row[]} */([]),prospects:/** @type {import('./data.js').ProspectIdentity[]} */([]),revision:/** @type {number|null} */(null),ready:false,busy:false,phase:'loading',message:'Loading saved opportunities…',lastSearched:/** @type {string|null} */(null),cost:/** @type {number|null} */(null),partial:/** @type {Snapshot[]} */([]),unsaved:/** @type {Snapshot[]} */([]),pending:new Map(),rowBusy:new Set(),handoffChoices:new Map(),notice:''};
  let active=true;const abort=new AbortController();
  const emit=()=>{if(active) options.onChange();};
  /** @param {unknown} error */
  const fail=error=>{state.message=error instanceof Error && error.message.startsWith('Opportunity changed') ? error.message:'Could not finish. Saved results and pending choices are kept. Check your connection and retry.';state.phase='error';};
  /** History failure never falls back to an empty array. Also used immediately before research. */
  async function refresh() {
    state.ready=false;emit();
    try {
      const [rows,prospects,profile]=await Promise.all([options.data.load(options.owner),options.tracker.listProspectIdentities(),options.loadProfile()]);
      if(!active) return;
      state.rows=rows;state.prospects=prospects;state.revision=profile?.reviewed_at ? profile.revision:null;state.ready=true;
      state.phase=rows.length?'ready':'empty';state.message=rows.length?'Saved opportunities loaded.':'No opportunities saved yet.';
    } catch(error) {if(active) {fail(error);state.message='Saved history could not load. Retry before researching; previous cards are kept.';}}finally {emit();}
  }
  /** Save only unseen identities; full persisted decisions suppress beyond the API's 100-item input bound.
   * @param {Snapshot[]} cards */
  async function saveCards(cards) {
    state.unsaved=[...cards];emit();
    for(const card of cards) {
      if(!active) return;
      const key=opportunityKey(card);
      if(state.rows.some(r=>r.identity_key===key)) {state.unsaved=state.unsaved.filter(c=>opportunityKey(c)!==key);continue;}
      // Exact tracked identities stay in Tracker; possible duplicates remain reviewable, explicitly flagged.
      if(trackerMatches(card,state.prospects).some(d=>d.strength==='strong')) {state.unsaved=state.unsaved.filter(c=>opportunityKey(c)!==key);continue;}
      const row=await options.data.insert(options.owner,card,crypto.randomUUID());
      if(!active) return;
      state.rows.push(row);state.unsaved=state.unsaved.filter(c=>opportunityKey(c)!==key);emit();
    }
  }
  async function find() {
    if(!active || state.busy || state.rowBusy.size || state.unsaved.length || !options.research) return;
    state.busy=true;state.partial=[];emit();
    try {
      await refresh();if(!active || !state.ready) return;
      if(!state.revision) throw new Error('Review a profile first.');
      state.phase='running';state.message='Finding opportunities… This may take up to a few minutes.';emit();
      const result=decodeResearch(await options.research(state.revision,state.rows,abort.signal),state.revision);
      if(!active) return;
      state.lastSearched=result.timestamp;state.cost=result.estimated_cost;
      if(result.status==='failed') {state.phase='error';state.message=result.message;return;}
      // Decisions may change in another tab while research is running. Read again before merging.
      await refresh();if(!active || !state.ready) return;
      if(state.revision!==result.profile_revision) throw new Error('Profile changed.');
      if(result.status==='partial') {
        state.partial=result.opportunities.filter(c=>!state.rows.some(r=>r.identity_key===opportunityKey(c)) && !trackerMatches(c,state.prospects).some(d=>d.strength==='strong'));
        state.phase='partial';state.message=result.message;return;
      }
      const before=state.rows.length;await saveCards(result.opportunities);if(!active) return;
      state.phase=state.rows.length>before?'completed':'empty';state.message=state.rows.length>before?`${state.rows.length-before} new opportunities saved.`:'No new opportunities after saved decisions and Tracker duplicates were excluded. Previous opportunities are kept.';
    } catch(error) {if(active) fail(error);}finally {if(active){state.busy=false;emit();}}
  }
  /** @param {Row} row @param {'new'|'accepted'|'passed'} decision @param {string|null} [reason] @param {string|null} [note] */
  async function decide(row,decision,reason=null,note=null) {
    if(!active || state.busy || state.rowBusy.has(row.id)) return;
    state.notice='';state.pending.set(row.id,{decision,reason,note});state.rowBusy.add(row.id);emit();
    try {const saved=await options.data.decide(row,decision,reason,note);if(active){replace(saved);state.pending.delete(row.id);state.notice='';state.phase='ready';state.message='Decision saved.';}}
    catch(error){if(active) fail(error);}finally {if(active){state.rowBusy.delete(row.id);emit();}}
  }
  /** @param {Row} row */
  function replace(row) {state.rows=state.rows.map(r=>r.id===row.id?row:r);}
  /** Explicit only. Stable opportunity UUID reconciles a successful Tracker insert after a lost response.
   * @param {Row} row @param {string|undefined} [choice] Existing candidate UUID, or 'separate' after reviewing possible duplicates. */
  async function handoff(row,choice) {
    if(!active || state.busy || state.rowBusy.has(row.id)) return;
    state.notice='';state.rowBusy.add(row.id);emit();
    try {
      const current=await options.data.get(options.owner,row.id);if(!active) return;
      if(!current || current.decision!=='accepted') throw new Error('Accept this opportunity first.');
      if(current.prospect_id) {replace(current);state.phase='ready';state.message='Already linked to Prospect Tracker; no new record was created.';return;}
      const prospects=await options.tracker.listProspectIdentities();if(!active) return;
      state.prospects=prospects;const matches=trackerMatches(current.snapshot,prospects);
      const strong=matches.filter(m=>m.strength==='strong');
      let target=strong.length===1?strong[0].prospect.id:null;
      if(!choice && (strong.length>1 || !target && matches.length)) {state.handoffChoices.set(row.id,strong.length?strong:matches);return;}
      if(choice && choice!=='separate') {if(!(strong.length?strong:matches).some(m=>m.prospect.id===choice)) throw new Error('Choose a current matching prospect.');target=choice;}
      if(choice==='separate' && strong.length) throw new Error('An exact posting already exists in Tracker.');
      if(!target) {
        const existing=await options.tracker.getProspect(row.id);if(!active) return;
        if(existing) {
          if(!trackerMatches(current.snapshot,[existing]).some(m=>m.strength==='strong')) throw new Error('Tracker identity needs reconciliation.');
        } else {
          await options.tracker.createProspect({id:row.id,...trackerDraft(current.snapshot)},options.owner);
          if(!active) return;
        }
        target=row.id;
      }
      const saved=await options.data.link(current,target);if(!active) return;
      replace(saved);state.handoffChoices.delete(row.id);state.phase='ready';state.message='Linked to Prospect Tracker. Existing Tracker status and history were preserved.';state.notice='';
    } catch(error) {if(active){fail(error);state.notice='Tracker creation may have succeeded. Retry Add to Prospects to reconcile the same identity; no automatic retry was made.';}}
    finally {if(active){state.rowBusy.delete(row.id);emit();}}
  }
  async function retrySave() {if(state.busy || !state.unsaved.length || !active)return;state.busy=true;emit();try{const pending=[...state.unsaved];await refresh();if(active && state.ready){await saveCards(pending);state.message='Results saved.';state.phase='completed';}}catch(e){if(active)fail(e);}finally{if(active){state.busy=false;emit();}}}
  /** Partial leads require an explicit Keep lead action, preserving earlier saved results.
   * @param {Snapshot} card */
  async function keepPartial(card) {if(!active || state.busy)return;state.busy=true;emit();try{await refresh();if(active && state.ready){await saveCards([card]);state.partial=state.partial.filter(c=>opportunityKey(c)!==opportunityKey(card));state.phase='partial';state.message='Partial lead saved for review; previous results kept.';}}catch(e){if(active)fail(e);}finally{if(active){state.busy=false;emit();}}}
  return {state,refresh,find,decide,handoff,retrySave,keepPartial,dispose(){active=false;abort.abort();state.rows=[];state.prospects=[];state.partial=[];state.unsaved=[];state.pending.clear();state.handoffChoices.clear();}};
}
