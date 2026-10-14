import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recognizePosting, samePosting } from '../ingestion/posting-url.js';
import { recognizeWorkday } from '../ingestion/workday-url.js';
import { ingestPosting } from '../ingestion/pipeline.js';
import { ingestWorkday, normalizeWorkday, validateWorkdayPosting, workdayMetadata, labeledWorkdayPay } from '../ingestion/workday.js';
import { decodePreview } from '../ingestion-client.js';
import { duplicateCandidates } from '../duplicate-match.js';
import { createIngestionHandler } from '../ingestion/handler.js';

const raw = JSON.parse(await readFile(new URL('./fixtures/workday/posting.json', import.meta.url), 'utf8'));
const page = await readFile(new URL('./fixtures/workday/posting.html', import.meta.url), 'utf8');
const url = 'https://example.wd5.myworkdayjobs.com/en-US/External_Careers/job/Example-City/Senior-Product-Designer_REQ-123-1?utm_source=test&source=channel';
const identity = recognizeWorkday(url), now = new Date('2026-10-07T12:00:00Z');
const signal = () => new AbortController().signal;
const metadata = () => workdayMetadata(page, identity, raw.jobPostingInfo, []);
const clone = () => globalThis.structuredClone(raw);
const options = { now, signal: signal(), fetcher: async target => String(target).includes('/wday/cxs/') ? Response.json(raw) : new Response(page, { headers: { 'content-type': 'text/html' } }) };

test('Workday recognizes validated clusters, both host families, optional locale/location and canonical tracking rules', () => {
  for (const cluster of ['1','3','5','103']) for (const shared of [false,true]) for (const locale of ['', 'en-US/', 'fr-FR/', 'en/']) for (const location of ['', 'Example-City/']) {
    const host = shared ? `wd${cluster}.myworkdaysite.com` : `example.wd${cluster}.myworkdayjobs.com`;
    const root = shared ? 'recruiting/example/External_Careers' : 'External_Careers';
    const input = `https://${host}/${locale}${root}/job/${location}Senior-Product-Designer_REQ-123-1?utm_source=test&source=channel&unknown=kept#fragment`;
    const id = recognizePosting(input);
    assert.equal(id.provider,'workday'); assert.equal(id.posting_id,'senior-product-designer_req-123-1');
    assert.equal(id.board,`${host}/example/External_Careers`);
    assert.equal(id.retrieval_url,`https://${host}/wday/cxs/example/External_Careers/job/${location}Senior-Product-Designer_REQ-123-1`);
    assert.equal(id.canonical_url,`https://${host}/${root}/job/${location}Senior-Product-Designer_REQ-123-1?unknown=kept`);
  }
  assert.equal(samePosting(identity,recognizePosting(url.replace('en-US/','').replace('Example-City/',''))),true);
});

test('Workday refuses hostile hosts, unknown clusters, unsupported routes, encoded traversal and ambiguous tokens', () => {
  for (const input of [
    'https://example.wd5.myworkdayjobs.com.evil.test/External/job/A_REQ-1',
    'https://evil.example.wd5.myworkdayjobs.com/External/job/A_REQ-1',
    url.replace('wd5','wd99'),url.replace('wd5','wd5-impl'),
    url.replace('/job/Example-City/','/details/'),url.replace('/job/Example-City/Senior-Product-Designer_REQ-123-1',''),
    url.replace('Senior-Product-Designer_REQ-123-1','12345'),url.replace('Example-City','%2fprivate'),
    url.replace('Example-City','%252fprivate'),url.replace('Example-City','%2e%2e'),url.replace('Example-City','..'),
    url.replace('External_Careers','External%5cprivate'),url.replace('External_Careers','%00External'),
    url.replace('https:','http:'),url.replace('https://','https://user:password@'),url.replace('.com/','.com:8443/'),
    'https://127.0.0.1/External/job/A_REQ-1','not a URL'
  ]) assert.throws(()=>recognizePosting(input), undefined, input);
});

