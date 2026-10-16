import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emptyProfile } from '../career-profile-model.js';
import { checkTarget, safeUrl, identityKey, decisionsInput, LIMITS } from '../research/contract.js';
import { inspectHtml, verifyPosting } from '../research/verify.js';
import { consultation, toolActions, parsedOutput, profileSummary, runResearch, researchRequest, requestResearch } from '../research/run.js';
import { createResearchHandler, createProfileLoader } from '../research/handler.js';

const url = 'https://job-boards.greenhouse.io/sample/jobs/123';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const signal = () => new AbortController().signal;
const row = () => { const explicit_profile = emptyProfile(); explicit_profile.factors.seniority.value = 'Lead Product Designer'; return { explicit_profile, reviewed_at: '2026-10-15T00:00:00Z', revision: 1 }; };
const candidate = (overrides={}) => ({ company: 'Sample', job_title: 'Lead Product Designer', location:null,remote_eligibility:null,compensation_text:null,original_employer_or_ats_url:url,discovery_source_url:url,source_check_timestamp:null,verification_status:'original_page_consulted',why_fit:['Possibly relevant hands-on work.'],concerns_or_unknowns:[],wildcard_rationale:null,evidence:[{field:'job_title',url,support:'Lead Product Designer'}],...overrides });
const html = (extra='') => `<html><title>Lead Product Designer at Sample</title><h1>Lead Product Designer</h1><p>Sample is seeking a hands-on designer to build consumer experiences with engineers and product managers. Remote in the United States. This is a senior individual contributor role.</p>${extra}</html>`;
const response = (text,status=200) => new Response(text,{status,headers:{'Content-Type':'text/html'}});
const provider = (cards=[candidate()],overrides={}) => ({status:'completed',model:'gpt-5.4-mini',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:100},output_tokens:500,output_tokens_details:{reasoning_tokens:100}},output:[{type:'web_search_call',id:'search',status:'completed',action:{type:'search',sources:cards.map(c=>({type:'url',url:c.discovery_source_url}))}},{type:'message',content:[{type:'output_text',annotations:[],text:JSON.stringify({opportunities:cards,research_notes:[]})}]}],...overrides});
const jsonResponse = value => new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const runOptions = fetcher => ({row:row(),decisions:[],focus:'',key:'fake-only',fetcher,signal:signal()});

test('safe display URLs and hosted-only verification reject private and unsafe targets',()=>{
  for (const value of ['http://example.com/job','javascript:alert(1)','https://127.0.0.1/x','https://2130706433/x','https://0x7f000001/x','https://[::1]/x','https://a.local/job','https://user:pass@example.com/x','https://example.com:444/x','https://localhost/x','https://job-boards.greenhouse.io.evil.local/sample/jobs/123']) assert.equal(safeUrl(value),null,value);
  assert.equal(checkTarget('https://employer.com/jobs/123'),null);
  assert.equal(checkTarget('https://job-boards.greenhouse.io.evil.com/sample/jobs/123'),null);
  assert.equal(checkTarget(url+'?redirect=https://127.0.0.1'),url);
  assert.equal(identityKey(url),identityKey('https://boards.greenhouse.io/sample/jobs/123?utm_source=test'));
});

test('soft 404/closed messages override HTTP 200 without treating access failures as closure',()=>{
  for(const message of ['Job not found','Page not found',"The page you are looking for doesn't exist.",'This position is closed','This job is no longer available','No longer accepting applications']) assert.equal(inspectHtml(`<h1>${message}</h1>`,url,'Sample','Lead Product Designer').availability,'unavailable',message);
  assert.equal(inspectHtml('<h1>Access denied</h1>',url,'Sample','Lead Product Designer').availability,'uncertain');
  assert.equal(inspectHtml('<div>You need to enable JavaScript to run this app.</div>',url,'Sample','Lead Product Designer').reason,'javascript_or_unreadable');
  assert.equal(inspectHtml(html('<script>Job not found</script>'),url,'Sample','Lead Product Designer').availability,'uncertain');
  assert.equal(inspectHtml('<h1>Jobs at Sample</h1><p>Lead Product Designer</p>',url,'Sample','Lead Product Designer').availability,'uncertain');
});

