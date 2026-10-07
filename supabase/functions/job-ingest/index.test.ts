import assert from 'node:assert/strict';
import { createIngestionHandler } from '../../../tools/career-radar/ingestion/handler.js';
import { normalizeGreenhouse } from '../../../tools/career-radar/ingestion/greenhouse.js';
import { recognizeGreenhouse } from '../../../tools/career-radar/ingestion/greenhouse-url.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const url = 'https://boards.greenhouse.io/example/jobs/12345?gh_src=tracking';
const fixture = JSON.parse(await Deno.readTextFile(new URL('../../../tools/career-radar/tests/fixtures/greenhouse/posting.json', import.meta.url)));

Deno.test('production dependencies normalize the sanitized Greenhouse fixture under Deno', () => {
  const result = normalizeGreenhouse(fixture, recognizeGreenhouse(url), url, new Date('2026-10-07T12:00:00Z'));
  assert.equal(result.draft.company, 'Example Studio');
  assert.equal(result.draft.work_arrangement, 'remote');
  assert.match(result.draft.compensation_text!, /New York: USD 155,000–195,000/);
  assert.doesNotMatch(result.draft.job_description!, /doNotExecute|<p>/);
});

Deno.test('Deno handler authenticates and makes only a bounded public retrieval', async () => {
  const destinations: string[] = [];
  const handler = createIngestionHandler({ ownerId, allowedOrigins: ['https://example.github.io'], authenticate: () => Promise.resolve(ownerId),
    fetcher: (target, init) => {
      destinations.push(String(target)); assert.equal(init!.redirect, 'manual');
      assert.deepEqual(init!.headers, { Accept: 'application/json' });
      return Promise.resolve(Response.json(fixture));
    }
  });
  const denied = await handler(new Request('https://example.invalid/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) }));
  assert.equal(denied.status, 401); assert.equal(destinations.length, 0);
  const response = await handler(new Request('https://example.invalid/', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer synthetic' }, body: JSON.stringify({ url }) }));
  assert.equal(response.status, 200); assert.equal(destinations.length, 1);
  assert.equal(destinations[0], recognizeGreenhouse(url).retrieval_url);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
