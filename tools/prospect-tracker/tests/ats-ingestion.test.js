import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recognizePosting, samePosting } from '../ingestion/posting-url.js';
import { ingestPosting } from '../ingestion/pipeline.js';
import { selectAshbyPosting, normalizeAshby } from '../ingestion/ashby.js';
import { validateLeverPosting, normalizeLever } from '../ingestion/lever.js';
import { postingMetadata } from '../ingestion/posting-metadata.js';
import { createIngestionHandler } from '../ingestion/handler.js';
import { decodePreview } from '../ingestion-client.js';
import { duplicateCandidates } from '../duplicate-match.js';

const read = path => readFile(new URL(`./fixtures/${path}`, import.meta.url), 'utf8');
const ashby = JSON.parse(await read('ashby/board.json'));
const lever = JSON.parse(await read('lever/posting.json'));
const pages = { ashby: await read('ashby/posting.html'), lever: await read('lever/posting.html') };
const urls = { ashby: ashby.jobs[1].jobUrl, lever: lever.hostedUrl };
const now = new Date('2026-10-07T12:00:00Z');
const signal = () => new AbortController().signal;
const json = (body, status = 200) => Response.json(body, { status });
const html = body => new Response(body, { headers: { 'content-type': 'text/html' } });
const fixtureOptions = provider => ({ now, signal: signal(), fetcher: async target => String(target).includes('/posting-api/') || String(target).includes('/v0/postings/') ? json(provider === 'ashby' ? ashby : lever) : html(pages[provider]) });
const identity = provider => recognizePosting(urls[provider]);