test('Apply controls, observed URLs and matching forms are distinct; unrelated forms do not count',()=>{
  const control=inspectHtml(html('<button>Apply now</button>'),url,'Sample','Lead Product Designer');
  assert.deepEqual(control.application,{status:'control_visible',url:null});
  assert.deepEqual(inspectHtml(html('<a href="/apply/123">Apply</a>'),url,'Sample','Lead Product Designer').application,{status:'control_visible',url:'https://job-boards.greenhouse.io/apply/123'});
  assert.equal(inspectHtml(html('<a href="http://127.0.0.1">Apply</a>'),url,'Sample','Lead Product Designer').application.url,null);
  assert.equal(inspectHtml(html('<form><input type="email" name="email"><input type="file" name="resume"></form>'),url,'Sample','Lead Product Designer').application.status,'form_observed');
  assert.equal(inspectHtml(html('<form action="javascript:bad()"><input type="email" name="email"><input type="file" name="resume"></form>'),url,'Sample','Lead Product Designer').application.url,null);
  assert.equal(inspectHtml(html('<form><input name="email"></form>'),url,'Sample','Lead Product Designer').application.status,'not_established');
  assert.equal(inspectHtml(html('<div hidden><form><input type="email" name="email"><input type="file" name="resume"></form></div>'),url,'Sample','Lead Product Designer').application.status,'not_established');
});

test('bounded verification: HTTP errors, manual redirects, unsafe destinations, types, bytes and aborts',async()=>{
  for(const [status,expected] of [[404,'unavailable'],[410,'unavailable'],[403,'uncertain'],[429,'uncertain'],[500,'uncertain']]) {
    const r=await verifyPosting(candidate(),{signal:signal(),fetcher:async()=>response('error',status)}); assert.equal(r.availability,expected);assert.ok(r.checked_at);
  }
  let requests=0;
  const redirected=await verifyPosting(candidate(),{signal:signal(),fetcher:async(target,init)=>{requests++;assert.ok(String(target).startsWith('https://boards-api.greenhouse.io/') || target===url);assert.equal(init.redirect,'manual');return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/'}});}});
  assert.equal(requests,2);assert.equal(redirected.redirect_url,null);assert.equal(redirected.reason,'redirect_not_followed');
  await verifyPosting(candidate({original_employer_or_ats_url:'https://evil.com/job'}),{signal:signal(),fetcher:async()=>{assert.fail('Unsupported host fetched');}});
  const large=await verifyPosting(candidate(),{signal:signal(),fetcher:async()=>response('x'.repeat(LIMITS.verificationBytes+1))}); assert.equal(large.availability,'uncertain');
  const type=await verifyPosting(candidate(),{signal:signal(),fetcher:async()=>jsonResponse({})});assert.equal(type.reason,'retrieval_inconclusive');
  const timeout=await verifyPosting(candidate(),{signal:signal(),timeoutMs:2,fetcher:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error()),{once:true}))});assert.equal(timeout.reason,'timeout_or_cancelled');
  const absent=await verifyPosting(candidate({original_employer_or_ats_url:null}),{signal:signal(),fetcher:async()=>assert.fail()});assert.equal(absent.reason,'missing_original_url');
});

test('trace provenance ignores flags, source membership, find actions and opens of another URL',()=>{
  assert.equal(consultation(url,[]),'unknown');
  const raw=provider();const actions=toolActions(raw);assert.equal(consultation(url,actions),'search_only');
  const open={id:'open',type:'open_page',url,status:'completed',sources:[]};
  assert.equal(consultation(url,[open]),'original_page_consulted');
  assert.equal(consultation(url+'/',[open]),'search_only');
  assert.equal(consultation(url,[{...open,status:'failed'}]),'search_only');
  assert.equal(consultation(url,[{...open,type:'find_in_page'}]),'search_only');
});

