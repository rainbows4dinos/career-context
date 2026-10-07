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
