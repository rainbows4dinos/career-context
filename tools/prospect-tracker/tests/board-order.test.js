import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalDatabase } from '../scripts/local-database.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const ids = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'];

test('manual order persists in PostgreSQL, remains owner scoped, and never changes status/history', async () => {
  const db = await createLocalDatabase();
  try {
    await db.query('insert into auth.users(id) values ($1),($2)', [owner, other]);
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: owner })]);
    for (const [i, id] of ids.entries()) await db.query('insert into public.prospects(id,company,title,status) values ($1,$2,$3,$4)', [id, 'Synthetic', 'Designer', i === 1 ? 'interested' : 'prospect']);
    const order = async () => (await db.query('select id from public.prospects order by board_position, created_at desc, id')).rows.map(row => row.id);
    const history = async () => (await db.query('select * from public.prospect_status_events order by id')).rows;
    const beforeHistory = await history();
    const original = await order();
    assert.deepEqual(original, ids.toReversed(), 'new prospects enter at top');
    const reorder = (expected, ordered, column = 'prospects') => db.query('select public.reorder_prospect_column($1,$2::uuid[],$3::uuid[])', [column, expected, ordered]);
    await reorder(original, ids);
    assert.deepEqual(await order(), ids);
    assert.deepEqual(await history(), beforeHistory);
    assert.deepEqual((await db.query('select status from public.prospects order by id')).rows.map(row => row.status), ['prospect','interested','prospect']);
    await assert.rejects(reorder(original, original), /Board order changed/);
    await assert.rejects(reorder(ids, [ids[0],ids[0],ids[2]]), /exactly once/);
    await assert.rejects(reorder(ids, [ids[0]]), /exactly once/);
    await assert.rejects(reorder(ids, [ids[0],ids[1],null]), /exactly once/);
    await assert.rejects(reorder(ids, ids, 'unknown'), /Invalid board column/);
    await assert.rejects(db.exec('update public.prospects set board_position = 100'), /permission denied/);
    await db.query('update public.prospects set status = $1 where id = $2', ['applying', ids[0]]);
    assert.deepEqual(await order(), ids, 'same-group status update preserves order');
    await db.query('update public.prospects set status = $1 where id = $2', ['applied', ids[2]]);
    await assert.rejects(reorder(ids, ids), /Board order changed/);
    await db.query('update public.prospects set status = $1 where id = $2', ['prospect', ids[2]]);
    assert.deepEqual(await order(), [ids[2], ids[0], ids[1]], 'cross-column move enters at top');
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: other })]);
    assert.deepEqual(await order(), []);
    await assert.rejects(reorder(ids, ids), /Board order changed/);
    await assert.rejects(reorder([], ids), /exactly once/);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: owner })]);
    assert.deepEqual(await order(), [ids[2],ids[0],ids[1]], 'later session reads saved order');
    await db.exec('set role anon');
    await assert.rejects(reorder(ids, ids), /permission denied/);
  } finally { await db.close(); }
});

test('migration seeds existing column order and preserves the status ledger', async () => {
  const { readFile } = await import('node:fs/promises');
  const db = await createLocalDatabase({ boardOrder: false });
  try {
    await db.query('insert into auth.users(id) values ($1)', [owner]);
    for (const [i, id] of ids.entries()) await db.query('insert into public.prospects(id,owner_id,company,title,status,applied_on,created_at) values ($1,$2,$3,$4,$5,$6,$7)', [id, owner, 'Synthetic', 'Designer', 'applied', i === 1 ? null : `2026-01-0${i+1}`, `2026-10-0${i+1}T00:00:00Z`]);
    const before = (await db.query('select * from public.prospect_status_events order by id')).rows;
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261016010000_prospect_board_order.sql', import.meta.url), 'utf8'));
    assert.deepEqual((await db.query('select id from public.prospects order by board_position')).rows.map(row => row.id), [ids[2],ids[0],ids[1]]);
    assert.deepEqual((await db.query('select * from public.prospect_status_events order by id')).rows, before);
  } finally { await db.close(); }
});

test('independent SDK clients see persisted order and a stale client cannot overwrite it', async () => {
  const { startFixture } = await import('./fixtures/radar-server.js');
  const { createClient } = await import('../vendor/supabase.js');
  const { createRadarDataAccess, StaleProspectError } = await import('../data.js');
  const fixture = await startFixture();
  try {
    const clients = [0,1].map(() => createClient(fixture.origin, 'sb_publishable_synthetic', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
    for (const client of clients) await client.auth.signInWithPassword({ email: 'radar@example.invalid', password: 'fixture-only-password' });
    const [first,second] = clients.map(createRadarDataAccess);
    for (const id of ids) await first.createProspect({ id, company: 'Synthetic', title: 'Designer' });
    const snapshot = (await second.listProspects()).map(card => card.id);
    await first.reorderColumn('prospects', snapshot, ids);
    assert.deepEqual((await second.listProspects()).map(card => card.id), ids);
    await assert.rejects(second.reorderColumn('prospects', snapshot, ids), StaleProspectError);
    assert.deepEqual((await first.listProspects()).map(card => card.id), ids);
    assert.equal((await second.listStatusEvents(ids[0])).length, 1);
  } finally { await fixture.close(); }
});