test('reviewed profile gates requests, omits inferred history/contacts and preserves importance',()=>{
  assert.throws(()=>profileSummary({...row(),reviewed_at:null}));
  const r=row(); r.explicit_profile.factors.location={value:'US remote; me@example.com',importance:'hard'};r.inferred_signals=['private'];
  const summary=profileSummary(r); assert.equal(summary.factors.location.importance,'hard');assert.ok(!JSON.stringify(summary).includes('me@example.com'));assert.ok(!JSON.stringify(summary).includes('private'));
  r.explicit_profile.factors.location.value='a'.repeat(1201);assert.throws(()=>profileSummary(r));
  const q=researchRequest(profileSummary(row()),'',new Date().toISOString());assert.equal(q.store,false);assert.equal(q.max_tool_calls,6);assert.equal(q.max_output_tokens,6000);assert.equal(q.model,'gpt-5.4-mini');
});

test('single model request and no retries on provider failure; incomplete and invalid outputs are honest',async()=>{
  let calls=0; const options=runOptions(async()=>{calls++;return response('secret-provider-error',500);});
  const r=await runResearch(options);assert.equal(calls,1);assert.equal(r.status,'failed');assert.deepEqual(r.opportunities,[]);assert.ok(!JSON.stringify(r).includes('secret-provider-error'));
  const noSearch=await runResearch(runOptions(async()=>jsonResponse(provider([],{output:[]}))));assert.equal(noSearch.status,'failed');
  const malformed=provider();malformed.output[1].content[0].text='broken';const invalid=await runResearch(runOptions(async()=>jsonResponse(malformed)));assert.equal(invalid.status,'failed');
  const partial=await runResearch(runOptions(async()=>jsonResponse(provider([],{status:'incomplete'}))));assert.equal(partial.status,'failed'); // no sourced search, not an empty success
  const refused=provider();refused.output[1].content=[{type:'refusal',refusal:'no'}];assert.throws(()=>parsedOutput(refused));
});

test('run suppresses duplicate and decided roles before checks, preserves unknown facts and never writes',async()=>{
  const c=candidate();let calls=0;
  const r=await runResearch(runOptions(async(target,init)=>{calls++;if(target==='https://api.openai.com/v1/responses'){assert.equal(init.method,'POST');return jsonResponse(provider([c,c]));}assert.equal(init.method,'GET');return response(html('<button>Apply</button>'));}));
  assert.equal(calls,3);assert.equal(r.suppressed_count,1);assert.equal(r.opportunities.length,1);assert.equal(r.opportunities[0].verification.consultation,'search_only');assert.equal(r.opportunities[0].facts.compensation_text,null);assert.equal(r.opportunities[0].facts.remote_eligibility,null);
  const decisions=decisionsInput([{decision:'pass',original_url:url,company:'Sample',job_title:'Lead Product Designer'}]);const before=structuredClone(decisions);
  const d=await runResearch({...runOptions(async()=>jsonResponse(provider())),decisions});assert.equal(d.suppressed_count,1);assert.deepEqual(d.opportunities,[]);assert.deepEqual(decisions,before);
  const accepted=[{...decisions[0],decision:'accept',original_url:null}];assert.equal((await runResearch({...runOptions(async()=>jsonResponse(provider())),decisions:accepted})).suppressed_count,1);
});

test('unavailable roles rejected; blocked/unsupported remain uncertain and completed; unsupported facts cleared',async()=>{
  const missing=await runResearch(runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider()):response('<h1>Job not found</h1>')));assert.equal(missing.rejected_count,1);assert.equal(missing.opportunities.length,0);
  const blocked=await runResearch(runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider()):response('Access denied',403)));assert.equal(blocked.status,'completed');assert.equal(blocked.opportunities[0].verification.availability,'uncertain');assert.equal(blocked.opportunities[0].facts.company,null);
  const c=candidate({compensation_text:'$200,000',evidence:[{field:'compensation',url,support:'salary visible'}]});const uncertain=await runResearch(runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider([c])):response('shell')));assert.equal(uncertain.opportunities[0].facts.compensation_text,null);
});

