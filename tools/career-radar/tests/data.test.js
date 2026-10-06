import { test } from 'node:test';
import assert from 'node:assert/strict';
// Exercise the exact browser artifact, not just the npm module used for types.
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess, StaleProspectError } from '../data.js';
import { SCORE_FIELDS } from '../model.js';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const revision = '2026-10-06T12:00:00.123456+00:00';
const row = {
  id, owner_id: '11111111-1111-4111-8111-111111111111', company: 'Example', title: 'Designer',
  job_url: null, source: null, location: null, work_arrangement: null, employment_type: null,
  compensation_text: null, job_description: null, posted_on: null, discovered_on: null,
  applied_on: null, status: 'prospect', notes: null, connections: [],
  ...Object.fromEntries(SCORE_FIELDS.map(field => [field, null])),
  assessment_rationale: null, assessment_concerns: null,
  created_at: revision, updated_at: revision
};

function harness(responses) {
  const requests = [];
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        requests.push({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null });
        if (!responses.length) throw new Error('Unexpected HTTP request');
        const response = responses.shift();
        return new Response(JSON.stringify(response.body), {
          status: response.status || 200, headers: { 'content-type': 'application/json' }
        });
      }
    }
  });
  return { data: createRadarDataAccess(client), requests };
}

test('create uses retained UUID, database ownership/defaults and returned row', async () => {
  const { data, requests } = harness([{ body: row }]);
  const result = await data.createProspect({ id, company: ' Example ', title: 'Designer', notes: ' ' });
  assert.equal(result.id, id);
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, { id, company: 'Example', title: 'Designer', notes: null, status: 'prospect' });
  assert.equal(requests[0].url.searchParams.get('select'), '*');
});

test('failed create is surfaced and never retried; reads allow reconciliation', async () => {
  const failure = { code: '23505', message: 'duplicate UUID', details: null, hint: null };
  const { data, requests } = harness([{ status: 409, body: failure }, { body: [row] }]);
  await assert.rejects(data.createProspect({ id, company: 'Example', title: 'Designer' }), error => error.code === '23505');
  assert.equal(requests.length, 1);
  assert.equal((await data.getProspect(id)).id, id);
});

test('patches preserve exact microsecond revision and only touch supplied fields', async () => {
  const saved = { ...row, notes: 'Saved', updated_at: '2026-10-06T12:00:01.000001+00:00' };
  const { data, requests } = harness([{ body: [saved] }]);
  const result = await data.updateProspect(id, { notes: ' Saved ', source: undefined }, revision);
  assert.deepEqual(requests[0].body, { notes: 'Saved' });
  assert.equal(requests[0].method, 'PATCH');
  assert.equal(requests[0].url.searchParams.get('id'), `eq.${id}`);
  assert.equal(requests[0].url.searchParams.get('updated_at'), `eq.${revision}`);
  assert.equal(result.updated_at, saved.updated_at);
});

test('zero affected rows cause a conflict, not false save success', async () => {
  const { data } = harness([{ body: [] }]);
  await assert.rejects(data.updateProspect(id, { notes: 'Unsaved' }, revision), StaleProspectError);
});

test('database errors preserved, inaccessible/missing rows return null', async () => {
  const { data } = harness([
    { status: 403, body: { code: '42501', message: 'permission denied', details: null, hint: null } },
    { body: [] }
  ]);
  await assert.rejects(data.listProspects(), error => error.code === '42501');
  assert.equal(await data.getProspect(id), null);
});

test('assessment and connection updates share revision protection without status writes', async () => {
  const connection = { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Alex' };
  const { data, requests } = harness([
    { body: [{ ...row, systems_fit: 2, personal_interest: 5 }] },
    { body: [{ ...row, connections: [connection] }] }
  ]);
  await data.updateAssessment(id, { systems_fit: 2, personal_interest: 5 }, revision);
  await data.setConnections(id, [connection], revision);
  assert.deepEqual(requests[0].body, { systems_fit: 2, personal_interest: 5 });
  assert.deepEqual(requests[1].body, { connections: [connection] });
  assert.equal(requests[1].url.searchParams.get('updated_at'), `eq.${revision}`);
});

test('status change writes current state only; history is queried separately', async () => {
  const event = { id: 2, prospect_id: id, from_status: 'prospect', to_status: 'offer', recorded_at: revision };
  const { data, requests } = harness([{ body: [{ ...row, status: 'offer' }] }, { body: [event] }]);
  await data.changeStatus(id, 'offer', revision);
  assert.equal(requests.length, 1, 'no browser event insert');
  assert.deepEqual(requests[0].body, { status: 'offer' });
  assert.deepEqual(await data.listStatusEvents(id), [event]);
  assert.equal(requests[1].url.pathname, '/rest/v1/prospect_status_events');
  assert.equal(requests[1].url.searchParams.get('prospect_id'), `eq.${id}`);
  assert.equal(requests[1].url.searchParams.get('order'), 'id.asc');
});

test('board queries narrow fields and paginate in stable order', async () => {
  const dated = { ...row, applied_on: '2026-09-01', discovered_on: '2026-08-31' };
  const { data, requests } = harness([{ body: Array.from({ length: 500 }, () => row) }, { body: [dated] }]);
  const cards = await data.listProspects();
  assert.equal(cards.length, 501);
  assert.equal(cards[0].applied_on, null);
  assert.equal(cards[500].applied_on, '2026-09-01');
  assert.equal(cards[500].discovered_on, '2026-08-31');
  assert.equal(cards[500].updated_at, revision);
  assert.equal(requests[0].url.searchParams.get('order'), 'created_at.desc,id.asc');
  assert.equal(requests[0].url.searchParams.get('offset'), '0');
  assert.equal(requests[1].url.searchParams.get('offset'), '500');
  assert.equal(requests[0].url.searchParams.get('select').includes('job_description'), false);
  assert.ok(requests[0].url.searchParams.get('select').split(',').includes('applied_on'));
  assert.ok(requests[0].url.searchParams.get('select').split(',').includes('discovered_on'));
});

test('invalid input is rejected without HTTP calls', async () => {
  const { data, requests } = harness([]);
  await assert.rejects(data.updateProspect(id, { owner_id: id }, revision));
  await assert.rejects(data.updateProspect(id, {}, revision));
  await assert.rejects(data.updateProspect(id, { notes: 'x' }, 'yesterday'));
  await assert.rejects(data.updateAssessment(id, { title: 'not an assessment' }, revision));
  await assert.rejects(data.changeStatus(id, 'invented', revision));
  assert.equal(requests.length, 0);
});