test('Workday validates posting/site/external identities, preserves anchor suffix and distinguishes requisition metadata', () => {
  assert.equal(validateWorkdayPosting(raw,identity),raw);
  assert.equal(metadata().identifier.value,'REQ-123');
  for (const patch of [{jobPostingId:'Senior-Product-Designer_REQ-123'}, {jobPostingSiteId:'Other'}, {externalUrl:'https://127.0.0.1/private'}, {externalUrl:url.replace('REQ-123-1','REQ-999')}, {posted:'true'}, {canApply:'false'}]) {
    const changed=clone(); Object.assign(changed.jobPostingInfo,patch);
    assert.throws(()=>validateWorkdayPosting(changed,identity),e=>e.code==='invalid_posting');
  }
  const block = value => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
  for(const value of [{...metadata(),identifier:{value:'REQ-999'}},{...metadata(),title:'Other role'},{...metadata(),url:'https://evil.test/private'},[metadata(),metadata()]]) assert.deepEqual(workdayMetadata(block(value),identity,raw.jobPostingInfo,[]),{});
  const warnings=[];assert.deepEqual(workdayMetadata('<script type="application/ld+json">broken</script>',identity,raw.jobPostingInfo,warnings),{});assert.ok(warnings.some(w=>w.includes('malformed')));
});

test('Workday normalizes legal employer, all locations, full-time only, date provenance, inert description and bounded salary tiers', async () => {
  const result=await ingestPosting(url,options);
  assert.equal(result.draft.company,'2100 Example Legal Entity LLC');
  assert.equal(result.draft.title,'Senior Product Designer');assert.equal(result.draft.work_arrangement,'hybrid');
  assert.equal(result.draft.employment_type,'Full time');assert.doesNotMatch(result.draft.employment_type,/permanent/i);
  assert.match(result.draft.location,/Example City; Second City; Example Country; Eligible locations: Example Country/);
  assert.equal(result.identity.requisition_id,'REQ-123');assert.notEqual(result.identity.requisition_id,result.identity.posting_id);
  assert.equal(result.draft.posted_on,'2026-10-06');assert.equal(result.draft.discovered_on,'2026-10-07');
  assert.match(result.draft.compensation_text,/USD 120,000 - 160,000 annually/);assert.match(result.draft.compensation_text,/USD 110,000 - 150,000 annually/);assert.match(result.draft.compensation_text,/experience and work location/);
  assert.match(result.draft.job_description,/• Research user needs/);assert.match(result.draft.job_description,/Health coverage and leave/);assert.doesNotMatch(result.draft.job_description,/doNotExecute|iframe|<p>/);
  assert.equal('source' in result.draft,false);assert.equal('status' in result.draft,false);assert.equal('applied_on' in result.draft,false);
  assert.deepEqual(decodePreview(result,url).draft,result.draft);
});

test('Workday missing/ambiguous facts stay blank, publication conflicts do not invent dates, and canApply false does not close a posting', () => {
  const changed=clone(); for(const key of ['location','additionalLocations','country','remoteType','timeType','jobDescription']) delete changed.jobPostingInfo[key];delete changed.hiringOrganization;
  let result=normalizeWorkday(changed,identity,{},url,now);
  for(const key of ['company','location','work_arrangement','employment_type','compensation_text','posted_on','job_description']) assert.equal(result.draft[key],undefined);
  const conflict=metadata();conflict.jobLocationType='TELECOMMUTE';
  result=normalizeWorkday(raw,identity,conflict,url,now);assert.equal(result.draft.work_arrangement,undefined);assert.ok(result.warnings.some(w=>w.includes('work arrangement conflicts')));
  result=normalizeWorkday(raw,identity,{...metadata(),datePosted:'2026-10-01'},url,now);assert.equal(result.draft.posted_on,undefined);
  result=normalizeWorkday(raw,identity,{...metadata(),datePosted:'2026-02-30'},url,now);assert.equal(result.draft.posted_on,undefined);
  result=normalizeWorkday(raw,identity,{...metadata(),hiringOrganization:{name:'Different Employer'}},url,now);assert.equal(result.draft.company,undefined);
  changed.jobPostingInfo.canApply=false;result=normalizeWorkday(changed,identity,{},url,now);assert.ok(result.warnings.some(w=>w.includes('application is not currently available')));assert.equal('status' in result.draft,false);
  changed.jobPostingInfo.remoteType='Flex';result=normalizeWorkday(changed,identity,{},url,now);assert.equal(result.draft.work_arrangement,undefined);
});

test('Workday structured salary retains explicit intervals and all tiers; arbitrary amounts and oversized labeled sections stay blank', () => {
  const result=normalizeWorkday(raw,identity,{...metadata(),baseSalary:[{name:'City A',currency:'USD',value:{minValue:120000,maxValue:150000,unitText:'YEAR'}},{name:'City B',currency:'USD',value:{value:60,unitText:'HOUR'}}]},url,now);
  assert.equal(result.draft.compensation_text,'City A: USD 120000–150000 · YEAR\nCity B: USD 60–60 · HOUR');
  const missing=normalizeWorkday(raw,identity,{...metadata(),baseSalary:{currency:'USD',value:{minValue:100}}},url,now);assert.equal(missing.draft.compensation_text,undefined);
  assert.equal(labeledWorkdayPay('A signing bonus of $1,000. The base salary range is USD 100,000 - 120,000.',[]),null);
  const warnings=[];assert.equal(labeledWorkdayPay('Pay Range\n'+Array.from({length:40},(_,i)=>`City ${i}: USD 100 - 200 annually`).join('\n'),warnings),null);assert.ok(warnings.length);
});