const request = (input={profile_revision:1,decisions:[]},token='session') => new Request('https://function.example/research',{method:'POST',headers:{Origin:'https://site.example','Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(input)});
const handlerOptions = (overrides={}) => ({ownerId:owner,allowedOrigins:['https://site.example'],key:'fake-key',enabled:true,billingConfirmed:true,authenticate:async()=>owner,loadProfile:async()=>row(),fetcher:async(target)=>target.includes('api.openai')?jsonResponse(provider()):response(html()),...overrides});

test('HTTP preflight: configuration, owner/auth/origin/review/revision and decision validation block paid calls',async()=>{
  for(const [overrides,status] of [[{enabled:false},503],[{billingConfirmed:false},503],[{authenticate:async()=>null},401],[{authenticate:async()=> 'another-owner'},403],[{loadProfile:async()=>({...row(),reviewed_at:null})},409],[{loadProfile:async()=>({...row(),revision:2})},409]]) {
    const handler=createResearchHandler(handlerOptions({...overrides,fetcher:async()=>assert.fail('Paid call before preflight')}));assert.equal((await handler(request())).status,status);
  }
  const handler=createResearchHandler(handlerOptions({fetcher:async()=>assert.fail()}));
  assert.equal((await handler(new Request('https://function.example',{method:'OPTIONS',headers:{Origin:'https://evil.example'}}))).status,403);
  assert.equal((await handler(request({profile_revision:1,decisions:[{decision:'pass',original_url:'http://127.0.0.1',company:null,job_title:null}]}))).status,400);
});

test('profile rechecked after run, stale results discarded; local cooldown prevents a second POST',async()=>{
  let reads=0,posts=0;const handler=createResearchHandler(handlerOptions({loadProfile:async()=>({...row(),revision:++reads===1?1:2}),fetcher:async(target)=>{if(target.includes('api.openai')){posts++;return jsonResponse(provider());}return response(html());}}));
  const r=await(await handler(request())).json();assert.equal(r.status,'failed');assert.deepEqual(r.opportunities,[]);assert.equal(posts,1);
  const current=createResearchHandler(handlerOptions());assert.equal((await current(request())).status,200);assert.equal((await current(request())).status,429);
});

test('profile loader uses only public key and user JWT, ownership filter, no signals or writes',async()=>{
  const loader=createProfileLoader({supabaseUrl:'https://project.supabase.co',publishableKey:'public'},async(target,init)=>{
    assert.ok(target.includes('owner_id=eq.'));assert.ok(!target.includes('inferred'));assert.equal(init.headers.Authorization,'Bearer user');assert.equal(init.redirect,'manual');assert.ok(!init.method || init.method==='GET');return jsonResponse([row()]);
  });assert.equal((await loader('user',owner,signal())).revision,1);
});

test('aborted requestResearch makes zero calls and never retries',async()=>{
  const c=new AbortController();c.abort();let calls=0;await assert.rejects(requestResearch(researchRequest(profileSummary(row()),'','now'),{key:'fake',signal:c.signal,fetcher:async()=>{calls++;return jsonResponse({});}}));assert.equal(calls,0);
});

// Public synthetic captures preserve #27's trace shape without private artifacts or temp paths.
for (const [name,mismatches] of [['experiment-1',4],['experiment-2',3]]) {
  test(`synthetic #27 provenance regression: ${mismatches} unsupported flags`,async()=>{
    const raw=JSON.parse(await readFile(new URL(`fixtures/research/${name}.json`,import.meta.url),'utf8'));
    const p=parsedOutput(raw),actions=toolActions(raw);
    assert.equal(p.opportunities.filter(c=>c.verification_status!==consultation(c.original_employer_or_ats_url,actions)).length,mismatches);
  });
}

test('zero results is a valid completed sourced search; incomplete but parseable output stays partial',async()=>{
  const raw=provider([]);raw.output[0].action.sources=[{type:'url',url}];
  assert.equal((await runResearch(runOptions(async()=>jsonResponse(raw)))).status,'completed');
  const incomplete=await runResearch(runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider([candidate()],{status:'incomplete'})):response(html())));
  assert.equal(incomplete.status,'partial');assert.equal(incomplete.opportunities.length,1);
});

test('at most three GETs per candidate; malformed oversize result arrays and response bytes fail closed',async()=>{
  const cards=Array.from({length:5},(_,i)=>candidate({original_employer_or_ats_url:url+(i+1),discovery_source_url:url+(i+1),evidence:[]}));
  let gets=0;
  const r=await runResearch(runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider(cards)):(gets++,response(html()))));
  assert.equal(gets,10);assert.equal(r.opportunities.length,5);
  const tooMany=await runResearch(runOptions(async()=>jsonResponse(provider([...cards,candidate()]))));assert.equal(tooMany.status,'failed');
  const tooLarge=await runResearch(runOptions(async()=>new Response('x'.repeat(LIMITS.responseBytes+1))));assert.equal(tooLarge.status,'failed');
});

