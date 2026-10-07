import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recognizeGreenhouse } from '../ingestion/greenhouse-url.js';
import { descriptionText, ingestGreenhouse, normalizeGreenhouse } from '../ingestion/greenhouse.js';
import { createAuthenticator, createIngestionHandler } from '../ingestion/handler.js';
import { decodePreview, retrieveJob } from '../ingestion-client.js';
import { duplicateCandidates } from '../duplicate-match.js';
import { createClient } from '../vendor/supabase.js';

const posting = JSON.parse(await readFile(new URL('./fixtures/greenhouse/posting.json', import.meta.url), 'utf8'));
const url = 'https://boards.greenhouse.io/example/jobs/12345?gh_src=tracking&utm_source=example#application';
const identity = recognizeGreenhouse(url);
const now = new Date('2026-10-07T12:00:00Z');
const ownerId = '11111111-1111-4111-8111-111111111111';
const signal = () => new AbortController().signal;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const prospect = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', company: 'Example Studio', title: posting.title, job_url: null, location: null, status: 'applied', applied_on: '2026-09-30', updated_at: '2026-10-06T12:00:00.123456Z' };
const options = { ownerId, allowedOrigins: ['https://example.github.io'], authenticate: async () => ownerId, fetcher: async () => json(posting) };
const request = (body = { url }, headers = {}) => new Request('https://example.supabase.co/functions/v1/job-ingest', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic-user-session', origin: options.allowedOrigins[0], ...headers }, body: JSON.stringify(body)
});

test('recognition canonicalizes Greenhouse aliases/tracking and embedded job links', () => {
  assert.equal(identity.canonical_url, 'https://job-boards.greenhouse.io/example/jobs/12345');
  assert.equal(identity.retrieval_url, 'https://boards-api.greenhouse.io/v1/boards/example/jobs/12345?pay_transparency=true');
  assert.deepEqual(recognizeGreenhouse('https://job-boards.greenhouse.io/example/jobs/12345/'), identity);
  assert.deepEqual(recognizeGreenhouse('https://boards.greenhouse.io/embed/job_app?for=example&token=12345'), identity);
});

test('recognition rejects malformed, arbitrary, deceptive, local and unsupported URLs', () => {
  for (const value of ['garbage', 'http://boards.greenhouse.io/example/jobs/12345', 'https://boards.greenhouse.io:444/example/jobs/12345', 'https://user:secret@boards.greenhouse.io/example/jobs/12345', 'https://boards.greenhouse.io.evil.invalid/example/jobs/12345', 'https://127.0.0.1/example/jobs/12345', 'https://[::1]/example/jobs/12345', 'https://boards.greenhouse.io/example', 'https://boards.greenhouse.io/%2e%2e/jobs/12345', 'https://jobs.lever.co/example/12345', 'https://boards-api.greenhouse.io/v1/boards/example/jobs/12345']) assert.throws(() => recognizeGreenhouse(value));
});

test('normalization preserves tiers/remote restrictions, first publication and provenance without inventing facts', () => {
  const result = normalizeGreenhouse(posting, identity, url, now);
  assert.equal(result.draft.company, 'Example Studio');
  assert.equal(result.draft.work_arrangement, 'remote');
  assert.equal(result.draft.location, posting.location.name);
  assert.equal(result.draft.posted_on, '2026-09-30');
  assert.equal(result.draft.discovered_on, '2026-10-07');
  assert.match(result.draft.compensation_text, /United States: USD 140,000–180,000/);
  assert.match(result.draft.compensation_text, /New York: USD 155,000–195,000/);
  assert.doesNotMatch(result.draft.compensation_text, /annual|hourly/);
  assert.match(result.draft.job_description, /Build thoughtful & accessible tools\.\n\nResponsibilities\n\n• Design interactions\./);
  assert.doesNotMatch(result.draft.job_description, /doNotExecute|<p>/);
  for (const key of ['source','status','applied_on','connections','overall_assessment','employment_type']) assert.equal(key in result.draft, false);
  assert.equal(result.identity.requisition_id, 'DES-42');
  assert.ok(result.warnings.some(item => item.includes('pay interval')));
  assert.equal(decodePreview(result, url).draft.company, 'Example Studio');
});