test('Workday makes only two fixed GET requests, forwarding no input query, cookies, tokens or upstream URL hints', async () => {
  const calls=[];
  await ingestWorkday(url,{...options,fetcher:async(target,init)=>{
    calls.push(String(target));assert.equal(init.redirect,'manual');assert.equal(init.method,'GET');assert.deepEqual(init.headers,{Accept:calls.length===1?'application/json':'text/html'});
    return calls.length===1?Response.json(raw):new Response(page,{headers:{'content-type':'text/html'}});
  }});
  assert.deepEqual(calls,[identity.retrieval_url,identity.metadata_url]);
});

test('Workday 403 is inaccessible, 404/410/unposted are unavailable, other retrieval/malformed failures stop before metadata', async () => {
  for(const [status,code] of [[403,'inaccessible'],[404,'unavailable'],[410,'unavailable'],[429,'upstream_busy'],[302,'redirect_blocked'],[500,'retrieval_failed']]) {
    let calls=0;await assert.rejects(ingestWorkday(url,{...options,fetcher:async()=>{calls++;return Response.json({}, {status});}}),e=>e.code===code);assert.equal(calls,1);
  }
  const expired=clone();expired.jobPostingInfo.posted=false;
  await assert.rejects(ingestWorkday(url,{...options,fetcher:async()=>Response.json(expired)}),e=>e.code==='unavailable');
  for(const response of [Response.json({}),new Response('{broken',{headers:{'content-type':'application/json'}}),new Response('Login',{headers:{'content-type':'text/html'}})]) await assert.rejects(ingestWorkday(url,{...options,fetcher:async()=>response}),e=>e.code==='invalid_posting');
  await assert.rejects(ingestWorkday(url,{...options,fetcher:async()=>{throw new TypeError('Network failed');}}),/Network failed/);
});

test('Workday unavailable metadata retains CXS facts; size limits and the shared deadline still apply', async () => {
  for(const response of [Response.json({}, {status:403}),new Response('',{status:302}),new Response('x'.repeat(1048577),{headers:{'content-type':'text/html'}})]) {
    let calls=0;const result=await ingestWorkday(url,{...options,fetcher:async()=>++calls===1?Response.json(raw):response});assert.equal(result.draft.company,raw.hiringOrganization.name);assert.equal(result.draft.posted_on,undefined);assert.ok(result.warnings.some(w=>w.includes('metadata could not be retrieved')));
  }
  await assert.rejects(ingestWorkday(url,{...options,fetcher:async()=>new Response('x'.repeat(1048577),{headers:{'content-type':'application/json'}})}),e=>e.code==='too_large');
  const ownerId='11111111-1111-4111-8111-111111111111';let calls=0;
  const handler=createIngestionHandler({ownerId,allowedOrigins:['https://example.github.io'],authenticate:async()=>ownerId,timeoutMs:20,fetcher:async()=>++calls===1?Response.json(raw):new Response(new ReadableStream({start(){}}),{headers:{'content-type':'text/html'}})});
  const request=()=>new Request('https://example.invalid',{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json'},body:JSON.stringify({url})});
  const response=await handler(request());assert.equal(response.status,504);assert.equal((await response.json()).error.code,'timeout');assert.equal(calls,2);
});

test('Workday duplicates ignore locale/location/tracking but preserve tenant/site/host and repost identities', () => {
  const draft={company:'Edited Brand',title:raw.jobPostingInfo.title,job_url:url};
  const prospect={id:'11111111-1111-4111-8111-111111111111',company:'Original Legal Entity',title:raw.jobPostingInfo.title,job_url:url.replace('en-US/','').replace('Example-City/',''),location:null,status:'prospect',applied_on:null,updated_at:'2026-10-07T12:00:00.123456Z'};
  assert.equal(duplicateCandidates(draft,[prospect])[0].strength,'strong');
  for(const other of [url.replace('REQ-123-1','REQ-123'),url.replace('External_Careers','Other'),url.replace('example.wd5','different.wd5'),url.replace('wd5','wd3')]) assert.deepEqual(duplicateCandidates({...draft,company:prospect.company},[{...prospect,job_url:other}]),[]);
});