test('unsupported source URLs and extra wildcards are rejected without outgoing checks',async()=>{
  const c=candidate({wildcard_rationale:'Adjacent fit'}), c2=candidate({original_employer_or_ats_url:url+'4',discovery_source_url:url+'4',wildcard_rationale:'Another wildcard'});
  let gets=0;const r=await runResearch(runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider([c,c2])):(gets++,response(html()))));assert.equal(gets,2);assert.equal(r.rejected_count,1);assert.equal(r.status,'completed');
  const raw=provider();raw.output[0].action.sources=[{type:'url',url:'https://other.com/job'}];const bad=await runResearch(runOptions(async()=>jsonResponse(raw)));assert.equal(bad.rejected_count,1);assert.deepEqual(bad.opportunities,[]);
});

test('model deadline aborts once at 120 seconds, without an actual wait or second request',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let calls=0;
  const pending=requestResearch(researchRequest(profileSummary(row()),'','now'),{key:'fake',signal:signal(),fetcher:async(_url,init)=>{calls++;return new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}});
  t.mock.timers.tick(LIMITS.modelTimeoutMs);await assert.rejects(pending);assert.equal(calls,1);
});

test('distinct known postings with identical company/title do not erase each other through name fallback',async()=>{
  const decisions=[{decision:'accept',original_url:url+'999',company:'Sample',job_title:'Lead Product Designer'}];
  const r=await runResearch({...runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider()):response(html())),decisions});
  assert.equal(r.suppressed_count,0);assert.equal(r.opportunities.length,1);
});

test('reviewed unknown-compensation exclusion is enforced independently of the model',async()=>{
  const profile=row();profile.explicit_profile.compensation.unknown='exclude';
  const r=await runResearch({...runOptions(async(target)=>target.includes('api.openai')?jsonResponse(provider()):response(html())),row:profile});assert.equal(r.suppressed_count,1);assert.deepEqual(r.opportunities,[]);
});

const structured = overrides => ({id:123,company_name:'Sample',title:'Lead Product Designer',location:{name:'Remote — United States'},content:'<p>Design products</p>',...overrides});
const structuredFetcher = (cards=[candidate()], posting=structured(), page=html()) => async target => target.includes('api.openai') ? jsonResponse(provider(cards)) : target.includes('boards-api.greenhouse') ? jsonResponse(posting) : response(page);

