import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recognizePosting, samePosting } from '../ingestion/posting-url.js';
import { ingestPosting } from '../ingestion/pipeline.js';
import { normalizeWorkable } from '../ingestion/workable.js';
import { createIngestionHandler } from '../ingestion/handler.js';
import { decodePreview } from '../ingestion-client.js';
import { duplicateCandidates } from '../duplicate-match.js';

const read = async file => JSON.parse(await readFile(new URL(`./fixtures/workable/${file}.json`, import.meta.url), 'utf8'));
const job = await read('posting'), account = await read('account');
const url = 'https://apply.workable.com/example/j/ABC123DEF4/';
const identity = recognizePosting(url);
const now = new Date('2026-10-14T12:00:00Z');
const signal = () => new AbortController().signal;
const options = (raw = job, company = account) => ({ now, signal: signal(), fetcher: async target => Response.json(String(target).includes('/api/v2/') ? raw : company) });

test('Workable recognition canonicalizes scoped apply/tracking aliases with no upstream queries', () => {
  for (const path of [url, url.slice(0,-1), url + 'apply', url + 'apply/']) {
    const value = recognizePosting(path + '?utm_source=test&locale=fr#form');
    assert.equal(value.canonical_url, url + '?locale=fr');
    assert.equal(value.retrieval_url, 'https://apply.workable.com/api/v2/accounts/example/jobs/ABC123DEF4');
    assert.ok(samePosting(value, identity));
  }
});

test('Workable rejects short links, custom/hostile hosts, malformed paths and normalization attacks', () => {
  for (const input of [
    'https://apply.workable.com/j/ABC123DEF4', 'https://apply.workable.com/j/ABC123DEF4/apply',
    'https://apply.workable.com/example/', 'https://example.workable.com/jobs/123',
    url.replace('https:', 'http:'), url.replace('apply.workable.com', 'apply.workable.com.evil.invalid'),
    url.replace('apply.workable.com', 'user:secret@apply.workable.com'), url.replace('apply.workable.com', 'apply.workable.com:444'),
    url.replace('/example/', '/a/../example/'), url.replace('/example/', '/a/%2e%2e/example/'),
    url.replace('/example/', '/a/%2E./example/'), url.replace('/example/', '/a/..\\example/'),
    url.replace('/example/', '/a/.\n./example/'),
    url.replace('/example/', '/example%2fother/'), url.replace('/example/', '/' + 'a'.repeat(101) + '/'),
    url.replace('ABC123DEF4', 'a'.repeat(65)), url + 'extra', url + '?x=' + 'x'.repeat(2048)
  ]) assert.throws(() => recognizePosting(input), undefined, input);
  assert.throws(() => recognizePosting('https://apply.workable.com/j/ABC123DEF4'), /open it and copy the resolved/);
});

test('Workable preview preserves complete inert sections, public locations and explicit hybrid facts', async () => {
  const preview = decodePreview(await ingestPosting(url, options()), url);
  assert.equal(preview.method, 'workable-public-job-detail');
  assert.equal(preview.draft.company, 'Example Studio'); assert.equal(preview.draft.title, job.title);
  assert.equal(preview.draft.work_arrangement, 'hybrid'); assert.equal(preview.draft.employment_type, 'Full-time');
  assert.equal(preview.draft.location, 'Example City, Example Region, United States; Toronto, Ontario, Canada');
  assert.match(preview.draft.job_description, /Description\n\nDesign useful systems\.[\s\S]*Requirements[\s\S]*• Design interactions\.[\s\S]*Benefits[\s\S]*Closing notice\./);
  assert.doesNotMatch(preview.draft.job_description, /doNotExecute|<p>/);
  assert.match(preview.draft.job_description, /150,000–190,000 per year/);
  for (const key of ['compensation_text','posted_on','source','status','notes','connections','overall_assessment','applied_on']) assert.equal(key in preview.draft, false);
  assert.ok(preview.warnings.some(warning => warning.includes('republication')));
  assert.equal(preview.draft.discovered_on, '2026-10-14');
  assert.match(preview.field_sources.company, /account.name/);
});

test('Workable missing/unknown/conflicting facts stay blank; locations never reveal hidden entries', () => {
  const normalize = raw => normalizeWorkable(raw, identity, {}, url, now);
  assert.equal(normalize({ remote: false, type: 'unknown', locations: [{ city: 'Hidden', hidden: true }, { city: 'Ambiguous' }] }).draft.location, undefined);
  for (const raw of [{workplace:'remote',remote:false},{workplace:'on_site',remote:true},{workplace:'__proto__'},{remote:false}]) assert.equal(normalize(raw).draft.work_arrangement, undefined);
  assert.equal(normalize({remote:true}).draft.work_arrangement, 'remote');
  assert.equal(normalize({workplace:'on_site',remote:false}).draft.work_arrangement, 'onsite');
  assert.equal(normalize({type:'contract'}).draft.employment_type, undefined);
  assert.equal(normalize({benefits:'',requirements:'<p>Only requirements.</p>'}).draft.job_description, 'Requirements\n\nOnly requirements.');
  assert.equal(normalize({locations:[] ,location:{city:'Hidden fallback'}}).draft.location, undefined);
  assert.equal(normalize({location:{city:'Private primary',hidden:true}}).draft.location, undefined);
  assert.equal(normalize({location:{city:'Primary',country:'Canada'}}).draft.location, 'Primary, Canada');
  assert.ok(normalize({}).warnings.some(w=>w.includes('Company')&&w.includes('Required')));
});

