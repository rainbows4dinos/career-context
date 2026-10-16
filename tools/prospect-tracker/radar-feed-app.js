import { createOpportunityData } from './radar-feed-data.js';
import { createRadarDataAccess } from './data.js';
import { createCareerProfileData } from './career-profile-data.js';
import { createFeedController, trackerMatches, radarMatches } from './radar-feed-controller.js';
import { PASS_REASONS } from './radar-feed-model.js';
import { gravityIcon } from '../shared/icons.mjs';
import { safeUrl } from './research/contract.js';
/** @param {string} tag @param {string} [text] @param {string} [className] */
function node(tag,text='',className='') {const el=document.createElement(tag);el.textContent=text;el.className=className;return el;}
/** @param {string} label @param {()=>void} action @param {boolean} [disabled] @param {string} [variant] */
function button(label,action,disabled=false,variant='secondary') {const el=document.createElement('button');el.type='button';el.textContent=label;el.className=`nc-button nc-button--${variant} nc-button--lg`;el.disabled=disabled;el.addEventListener('click',action);return el;}
/** @param {string} label @param {string|null} href */
function link(label,href) {const safe=safeUrl(href);if(!safe)return node('span',`${label} unavailable`);const el=document.createElement('a');el.textContent=label;el.href=safe;el.target='_blank';el.rel='noopener noreferrer';return el;}
/** @param {string} timestamp */
const date=timestamp=>new Date(timestamp).toLocaleString();
/** Mounted with an injected mock research function only by the local acceptance harness.
 * @param {HTMLElement} root
 * @param {{client:ReturnType<typeof import('./supabase-client.js').getRadarClient> extends Promise<infer C>?C:never,research?:(revision:number,rows:import('./radar-feed.types.js').OpportunityRow[],signal:AbortSignal)=>Promise<unknown>}} options */