test('structured facts supersede paraphrased/contradictory AI claims without substring inference',async()=>{
  for (const support of ['Compensation is competitive.', 'This role is NOT remote and NOT paying $200K.']) {
    const c=candidate({location:'Moon',remote_eligibility:'Remote',compensation_text:'$200K',evidence:[{field:'remote_eligibility',url,support}]});
    const r=await runResearch(runOptions(structuredFetcher([c]))), card=r.opportunities[0];
    assert.equal(card.facts.location,'Remote — United States');assert.equal(card.facts.remote_eligibility,null);assert.equal(card.facts.compensation_text,null);
    assert.equal(card.claims.location,'Moon');assert.equal(card.claims.compensation_text,'$200K');assert.equal(card.verification.work_arrangement,'remote');
    assert.ok(card.evidence.some(e=>e.origin==='independent_check' && e.field==='location'));
  }
  const r=await runResearch(runOptions(structuredFetcher([candidate()],structured({company_name:null}))));
  assert.equal(r.opportunities[0].facts.company,null);assert.equal(r.opportunities[0].claims.company,'Sample');
  const mismatch=await runResearch(runOptions(structuredFetcher([candidate()],structured({title:'Engineering Manager'}))));
  assert.deepEqual(mismatch.opportunities[0].assessment.why_fit,[]);assert.equal(mismatch.opportunities[0].facts.job_title,'Engineering Manager');
});

test('structured pay, not unsupported AI pay, determines unknown-compensation exclusion',async()=>{
  const profile=row();profile.explicit_profile.compensation.unknown='exclude';
  const c=candidate({compensation_text:'$500K'});
  const missing=await runResearch({...runOptions(structuredFetcher([c])),row:profile});assert.equal(missing.opportunities.length,0);
  const pay=structured({pay_input_ranges:[{min_cents:17500000,max_cents:20000000,currency_type:'USD'}]});
  const found=await runResearch({...runOptions(structuredFetcher([c],pay)),row:profile});assert.equal(found.opportunities.length,1);assert.match(found.opportunities[0].facts.compensation_text,/175,000/);
});

test('closed Ashby/Workday structured postings rejected without trusting JavaScript shells',async()=>{
  const ashby='https://jobs.ashbyhq.com/sample/11111111-1111-4111-8111-111111111111';
  const workday='https://sample.wd5.myworkdayjobs.com/careers/job/Remote/Designer_R123';
  for (const [original,data] of [[ashby,{apiVersion:'1',jobs:[]}],[workday,{jobPostingInfo:{jobPostingId:'Designer_R123',jobPostingSiteId:'careers',posted:false}}]]) {
    let calls=0;
    const r=await verifyPosting(candidate({original_employer_or_ats_url:original}),{signal:signal(),fetcher:async(_target,init)=>{calls++;assert.equal(init.redirect,'manual');assert.equal(init.headers.Authorization,undefined);return jsonResponse(data);}});
    assert.equal(r.availability,'unavailable',original);assert.equal(calls,1);
  }
});

test('soft 404 and long closure override structured success; JS/blocked HTML never creates facts',async()=>{
  for (const page of ['<h1>Page not found</h1>',html('<p>'+ 'text '.repeat(1000)+'No longer accepting applications</p>')]) {
    const r=await verifyPosting(candidate(),{signal:signal(),fetcher:structuredFetcher([],structured(),page)});assert.equal(r.availability,'unavailable');
  }
  for (const page of ['<div>Enable JavaScript to continue</div>','<h1>Access denied</h1>']) {
    const r=await verifyPosting(candidate(),{signal:signal(),fetcher:async target=>target.includes('boards-api')?jsonResponse({}):response(page)});
    assert.equal(r.availability,'uncertain');assert.equal(r.facts.job_title,null);
  }
  // A structured posting remains evidence even if the HTML is only a JavaScript shell.
  const good=await verifyPosting(candidate(),{signal:signal(),fetcher:structuredFetcher([],structured(),'<p>Enable JavaScript</p>')});
  assert.equal(good.availability,'appears_available');assert.equal(good.application.status,'not_established');
});