test('Workable rejects mismatched, internal and unpublished postings before requesting metadata', async () => {
  for (const raw of [null,{}, {...job,shortcode:'OTHER'}, {...job,accountUid:'invalid'}, {...job,isInternal:undefined}, {...job,state:'closed'}, {...job,state:'draft'}, {...job,isInternal:true}]) {
    let calls = 0;
    await assert.rejects(ingestPosting(url,{signal:signal(),fetcher:async()=>{calls++;return Response.json(raw);}}), error=>['invalid_posting','unavailable'].includes(error.code));
    assert.equal(calls,1);
  }
  for (const company of [null,{}, {...account,subdomain:'other'}, {...account,uid:'55555555-eeee-4555-8555-555555555555'}]) {
    await assert.rejects(ingestPosting(url, options(job,company)), error=>error.code==='invalid_posting');
  }
});

test('Workable makes only two fixed GET requests without bearer tokens, input queries or upstream hints', async () => {
  const calls=[];
  await ingestPosting(url+'?locale=en&utm_source=test',{now,signal:signal(),fetcher:async(target,init)=>{
    calls.push(String(target));assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');assert.deepEqual(Object.keys(init.headers),['Accept']);
    return Response.json(calls.length===1?{...job,url:'https://attacker.invalid/',application_url:'https://attacker.invalid/'}:account);
  }});
  assert.deepEqual(calls,[identity.retrieval_url,'https://apply.workable.com/api/v1/accounts/example?full=true']);
});

test('Workable reports inaccessible/unavailable/throttled/redirected/malformed jobs without extra requests', async () => {
  for (const [status,code] of [[401,'inaccessible'],[403,'inaccessible'],[404,'unavailable'],[410,'unavailable'],[429,'upstream_busy'],[302,'redirect_blocked'],[500,'retrieval_failed']]) {
    let calls=0;
    await assert.rejects(ingestPosting(url,{signal:signal(),fetcher:async()=>{calls++;return new Response('error',{status});}}),error=>error.code===code);
    assert.equal(calls,1);
  }
  for (const response of [new Response('not json',{headers:{'content-type':'application/json'}}),new Response('<html>Blocked</html>',{headers:{'content-type':'text/html'}})]) {
    await assert.rejects(ingestPosting(url,{signal:signal(),fetcher:async()=>response}),error=>error.code==='invalid_posting');
  }
});

test('Workable enforces advertised and streamed 1 MiB bounds and keeps optional account failures partial', async () => {
  for (const advertised of [false,true]) {
    const oversized=()=>new Response('x'.repeat(1024*1024+1),{headers:{'content-type':'application/json',...(advertised?{'content-length':String(1024*1024+1)}:{})}});
    await assert.rejects(ingestPosting(url,{signal:signal(),fetcher:async()=>oversized()}),error=>error.code==='too_large');
    let calls=0;
    const partial=await ingestPosting(url,{signal:signal(),fetcher:async()=>++calls===1?Response.json(job):oversized()});
    assert.equal(calls,2);assert.equal(partial.draft.company,undefined);assert.equal(partial.draft.title,job.title);
  }
  for (const response of [new Response('',{status:403}),new Response('',{status:404}),new Response('',{status:302}),new Response('bad',{headers:{'content-type':'application/json'}})]) {
    let calls=0;
    const partial=await ingestPosting(url,{signal:signal(),fetcher:async()=>++calls===1?Response.json(job):response});
    assert.equal(partial.draft.company,undefined);assert.equal(partial.draft.title,job.title);
    assert.ok(partial.warnings.some(w=>w.includes('metadata')));
  }
});

test('Workable metadata shares the authenticated deadline and caller cancellation is not swallowed', async () => {
  const ownerId='11111111-1111-4111-8111-111111111111';let calls=0;
  const handler=createIngestionHandler({ownerId,allowedOrigins:['https://example.invalid'],authenticate:async()=>ownerId,timeoutMs:25,fetcher:async()=>++calls===1?Response.json(job):new Response(new ReadableStream({start(){}}),{headers:{'content-type':'application/json'}})});
  const response=await handler(new Request('https://example.invalid',{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json'},body:JSON.stringify({url})}));
  assert.equal(response.status,504);assert.equal((await response.json()).error.code,'timeout');assert.equal(calls,2);
  const controller=new AbortController();calls=0;
  await assert.rejects(ingestPosting(url,{signal:controller.signal,fetcher:async()=>{if(++calls===1)return Response.json(job);controller.abort();throw new Error('cancelled');}}),error=>error.name==='AbortError');
});

test('Workable duplicates match scoped aliases but never distinct accounts/shortcodes; client rejects forged preview identities', async () => {
  const preview=await ingestPosting(url,options());
  const row={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',company:preview.draft.company,title:preview.draft.title,job_url:url+'apply?utm_source=old',location:preview.draft.location,status:'prospect',updated_at:'2026-10-14T00:00:00.123456Z'};
  assert.equal(duplicateCandidates(preview.draft,[row])[0].strength,'strong');
  for (const jobUrl of [url.replace('/example/','/other/'),url.replace('ABC123DEF4','OTHER12345')]) assert.equal(duplicateCandidates(preview.draft,[{...row,job_url:jobUrl}]).length,0);
  for (const forged of [{...preview,identity:{...preview.identity,board:'other'}},{...preview,method:'lever-postings-api'},{...preview,draft:{...preview.draft,status:'applied'}}]) assert.throws(()=>decodePreview(forged,url));
});