test('Ashby/Lever hosted/application URLs strip known tracking only and preserve unknown parameters', () => {
  for (const provider of ['ashby','lever']) {
    const suffix = provider === 'ashby' ? '/application' : '/apply';
    const id = recognizePosting(`${urls[provider]}${suffix}?utm_source=example&source=example&locale=fr#application`);
    assert.equal(id.canonical_url, `${urls[provider]}?locale=fr`);
    assert.ok(samePosting(id, identity(provider)));
    assert.equal(recognizePosting(urls[provider].replace(/([a-f])/g, (c, _, offset) => offset > urls[provider].lastIndexOf('/') ? c.toUpperCase() : c)).posting_id, identity(provider).posting_id);
  }
  const eu = recognizePosting(urls.lever.replace('jobs.lever.co','jobs.eu.lever.co'));
  assert.equal(eu.region, 'eu'); assert.match(eu.retrieval_url, /^https:\/\/api\.eu\.lever\.co\/v0\/postings\/example\//);
  assert.equal(samePosting(eu, identity('lever')), false);
  assert.match(identity('ashby').retrieval_url, /^https:\/\/api\.ashbyhq\.com\/posting-api\/job-board\/example\?includeCompensation=true$/);
});

test('multi-provider recognition fails closed on invalid, deceptive, insecure, arbitrary and unsupported URLs', () => {
  for (const url of ['invalid',urls.ashby.replace('https:','http:'),urls.lever.replace('jobs.lever.co','user:secret@jobs.lever.co'),urls.ashby.replace('jobs.ashbyhq.com','jobs.ashbyhq.com:444'),urls.lever.replace('jobs.lever.co','jobs.lever.co.evil.invalid'),urls.ashby.replace('jobs.ashbyhq.com','127.0.0.1'),'https://jobs.ashbyhq.com/example','https://jobs.lever.co/example/not-a-posting-id',urls.ashby.replace('/example/','/%2e%2e/'),urls.lever.replace('jobs.lever.co','api.lever.co'),'https://example.myworkdayjobs.com/jobs/123','https://employer.invalid/jobs/123']) assert.throws(() => recognizePosting(url));
});

test('Ashby selects exact board posting, keeps all salary tiers/geography and never maps last publication to posted_on', async () => {
  const preview = await ingestPosting(urls.ashby, fixtureOptions('ashby'));
  assert.equal(preview.draft.company, 'Example Studio'); assert.equal(preview.draft.title, 'Senior Product Designer');
  assert.equal(preview.draft.work_arrangement, 'remote'); assert.equal(preview.draft.employment_type, 'Full-time');
  assert.match(preview.draft.location, /United States/); assert.match(preview.draft.location, /Toronto, Ontario, Canada/);
  assert.match(preview.draft.compensation_text, /United States[\s\S]*USD 140,000–180,000[\s\S]*1 YEAR[\s\S]*0\.5%–1\.75%[\s\S]*New York[\s\S]*155,000–195,000/);
  assert.match(preview.draft.compensation_text, /depends on experience and location/);
  assert.match(preview.draft.job_description, /Responsibilities\n\n• Design interactions\./); assert.match(preview.draft.job_description, /Closing notice\./);
  assert.doesNotMatch(preview.draft.job_description, /doNotExecute|<p>/);
  assert.equal(preview.draft.posted_on, undefined); assert.ok(preview.warnings.some(w => w.includes('last published at 2026-10-06') && w.includes('republication')));
  assert.equal(decodePreview(preview, urls.ashby).identity.provider, 'ashby');
  for (const field of ['source','status','applied_on','connections','overall_assessment']) assert.equal(field in preview.draft, false);
});

test('Ashby missing company/compensation/optional facts remain missing; false isRemote never invents onsite', () => {
  const result = normalizeAshby({ title: 'Designer', isRemote: false }, identity('ashby'), {}, urls.ashby, now);
  assert.equal(result.draft.title, 'Designer');
  for (const key of ['company','compensation_text','location','work_arrangement','posted_on','employment_type','job_description']) assert.equal(result.draft[key], undefined);
  assert.ok(result.warnings.some(w => w.startsWith('Company') && w.includes('Required')));
  assert.equal(result.draft.discovered_on, '2026-10-07');
  assert.equal(normalizeAshby({}, identity('ashby'), {}, urls.ashby, now, [], '2026-10-01').draft.discovered_on, '2026-10-01');
  assert.throws(() => normalizeAshby({}, identity('ashby'), {}, urls.ashby, now, [], '2026-02-30'));
  for (const raw of [{ workplaceType: 'Remote', isRemote: false },{ workplaceType: 'OnSite', isRemote: true },{ workplaceType: '__proto__' }]) assert.equal(normalizeAshby(raw, identity('ashby'), {}, urls.ashby, now).draft.work_arrangement, undefined);
});

test('Ashby malformed boards, duplicate identities and mismatched job URLs are rejected without choosing another role', () => {
  for (const board of [null,{}, { apiVersion:'2',jobs:[] },{ apiVersion:'1',jobs:{} },{ ...ashby,jobs:[ashby.jobs[1],ashby.jobs[1]] },{ ...ashby,jobs:[{ ...ashby.jobs[1],jobUrl:'http://127.0.0.1/private' }] },{ ...ashby,jobs:[{ ...ashby.jobs[1],id:ashby.jobs[0].id }] }]) assert.throws(() => selectAshbyPosting(board, identity('ashby')), e => e.code === 'invalid_posting');
  assert.throws(() => selectAshbyPosting({apiVersion:'1',jobs:[ashby.jobs[0]]}, identity('ashby')), e => e.code === 'unavailable');
  const withoutId = { ...ashby.jobs[1] }; delete withoutId.id;
  assert.equal(selectAshbyPosting({apiVersion:'1',jobs:[withoutId]}, identity('ashby')).title, withoutId.title);
});

test('Lever keeps combined opening/body once, complete requirements/benefits/closing, explicit salary interval and publication metadata', async () => {
  const preview = await ingestPosting(urls.lever, fixtureOptions('lever'));
  assert.equal(preview.draft.company, 'Example Studio'); assert.equal(preview.draft.title, lever.text);
  assert.equal(preview.draft.work_arrangement, 'hybrid'); assert.equal(preview.draft.employment_type, 'Full-time');
  assert.equal(preview.draft.location, 'New York; Toronto, Canada; US');
  assert.match(preview.draft.compensation_text, /USD 140,000–180,000 · per-year-salary/); assert.match(preview.draft.compensation_text, /Location and experience/);
  assert.equal(preview.draft.job_description.match(/Opening paragraph\./g).length, 1);
  assert.match(preview.draft.job_description, /Opening paragraph[\s\S]*Main role details[\s\S]*Requirements[\s\S]*• Design clear interactions[\s\S]*Benefits[\s\S]*Closing notice & accommodations/);
  assert.doesNotMatch(preview.draft.job_description, /doNotExecute|<li>/);
  assert.equal(preview.draft.posted_on, '2026-09-30'); assert.equal(decodePreview(preview, urls.lever).identity.region, 'global');
  for (const field of ['source','status','applied_on','connections','overall_assessment']) assert.equal(field in preview.draft, false);
});

test('Lever fallback opening/body and plain fields retain content; missing facts and creation timestamp stay uninferred', () => {
  const result = normalizeLever({ openingPlain:'Opening\n\nSecond paragraph',descriptionBodyPlain:'Body',additionalPlain:'Closing',createdAt:lever.createdAt,workplaceType:'unspecified' },identity('lever'),{},urls.lever,now);
  assert.equal(result.draft.job_description, 'Opening\n\nSecond paragraph\n\nBody\n\nClosing');
  for (const key of ['company','title','compensation_text','location','work_arrangement','posted_on','employment_type']) assert.equal(result.draft[key], undefined);
  assert.equal(normalizeLever({workplaceType:'__proto__'},identity('lever'),{},urls.lever,now).draft.work_arrangement,undefined);
  assert.equal(normalizeLever(lever,identity('lever'),{datePosted:'2026-02-30'},urls.lever,now).draft.posted_on,undefined);
  const invalid = normalizeLever({...lever,salaryRange:{currency:'USD',min:100,max:50},salaryDescription:null},identity('lever'),{},urls.lever,now);
  assert.equal(invalid.draft.compensation_text,undefined);assert.ok(invalid.warnings.some(w=>w.includes('invalid Lever salary')));
});

test('Lever rejects wrong posting/site/region identities; EU uses only EU API and hosted page', async () => {
  for (const input of [[],null,{}, {...lever,id:'wrong'}, {...lever,hostedUrl:lever.hostedUrl.replace('example/','other/')}, {...lever,hostedUrl:lever.hostedUrl.replace('jobs.lever.co','jobs.eu.lever.co')}]) assert.throws(()=>validateLeverPosting(input,identity('lever')),e=>e.code==='invalid_posting');
  const url=urls.lever.replace('jobs.lever.co','jobs.eu.lever.co');const targets=[];
  const preview=await ingestPosting(url,{now,signal:signal(),fetcher:async target=>{targets.push(String(target));return String(target).includes('/v0/postings/')?json({...lever,hostedUrl:url}):html(pages.lever)}});
  assert.equal(preview.identity.region,'eu');assert.equal(targets.length,2);assert.ok(targets.every(t=>new URL(t).hostname.endsWith('.eu.lever.co')));
});

for (const provider of ['ashby','lever']) {
  test(`${provider} retrieves exactly two controlled destinations with no credentials, redirects, images or remote contexts`, async () => {
    const calls=[];
    const preview=await ingestPosting(`${urls[provider]}?unknown=preserved&utm_source=example`,{now,signal:signal(),fetcher:async(target,init)=>{
      calls.push({target:String(target),init});assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');assert.equal(Object.keys(init.headers).length,1);assert.equal('Authorization' in init.headers,false);
      return calls.length===1?json(provider==='ashby'?ashby:lever):html(pages[provider]);
    }});
    assert.deepEqual(calls.map(c=>c.target),[identity(provider).retrieval_url,urls[provider]]);
    assert.equal(preview.draft.job_url,`${urls[provider]}?unknown=preserved`);
  });
  test(`${provider} expired, throttled, redirected, malformed and failed retrievals stop without a metadata call`,async()=>{
    for(const[status,code]of[[404,'unavailable'],[410,'unavailable'],[302,'redirect_blocked'],[429,'upstream_busy'],[500,'retrieval_failed']]){
      let calls=0;await assert.rejects(ingestPosting(urls[provider],{signal:signal(),fetcher:async()=>{calls++;return json({},status)}}),e=>e.code===code);assert.equal(calls,1);
    }
    await assert.rejects(ingestPosting(urls[provider],{signal:signal(),fetcher:async()=>{throw new Error('Synthetic network failure')}}),/Synthetic network failure/);
    await assert.rejects(ingestPosting(urls[provider],{signal:signal(),fetcher:async()=>new Response('broken',{headers:{'content-type':'application/json'}})}),e=>e.code==='invalid_posting');
    await assert.rejects(ingestPosting(urls[provider],{signal:signal(),fetcher:async()=>json({})}),e=>e.code==='invalid_posting');
  });
  test(`${provider} unavailable/oversized/redirected metadata leaves Company blank and retains API facts`,async()=>{
    for(const response of [json({},404),json({},302),new Response('x'.repeat(1024*1024+1),{headers:{'content-type':'text/html'}}),html('<html>No metadata</html>')]){
      let calls=0;const preview=await ingestPosting(urls[provider],{now,signal:signal(),fetcher:async()=>++calls===1?json(provider==='ashby'?ashby:lever):response});
      assert.equal(calls,2);assert.equal(preview.draft.company,undefined);assert.equal(preview.draft.title,'Senior Product Designer');assert.ok(preview.warnings.some(w=>w.includes('Company')||w.includes('Company remains missing')));
    }
  });
  test(`${provider} API responses still enforce streamed size limits and metadata shares the authenticated deadline`,async()=>{
    await assert.rejects(ingestPosting(urls[provider],{signal:signal(),fetcher:async()=>new Response(JSON.stringify({large:'x'.repeat(1024*1024)}),{headers:{'content-type':'application/json'}})}),e=>e.code==='too_large');
    const ownerId='11111111-1111-4111-8111-111111111111';let calls=0;
    const handler=createIngestionHandler({ownerId,allowedOrigins:['https://example.github.io'],authenticate:async()=>ownerId,timeoutMs:20,fetcher:async()=>++calls===1?json(provider==='ashby'?ashby:lever):new Response(new ReadableStream({start(){}}),{headers:{'content-type':'text/html'}})});
    const response=await handler(new Request('https://example.invalid',{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json'},body:JSON.stringify({url:urls[provider]})}));
    assert.equal(response.status,504);assert.equal((await response.json()).error.code,'timeout');assert.equal(calls,2);
  });
  test(`${provider} duplicate identity survives tracking/unknown parameters; distinct postings/tenants stay distinct`,async()=>{
    const draft=(await ingestPosting(urls[provider],fixtureOptions(provider))).draft;
    const row={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',company:draft.company,title:draft.title,location:draft.location,status:'applied',applied_on:'2026-09-30',updated_at:'2026-10-07T12:00:00.123456Z',job_url:`${urls[provider]}?locale=en&utm_source=old`};
    assert.equal(duplicateCandidates(draft,[row])[0].strength,'strong');assert.match(duplicateCandidates(draft,[row])[0].reason,/posting ID/);
    assert.equal(duplicateCandidates(draft,[{...row,job_url:urls[provider].replace(identity(provider).posting_id,'33333333-cccc-4333-8333-333333333333')}]).length,0);
    assert.equal(duplicateCandidates(draft,[{...row,job_url:urls[provider].replace('/example/','/other/')}]).length,0);
    assert.equal(duplicateCandidates(draft,[{...row,job_url:null}])[0].strength,'possible');
    assert.equal(duplicateCandidates(draft,[{...row,job_url:null,location:'Different location'}]).length,0);
    if(provider==='lever') assert.equal(duplicateCandidates(draft,[{...row,job_url:urls.lever.replace('jobs.lever.co','jobs.eu.lever.co')}]).length,0);
  });
  test(`${provider} browser response validation rejects wrong providers, methods, regions and unsupported write fields`,async()=>{
    const preview=await ingestPosting(urls[provider],fixtureOptions(provider));
    for(const field of ['status','source','connections','owner_id','assessment_rationale']) assert.throws(()=>decodePreview({...preview,draft:{...preview.draft,[field]:'bad'}},urls[provider]));
    assert.throws(()=>decodePreview({...preview,method:'greenhouse-job-board-api'},urls[provider]));
    assert.throws(()=>decodePreview({...preview,identity:{...preview.identity,region:'unexpected'}},urls[provider]));
    assert.throws(()=>decodePreview({...preview,identity:{...preview.identity,provider:'greenhouse'}},urls[provider]));
  });
}

test('JSON-LD employer metadata is inert, exact and rejects conflicting/multiple postings without fetching hints',()=>{
  const meta={ '@type':'JobPosting',title:'Senior Product Designer',identifier:{value:identity('ashby').posting_id},hiringOrganization:{name:'Explicit Employer'} };
  const block=value=>`<script type="application/ld+json">${JSON.stringify(value)}</script>`;
  assert.equal(postingMetadata(block([meta]),identity('ashby'),'Senior Product Designer',[]).hiringOrganization.name,'Explicit Employer');
  for(const value of [[meta,meta],{...meta,identifier:{value:'wrong'}},{...meta,title:'Different role'},{...meta,url:'http://127.0.0.1/private'}]) assert.deepEqual(postingMetadata(block(value),identity('ashby'),'Senior Product Designer',[]),{});
  const warnings=[];assert.deepEqual(postingMetadata('<script type="application/ld+json">broken</script>',identity('ashby'),'Senior Product Designer',warnings),{});assert.ok(warnings.some(w=>w.includes('malformed')));
});