test('server strips model verification narratives including evidence and wildcard text',async()=>{
  const falseClaims=['Current as of the page open','The original posting was verified','The application page was consulted','Applications are open','The original posting was opened','This vacancy is open','The posting was confirmed'];
  const c=candidate({why_fit:['Good design scope',...falseClaims],concerns_or_unknowns:falseClaims,wildcard_rationale:falseClaims[0],evidence:[{field:'location',url,support:falseClaims[1]}]});
  const r=await runResearch(runOptions(structuredFetcher([c]))), card=r.opportunities[0];
  assert.deepEqual(card.assessment.why_fit,['Good design scope']);assert.equal(card.assessment.wildcard_rationale,null);assert.equal(card.verification.consultation,'search_only');
  for(const text of falseClaims) assert.ok(!JSON.stringify(card.assessment).includes(text));
  assert.ok(!card.evidence.some(e=>e.support===falseClaims[1]));
});

test('returned discovery-only lead round trips through Accept and Pass suppression',async()=>{
  const c=candidate({original_employer_or_ats_url:null,discovery_source_url:'https://employer.com/jobs/design',evidence:[]});
  const r=await runResearch(runOptions(async()=>jsonResponse(provider([c])))), card=r.opportunities[0];
  assert.equal(r.status,'completed');assert.equal(card.facts.company,null);assert.equal(card.claims.company,'Sample');
  for(const decision of ['accept','pass']) {
    const decisions=decisionsInput([{...card.decision_identity,decision}]);
    const next=await runResearch({...runOptions(async()=>jsonResponse(provider([c]))),decisions});assert.equal(next.opportunities.length,0);assert.equal(next.suppressed_count,1);
  }
});

test('rejected duplicates do not suppress valid ones in either ordering',async()=>{
  const bad=candidate({discovery_source_url:'https://absent.com/jobs/123'}), good=candidate();
  for(const cards of [[bad,good],[good,bad]]) {
    const raw=provider(cards);raw.output[0].action.sources=[{type:'url',url}];
    const r=await runResearch(runOptions(async target=>target.includes('api.openai')?jsonResponse(raw):target.includes('boards-api')?jsonResponse(structured()):response(html())));
    assert.equal(r.opportunities.length,1);assert.equal(r.opportunities[0].discovery_url,url);
  }
  let checks=0;
  const r=await runResearch(runOptions(async target=>target.includes('api.openai')?jsonResponse(provider([candidate(),candidate()])):target.includes('boards-api')? (++checks===1 ? response('gone',404):jsonResponse(structured())):response(html())));
  assert.equal(r.opportunities.length,1);assert.equal(r.rejected_count,1);
});

test('hidden-only, disabled fields and disabled fieldsets are not plausible application forms',()=>{
  for(const fields of ['<input type="hidden" name="email"><input type="hidden" name="resume">','<input type="email" disabled><input type="file" name="resume">','<fieldset disabled><input type="email"><input type="file" name="resume"></fieldset>']) {
    assert.equal(inspectHtml(html(`<form>${fields}</form>`),url,'Sample','Lead Product Designer').application.status,'not_established');
  }
  const form='<form><input type="email" name="email"><input type="file" name="resume"></form>';
  assert.equal(inspectHtml(html(form),url,'Sample','Lead Product Designer').application.status,'form_observed');
  assert.equal(inspectHtml(html('<a href="/apply">Apply</a>'),url,'Sample','Lead Product Designer').application.status,'control_visible');
});

test('prompt uses reviewed preferences and bounded supplied exclusions; server keeps all decisions',()=>{
  const profile=row();profile.explicit_profile.factors.seniority.value='Junior illustrator';
  const decisions=Array.from({length:100},()=>({decision:'pass',original_url:url,company:'Sample',job_title:'Lead Product Designer'}));
  const q=researchRequest(profileSummary(profile),'Children books','now',decisions);
  for(const hardcoded of ['Portland','$175K','Senior/Staff','healthcare']) assert.ok(!q.instructions.includes(hardcoded));
  const input=JSON.parse(q.input);assert.equal(input.exclusions.length,20);assert.equal(input.reviewed_profile.factors.seniority.value,'Junior illustrator');assert.equal(input.search_focus,'Children books');
});