test('missing optional facts stay absent; missing required facts produce an editable draft', () => {
  const result = normalizeGreenhouse({ id: 12345, title: 'Designer', location: { name: 'New York' }, first_published: '2026-02-30T12:00:00Z' }, identity, url, now);
  for (const key of ['company','compensation_text','posted_on','work_arrangement','employment_type','job_description']) assert.equal(key in result.draft, false);
  assert.ok(result.warnings.some(item => item.startsWith('Company') && item.includes('Required')));
  assert.equal(normalizeGreenhouse({ id: 12345 }, identity, url, now, '2026-10-01').draft.discovered_on, '2026-10-01');
  assert.throws(() => normalizeGreenhouse({ id: 12345 }, identity, url, now, '2026-02-30'));
  assert.throws(() => normalizeGreenhouse({ id: 42 }, identity, url, now));
  assert.equal(normalizeGreenhouse({ id: 12345, company_name: '<script>bad()</script>' }, identity, url, now).draft.company, undefined);
});

test('ambiguous arrangements and invalid ranges stay missing; HTML is inert and preserves paragraphs/lists', () => {
  for (const location of ['Remote / Hybrid', 'Not remote', 'New York']) assert.equal(normalizeGreenhouse({ id: 12345, location: { name: location } }, identity, url, now).draft.work_arrangement, undefined);
  const result = normalizeGreenhouse({ id: 12345, pay_input_ranges: [{ min_cents: 200, max_cents: 100, currency_type: 'USD' }] }, identity, url, now);
  assert.equal(result.draft.compensation_text, undefined);
  assert.ok(result.warnings.some(item => item.includes('invalid compensation')));
  assert.equal(descriptionText('&amp;lt;p&amp;gt;First&amp;lt;/p&amp;gt;&amp;lt;p&amp;gt;Second&amp;lt;/p&amp;gt;'), 'First\n\nSecond');
  assert.equal(descriptionText('<p>Hello<img src="https://evil.invalid"> world</p><style>bad</style><iframe>bad</iframe><script>bad</script>'), 'Hello world');
});

test('pipeline makes only the fixed public API GET; untrusted absolute_url is never followed', async () => {
  const requests = [];
  const result = await ingestGreenhouse(url, { now, signal: signal(), fetcher: async (target, init) => { requests.push({ target, init }); return json(posting); } });
  assert.equal(requests.length, 1); assert.equal(requests[0].target, identity.retrieval_url);
  assert.equal(requests[0].init.redirect, 'manual');
  assert.deepEqual(requests[0].init.headers, { Accept: 'application/json' });
  assert.equal(result.draft.job_url, identity.canonical_url);
});

test('expired, redirects, throttling, malformed responses and fetch failure are explicit failures', async () => {
  for (const [status, code] of [[404,'unavailable'], [410,'unavailable'], [302,'redirect_blocked'], [429,'upstream_busy'], [500,'retrieval_failed']]) await assert.rejects(ingestGreenhouse(url, { signal: signal(), fetcher: async () => json({}, status) }), error => error.code === code);
  await assert.rejects(ingestGreenhouse(url, { signal: signal(), fetcher: async () => new Response('not JSON') }), error => error.code === 'invalid_posting');
  await assert.rejects(ingestGreenhouse(url, { signal: signal(), fetcher: async () => { throw new Error('network failed'); } }), /network failed/);
  await assert.rejects(ingestGreenhouse(url, { signal: signal(), fetcher: async () => new Response('bad', { headers: { 'content-type': 'application/json' } }) }), error => error.code === 'invalid_posting');
});

test('streaming body limit works even without Content-Length and deadlines bound hanging bodies', async () => {
  const huge = new Response(JSON.stringify({ ...posting, content: 'x'.repeat(1024 * 1024) }), { headers: { 'content-type': 'application/json' } });
  await assert.rejects(ingestGreenhouse(url, { signal: signal(), fetcher: async () => huge }), error => error.code === 'too_large');
  const hanging = new ReadableStream({ start() {} });
  const handler = createIngestionHandler({ ...options, timeoutMs: 20, fetcher: async () => new Response(hanging, { headers: { 'content-type': 'application/json' } }) });
  const response = await handler(request());
  assert.equal(response.status, 504); assert.equal((await response.json()).error.code, 'timeout');
});