export async function mountRadarFeed(root,options) {
  const client=options.client,data=createOpportunityData(client),tracker=createRadarDataAccess(client),profiles=createCareerProfileData(client);
  /** @type {ReturnType<typeof createFeedController>|null} */ let controller=null;
  const focusResults=()=>root.querySelector('h3')?.focus();
  let owner=/** @type {string|null} */(null),view='new',generation=0,disposed=false;
  /** @type {Map<string,{reason:string,note:string}>} */ const drafts=new Map();
  function render() {
    if(!controller)return;const c=controller,s=c.state;
    const top=node('section','','panel radar-introduction');top.append(node('h2','Find your next opportunity'),node('p','Review promising leads, record your interest, and choose when to add one to Prospect Tracker.'));
    const controls=node('div','','radar-actions');
    controls.append(button(s.busy?'Working…':'Find Opportunities',()=>{void c.find();},!options.research || !s.ready || !s.revision || s.busy || !!s.rowBusy.size || !!s.unsaved.length,'primary'));
    controls.append(button('Reload saved history',()=>{void c.refresh();},s.busy || !!s.rowBusy.size));top.append(controls);
    if(!options.research)top.append(node('p','Live discovery is disabled. Saved opportunities can still be reviewed.','muted'));
    if(!s.revision)top.append(node('p','Review and save your career profile below before researching. Discovery uses the last saved reviewed profile.','muted'));
    const latest=s.rows.map(r=>r.snapshot.searched_at).sort().at(-1);
    top.append(node('p',s.lastSearched?`Last searched this session: ${date(s.lastSearched)}`:latest?`Latest saved discovery: ${date(latest)}`:'No saved search results yet.','muted'));
    if(s.cost!==null)top.append(node('p',`Estimated research cost: $${s.cost.toFixed(3)} USD; not invoice-confirmed.`,'muted'));
    const status=node('p',s.message,'radar-status');status.dataset.state=s.phase;status.setAttribute('role',s.phase==='error'?'alert':'status');status.setAttribute('aria-live','polite');
    if(s.notice)top.append(node('p',s.notice,'radar-status'));
    top.append(status);
    if(s.unsaved.length)top.append(node('p',`${s.unsaved.length} results are not saved yet. Keep this tab open and retry saving; no new research call is needed.`),button('Retry saving results',()=>{void c.retrySave();},s.busy || !s.ready));
    const filters=node('div','','radar-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Opportunity views');
    for(const [value,label] of [['new','New'],['accepted','Accepted'],['passed','Passed'],['all','All']]) {
      const count=s.rows.filter(r=>value==='all' || r.decision===value).length;
      const b=button(`${label} (${count})`,()=>{view=value;render();root.querySelector('h3')?.focus();});b.setAttribute('aria-pressed',String(view===value));filters.append(b);
    }
    const list=node('section','','radar-results');list.setAttribute('aria-label','Saved opportunities');
    const heading=node('h3',`${view==='all'?'All':view[0].toUpperCase()+view.slice(1)} opportunities`);heading.tabIndex=-1;list.append(heading);
    const rows=s.rows.filter(r=>view==='all' || r.decision===view).sort((a,b)=>b.created_at.localeCompare(a.created_at));
    if(!rows.length)list.append(node('p',s.ready?'No opportunities in this view. Your other saved views are unchanged.':'Saved history is unavailable until loading succeeds.'));
    for(const row of rows)list.append(card(row.snapshot,row));
    const partial=node('section','','radar-results');
    if(s.partial.length) {partial.append(node('h3','Partial leads — not saved'),node('p','Earlier results are kept. Choose Keep lead to save one for review.'));for(const snapshot of s.partial)partial.append(card(snapshot,null));}
    const unsaved=node('section','','radar-results');
    if(s.unsaved.length) {unsaved.append(node('h3','Results awaiting save'));for(const snapshot of s.unsaved)unsaved.append(card(snapshot,null,false));}
    root.setAttribute('aria-busy',String(s.busy));root.replaceChildren(top,filters,list,partial,unsaved);
    /** @param {import('./radar-feed.types.js').Snapshot} snapshot @param {import('./radar-feed.types.js').OpportunityRow|null} row @param {boolean} [keep] */
    function card(snapshot,row,keep=true) {
      const article=node('article','','panel radar-card');if(row)article.dataset.opportunityId=row.id;article.tabIndex=-1;
      article.append(node('h4',snapshot.facts.job_title ?? snapshot.claims.job_title ?? 'Role unknown'),node('p',snapshot.facts.company ?? snapshot.claims.company ?? 'Company unknown','radar-company'));
      if(!snapshot.facts.company || !snapshot.facts.job_title)article.append(node('p','Company or role is AI-reported and unverified.','muted'));
      if(row)article.append(node('p',`Review: ${row.decision}${row.pass_reason?` · ${PASS_REASONS[/** @type {keyof typeof PASS_REASONS} */(row.pass_reason)]}`:''}${row.pass_note?` · ${row.pass_note}`:''}`,'muted'));
      for(const [field,label] of [['location','Location'],['remote_eligibility','Remote eligibility'],['compensation_text','Stated compensation']]) {
        const fact=snapshot.facts[/** @type {'location'|'remote_eligibility'|'compensation_text'} */(field)];
        article.append(node('p',`${label}: ${fact ?? 'Unknown'}`));
        const claim=snapshot.claims[/** @type {'location'|'remote_eligibility'|'compensation_text'} */(field)];
        if(claim && claim!==fact)article.append(node('p',`AI-reported ${field==='compensation_text'?'compensation':label.toLowerCase()} (unverified): ${claim}`,'muted'));
      }
      const v=snapshot.verification;
      const verification=document.createElement('details');verification.className='radar-verification';verification.append(node('summary','Verification and sources'));
      article.append(node('p',`${v.availability==='appears_available'?'Original posting details found':v.availability==='unavailable'?'Posting unavailable':'Availability uncertain'} · Checked ${date(v.checked_at)}`));
      verification.append(node('p',v.availability==='appears_available'?'Posting details were independently retrieved. Availability may have changed.':'Automatic checks could not establish availability. Review the original source before pursuing this lead.','muted'));
      verification.append(node('p',v.consultation==='original_page_consulted'?'Research consulted the original link; this does not prove availability.':v.consultation==='search_only'?'Research sources: search results only.':'Original-source consultation is unknown.','muted'));
      verification.append(node('p',v.application.status==='form_observed'?'Plausible application form observed; submission was not tested.':v.application.status==='control_visible'?'Apply control observed; a usable form was not established.':'Application route not established.','muted'));
      if(v.application.url)verification.append(link('Observed application route',v.application.url));
      for(const [title,items] of [['Why it may fit',snapshot.assessment.why_fit],['Concerns and unknowns',snapshot.assessment.concerns_or_unknowns]]) {
        article.append(node('h5',/** @type {string} */(title)));const ul=node('ul');for(const text of /** @type {string[]} */(items))ul.append(node('li',text));if(!ul.children.length)ul.append(node('li','No supported assessment supplied.'));article.append(ul);
      }
      if(snapshot.assessment.wildcard_rationale)article.append(node('p',`Wildcard: ${snapshot.assessment.wildcard_rationale}`));
      const sources=node('div','','radar-sources');sources.append(link('Original posting',snapshot.original_url),link('Discovery source',snapshot.discovery_url));
      for(const source of snapshot.sources)sources.append(link(`${source.field} · ${source.origin==='independent_check'?'independent source':'AI-attributed source'}`,source.url));verification.append(sources);article.append(verification);
      const matches=trackerMatches(snapshot,s.prospects);
      if(matches.length) {article.append(node('p','Possible or existing Tracker matches — review before adding.','muted'));for(const match of matches){const a=document.createElement('a');a.href=`prospect-tracker/#/prospects/${match.prospect.id}`;a.textContent=`${match.prospect.company} · ${match.prospect.title} (${match.strength})`;article.append(a);}}
      const prior=radarMatches(snapshot,s.rows.filter(r=>r.id!==row?.id));
      if(prior.length){article.append(node('p','Possible prior Radar review — compare before deciding.','muted'));for(const match of prior){const previous=s.rows.find(r=>r.id===match.prospect.id);article.append(button(`View prior ${previous?.decision ?? 'saved'} review`,()=>{view='all';render();const target=root.querySelector(`[data-opportunity-id="${match.prospect.id}"]`);if(target instanceof window.HTMLElement){target.focus();target.scrollIntoView({block:'center'});}}));}}
      if(!row) {if(keep)article.append(button('Keep lead',()=>{void c.keepPartial(snapshot);},s.busy || !s.ready));return article;}
      const busy=s.busy || s.rowBusy.has(row.id) || !s.ready;
      const actions=node('div','','radar-actions');
      if(row.decision!=='accepted')actions.append(button('Accept',()=>{void c.decide(row,'accepted').then(focusResults);},busy,'primary'));
      if(row.decision!=='passed')actions.append(button('Pass',()=>{const draft=drafts.get(row.id);void c.decide(row,'passed',draft?.reason || null,draft?.note || null).then(focusResults);},busy));
      if(row.decision!=='new')actions.append(button('Return to New',()=>{void c.decide(row,'new').then(focusResults);},busy));
      if(row.decision==='accepted' && !row.prospect_id)actions.append(button('Add to Prospects',()=>{void c.handoff(row);},busy));
      if(row.prospect_id) {const a=document.createElement('a');a.href=`prospect-tracker/#/prospects/${row.prospect_id}`;a.textContent='Open in Prospect Tracker';actions.append(a);article.append(node('p','Changing the Radar decision does not remove or change the linked Tracker record.','muted'));}
      article.append(actions);
      const feedback=document.createElement('details');feedback.append(node('summary',row.decision==='passed'?'Edit optional Pass feedback':'Optional Pass reason'));
      const reason=document.createElement('select');reason.className='nc-select';reason.setAttribute('aria-label','Optional Pass reason');
      for(const [value,label] of [['','No reason'],...Object.entries(PASS_REASONS)]){const option=document.createElement('option');option.value=value;option.textContent=label;reason.append(option);}
      const note=document.createElement('textarea');note.className='nc-textarea';note.maxLength=500;note.setAttribute('aria-label','Optional Pass note');
      const pending=s.pending.get(row.id),draft=drafts.get(row.id);reason.value=draft?.reason ?? pending?.reason ?? row.pass_reason ?? '';note.value=draft?.note ?? pending?.note ?? row.pass_note ?? '';reason.disabled=busy;note.disabled=busy;
      const remember=()=>drafts.set(row.id,{reason:reason.value,note:note.value});reason.addEventListener('change',remember);note.addEventListener('input',remember);
      reason.id=`pass-reason-${row.id}`;note.id=`pass-note-${row.id}`;
      const reasonLabel=document.createElement('label');reasonLabel.htmlFor=reason.id;reasonLabel.textContent='Reason (optional)';reasonLabel.className='nc-field__label';
      const noteLabel=document.createElement('label');noteLabel.htmlFor=note.id;noteLabel.textContent='Note (optional)';noteLabel.className='nc-field__label';
      const selectWrap=node('span','','nc-select-wrap');selectWrap.append(reason,gravityIcon('chevron-down'));
      feedback.append(reasonLabel,selectWrap,noteLabel,note);if(row.decision==='passed')feedback.append(button('Save Pass feedback',()=>{void c.decide(row,'passed',reason.value || null,note.value || null);},busy));article.append(feedback);
      if(pending)article.append(node('p',`Unsaved choice: ${pending.decision}. Your choice is kept until saving succeeds.`),button('Retry decision',()=>{void c.decide(row,pending.decision,pending.reason,pending.note);},busy));
      const choices=s.handoffChoices.get(row.id);
      if(choices){const area=node('div','','radar-duplicate-choices');area.append(node('p','Choose an existing Tracker record, or create a separate one only if these are different postings.'));for(const match of choices)area.append(button(`Use ${match.prospect.company} — ${match.prospect.title}`,()=>{void c.handoff(row,match.prospect.id);},busy));if(!choices.some(/** @param {{strength:string}} m */m=>m.strength==='strong'))area.append(button('Create separate prospect',()=>{void c.handoff(row,'separate');},busy));article.append(area);}
      return article;
    }
  }
  /** Auth callback clears private content immediately; database work starts outside the SDK callback lock.
   * @param {string|null} id */
  function ownerChanged(id) {
    if(disposed || owner===id && controller)return;
    controller?.dispose();controller=null;owner=id;drafts.clear();view='new';const epoch=++generation;
    root.replaceChildren(node('p',id?'Loading private opportunities…':'Sign in using Log In in the header to review private opportunities.'));
    if(!id)return;
    window.setTimeout(()=>{
      if(disposed || epoch!==generation)return;
      controller=createFeedController({owner:id,data,tracker,loadProfile:async()=>{const row=await profiles.load(id);return row ? {revision:row.revision,reviewed_at:row.reviewed_at}:null;},research:options.research,onChange:render});
      void controller.refresh();
    },0);
  }
  const {data:subscription}=client.auth.onAuthStateChange((_event,session)=>ownerChanged(session?.user.id ?? null));
  const hasPending=()=>!!controller && (!!controller.state.pending.size || !!controller.state.unsaved.length || !!controller.state.rowBusy.size);
  const beforeUnload=/** @param {BeforeUnloadEvent} event */event=>{if(hasPending()){event.preventDefault();event.returnValue='';}};
  const beforeSignOut=/** @param {Event} event */event=>{if(hasPending() && !window.confirm('Leave without saving pending Radar choices?'))event.preventDefault();};
  window.addEventListener('beforeunload',beforeUnload);window.addEventListener('nextchapter:before-sign-out',beforeSignOut);
  const saved=()=>{if(controller && !controller.state.busy && !controller.state.rowBusy.size)void controller.refresh();};
  window.addEventListener('nextchapter:profile-saved',saved);
  let authChanged=false;
  // getSession may race a sign-out; a generation change prevents stale restoration.
  const epoch=generation;
  try {const {data:session,error}=await client.auth.getSession();authChanged=generation!==epoch;if(error)throw error;if(!authChanged)ownerChanged(session.session?.user.id ?? null);}
  catch{if(!authChanged)root.replaceChildren(node('p','Could not load your session. Reload to retry.'));}
  return ()=>{disposed=true;generation++;controller?.dispose();subscription.subscription.unsubscribe();window.removeEventListener('nextchapter:profile-saved',saved);window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('nextchapter:before-sign-out',beforeSignOut);root.replaceChildren();};
}