test('verification deadline preserves earlier cards and rechecks profile with a fresh bounded signal',async()=>{
  let reads=0;
  const c=candidate({original_employer_or_ats_url:null,discovery_source_url:'https://employer.com/job'});
  const handler=createResearchHandler(handlerOptions({workTimeoutMs:10,loadProfile:async(_token,_owner,s)=>{assert.equal(s.aborted,false);reads++;return row();},fetcher:async(target,init)=>target.includes('api.openai')?jsonResponse(provider([c,candidate()])):new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error()),{once:true}))}));
  const r=await(await handler(request())).json();assert.equal(reads,2);assert.equal(r.status,'partial');assert.equal(r.error_code,'timeout');assert.ok(r.opportunities.some(x=>x.discovery_url===c.discovery_source_url));
});

test('safe diagnostic codes distinguish provider, malformed response, missing search and profile mismatch',async()=>{
  const broken=provider();broken.output[1].content[0].text='broken';
  for(const [response,code] of [[()=>new Response('private upstream error',{status:500}),'provider_failure'],[()=>jsonResponse(broken),'invalid_structured_output'],[()=>jsonResponse(provider([])),'missing_search']]) {
    const r=await runResearch(runOptions(async()=>response()));assert.equal(r.error_code,code);assert.ok(!JSON.stringify(r).includes('private upstream'));
  }
  let reads=0;
  const handler=createResearchHandler(handlerOptions({loadProfile:async()=>({...row(),revision:++reads})}));
  const r=await(await handler(request())).json();assert.equal(r.error_code,'profile_mismatch');assert.equal(r.status,'failed');
});

test('research reuses all five adapters with bounded credential-free manual GETs and structured facts',async()=>{
  const load=async path=>JSON.parse(await readFile(new URL(`fixtures/${path}`,import.meta.url),'utf8'));
  const ashby=await load('ashby/board.json'),lever=await load('lever/posting.json'),workday=await load('workday/posting.json');
  const cases=[
    ['greenhouse','https://boards.greenhouse.io/example/jobs/12345',await load('greenhouse/posting.json')],
    ['ashby',ashby.jobs[1].jobUrl,ashby],['lever',lever.hostedUrl,lever],
    ['workday',workday.jobPostingInfo.externalUrl,workday],['workable','https://apply.workable.com/example/j/ABC123DEF4/',await load('workable/posting.json')]
  ];
  for(const [name,original,data] of cases) {
    let requests=0;
    const r=await verifyPosting(candidate({original_employer_or_ats_url:original}),{signal:signal(),fetcher:async(target,init)=>{
      requests++;assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');
      assert.deepEqual(Object.keys(init.headers),['Accept']);
      if (requests===1) return jsonResponse(data);
      if(name==='workable' && requests===2) return jsonResponse(await load('workable/account.json'));
      if(name==='greenhouse') return response('<p>Enable JavaScript</p>');
      if(name==='workable') return response(html());
      return response(await readFile(new URL(`fixtures/${name}/posting.html`,import.meta.url),'utf8'));
    }});
    assert.equal(r.availability,'appears_available',name);assert.ok(r.facts.job_title,name);assert.ok(requests<=3,name);assert.equal(r.source_urls.length,requests);
    assert.equal(r.facts.remote_eligibility,null,name);
  }
});

test('reserved profile recheck timeout fails closed and never leaks partial cards',async()=>{
  let reads=0;
  const handler=createResearchHandler(handlerOptions({recheckTimeoutMs:2,loadProfile:async(_token,_owner,s)=>++reads===1?row():new Promise((_resolve,reject)=>s.addEventListener('abort',()=>reject(new Error('private details')),{once:true}))}));
  const r=await(await handler(request())).json();assert.equal(r.error_code,'profile_mismatch');assert.equal(r.status,'failed');assert.deepEqual(r.opportunities,[]);assert.ok(!JSON.stringify(r).includes('private details'));
});
