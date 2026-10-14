import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startFixture } from './fixtures/radar-server.js';
import { createClient } from '../vendor/supabase.js';
import { createRadarDataAccess } from '../data.js';
import { retrieveJob } from '../ingestion-client.js';

test('authenticated retrieve/cancel write nothing; explicit existing create path produces one normal event and retained UUID retry', async () => {
  const fixture = await startFixture();
  const client = createClient(fixture.origin, 'sb_publishable_synthetic', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    const { error } = await client.auth.signInWithPassword({ email: 'radar@example.invalid', password: 'fixture-only-password' });
    assert.equal(error, null);
    const preview = await retrieveJob(client, 'https://boards.greenhouse.io/example/jobs/12345', new AbortController().signal);
    const stats = () => fetch(fixture.origin + '/__fixture').then(response => response.json());
    assert.deepEqual(await stats(), { prospects: 0, events: 0, retrieves: 1, attempts: 0 }, 'discarding a retrieved preview has no database effect');
    const data = createRadarDataAccess(client);
    await fetch(fixture.origin + '/__fixture/fail-next-save', { method: 'POST' });
    const input = { ...preview.draft, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', company: preview.draft.company, title: preview.draft.title };
    await assert.rejects(data.createProspect(input), error => error.code === 'TEST_FAILURE');
    assert.equal(preview.draft.company, 'Example Studio');
    assert.equal(await data.getProspect(input.id), null);
    const saved = await data.createProspect(input);
    assert.equal(saved.id, input.id); assert.equal(saved.status, 'prospect'); assert.equal(saved.applied_on, null); assert.equal(saved.source, null);
    const events = await data.listStatusEvents(saved.id);
    assert.equal(events.length, 1); assert.equal(events[0].from_status, null); assert.equal(events[0].to_status, 'prospect');
    assert.equal((await data.listProspectIdentities())[0].id, saved.id);
    assert.equal((await stats()).prospects, 1);
    assert.equal((await data.getProspect(input.id)).job_url, saved.job_url);
  } finally { await client.auth.signOut({ scope: 'local' }); await fixture.close(); }
});

for (const [provider, url] of [
  ['Ashby','https://jobs.ashbyhq.com/example/11111111-aaaa-4111-8111-111111111111'],
  ['Lever','https://jobs.lever.co/example/22222222-bbbb-4222-8222-222222222222'],
  ['Workday','https://example.wd5.myworkdayjobs.com/en-US/External_Careers/job/Example-City/Senior-Product-Designer_REQ-123-1']
]) test(`${provider} authenticated preview/Cancel writes nothing; failed save preserves facts and normal retry creates one prospect/history event`, async () => {
  const fixture = await startFixture();
  const client = createClient(fixture.origin, 'sb_publishable_synthetic', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  try {
    assert.equal((await client.auth.signInWithPassword({ email: 'radar@example.invalid', password: 'fixture-only-password' })).error, null);
    const preview = await retrieveJob(client, url, new AbortController().signal);
    const stats = () => fetch(fixture.origin + '/__fixture').then(response => response.json());
    assert.deepEqual(await stats(), { prospects: 0, events: 0, retrieves: 1, attempts: 0 });
    const company = provider === 'Workday' ? '2100 Example Legal Entity LLC' : 'Example Studio';
    assert.equal(preview.draft.company,company);
    const data = createRadarDataAccess(client);
    const input = { ...preview.draft, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', company: preview.draft.company, title: preview.draft.title };
    await fetch(fixture.origin + '/__fixture/fail-next-save', { method: 'POST' });
    await assert.rejects(data.createProspect(input), error => error.code === 'TEST_FAILURE');
    assert.equal(preview.draft.company,company); assert.equal(await data.getProspect(input.id),null);
    const saved = await data.createProspect(input);
    assert.equal(saved.id,input.id);assert.equal(saved.status,'prospect');assert.equal(saved.applied_on,null);assert.equal(saved.source,null);
    const history = await data.listStatusEvents(saved.id);
    assert.equal(history.length,1);assert.equal(history[0].from_status,null);assert.equal(history[0].to_status,'prospect');
    assert.equal((await data.getProspect(saved.id)).compensation_text,preview.draft.compensation_text);
    assert.equal((await stats()).prospects,1);assert.equal((await stats()).events,1);
  } finally { await client.auth.signOut({ scope: 'local' }); await fixture.close(); }
});