test('handler authenticates and authorizes before outbound retrieval, restricts CORS/method/body', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return json(posting); };
  for (const [overrides, req, status] of [
    [{ authenticate: async () => null }, request(), 401],
    [{ authenticate: async () => 'other-user' }, request(), 403],
    [{ ownerId: '' }, request(), 503],
    [{}, request({}, { authorization: '' }), 401],
    [{}, request({}, { origin: 'https://evil.invalid' }), 403],
    [{}, request({ url, unsupported: true }), 400],
    [{}, request({ url: 'https://evil.invalid/job' }), 400],
    [{}, request({ url: 'x'.repeat(5000) }), 413],
    [{}, new Request('https://example.invalid/', { method: 'GET' }), 405]
  ]) assert.equal((await createIngestionHandler({ ...options, fetcher, ...overrides })(req)).status, status);
  assert.equal(calls, 0);
  const response = await createIngestionHandler({ ...options, fetcher })(request());
  assert.equal(response.status, 200); assert.equal(calls, 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), options.allowedOrigins[0]);
  const preflight = await createIngestionHandler(options)(new Request('https://example.invalid/', { method: 'OPTIONS', headers: { origin: options.allowedOrigins[0] } }));
  assert.equal(preflight.status, 204);
});

test('Auth verification forwards the session only to the fixed project and rejects anon/key-only identities', async () => {
  const requests = [];
  const authenticate = createAuthenticator({ supabaseUrl: 'https://example.supabase.co', publishableKey: 'sb_publishable_synthetic' }, async (target, init) => { requests.push({ target, init }); return json({ id: ownerId, role: 'authenticated', is_anonymous: false }); });
  assert.equal(await authenticate('synthetic-session', signal()), ownerId);
  assert.equal(requests[0].target, 'https://example.supabase.co/auth/v1/user');
  assert.equal(requests[0].init.headers.Authorization, 'Bearer synthetic-session');
  assert.equal(requests[0].init.redirect, 'manual');
  for (const body of [{ id: ownerId, role: 'anon' }, { id: ownerId, role: 'authenticated', is_anonymous: true }, {}]) assert.equal(await createAuthenticator({ supabaseUrl: 'https://example.supabase.co', publishableKey: 'public' }, async () => json(body))('not-a-user', signal()), null);
});

test('duplicates match canonical aliases; distinct known postings and distinct roles are kept separate', () => {
  const draft = normalizeGreenhouse(posting, identity, url, now).draft;
  const exact = { ...prospect, job_url: url };
  assert.equal(duplicateCandidates(draft, [exact])[0].strength, 'strong');
  assert.equal(duplicateCandidates(draft, [exact], exact.id).length, 0);
  assert.equal(duplicateCandidates(draft, [{ ...exact, job_url: 'https://boards.greenhouse.io/example/jobs/54321' }]).length, 0);
  assert.equal(duplicateCandidates(draft, [{ ...prospect, company: ' EXAMPLE   STUDIO ' }])[0].strength, 'possible');
  assert.equal(duplicateCandidates(draft, [{ ...prospect, title: 'Product Designer' }]).length, 0);
  assert.equal(duplicateCandidates(draft, [{ ...prospect, location: 'London' }]).length, 0);
});

test('browser boundary rejects unexpected write fields and the real SDK invokes retrieval without database writes', async () => {
  const preview = normalizeGreenhouse(posting, identity, url, now);
  for (const field of ['owner_id','status','connections','assessment_rationale']) assert.throws(() => decodePreview({ ...preview, draft: { ...preview.draft, [field]: 'bad' } }, url));
  assert.throws(() => decodePreview({ ...preview, identity: { ...preview.identity, posting_id: 'wrong' } }, url));
  const requests = [];
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (target, init) => { requests.push({ target: String(target), init }); return json(preview); } }
  });
  assert.equal((await retrieveJob(client, url, signal())).draft.company, posting.company_name);
  assert.equal(requests.length, 1); assert.match(requests[0].target, /\/functions\/v1\/job-ingest$/);
  assert.deepEqual(JSON.parse(requests[0].init.body), { url });
  assert.equal(requests.some(item => item.target.includes('/rest/')), false);
});
