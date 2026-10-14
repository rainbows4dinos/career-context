import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { emptyProfile, validateProfile, careerContextDraft, reviewedFactors } from '../career-profile-model.js';
import { createCareerProfileData } from '../career-profile-data.js';
import { createClient } from '../vendor/supabase.js';
import { createLocalDatabase } from '../scripts/local-database.js';

test('profile validates importance, unknown salary, bounds and schema; unreviewed factors are unusable', () => {
  const profile = emptyProfile();
  assert.equal(profile.compensation.minimum, null);
  assert.equal(profile.compensation.unknown, 'review');
  assert.throws(() => reviewedFactors({ explicit_profile: profile, reviewed_at: null, revision: 1 }));
  profile.factors.sectors = { value: 'Synthetic sector', importance: 'strong' };
  const result = reviewedFactors({ explicit_profile: profile, reviewed_at: '2026-10-14', revision: 2, inferred_signals: [{ value: 'Contradictory sector' }] });
  assert.equal(result.factors.sectors.value, 'Synthetic sector');
  assert.equal(result.revision, 2);
  for (const invalid of [NaN, Infinity, -1, '100', 100000001]) assert.throws(() => validateProfile({ ...profile, compensation: { ...profile.compensation, minimum: invalid } }));
  assert.throws(() => validateProfile({ ...profile, schema_version: 2 }));
  assert.throws(() => validateProfile({ ...profile, inferred_signals: [] }));
  assert.throws(() => validateProfile({ ...profile, factors: {} }));
  const bad = structuredClone(profile); bad.factors.scope.importance = 'maybe'; assert.throws(() => validateProfile(bad));
  const copy = validateProfile(profile); copy.factors.sectors.value = 'changed'; assert.equal(profile.factors.sectors.value, 'Synthetic sector');
});

test('canonical draft contains strengths/roles but does not guess practical constraints', async () => {
  const source = await readFile(new URL('../../../resume-master.md', import.meta.url), 'utf8');
  const draft = careerContextDraft(source);
  assert.match(draft.factors.strengths.value, /Systems thinking/);
  assert.match(draft.factors.seniority.value, /Principal Product Designer/);
  assert.equal(draft.factors.employment.value, '');
  assert.equal(draft.factors.location.value, '');
  assert.equal(draft.compensation.minimum, null);
});

test('data writes explicit settings only, retains microseconds, reports conflicts and never upserts', async () => {
  const requests = [], responses = [[], [], { message: 'failed', code: 'TEST' }];
  const client = createClient('https://example.supabase.co', 'sb_publishable_synthetic', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    requests.push({ url: new URL(String(input)), method: init.method, body: JSON.parse(init.body) });
    const body = responses.shift(); return Response.json(body, { status: body.code ? 503 : 200 });
  } } });
  const access = createCareerProfileData(client), previous = { updated_at: '2026-10-14T12:00:00.123456+00:00' };
  await assert.rejects(access.save('synthetic', emptyProfile(), previous), /changed elsewhere/);
  assert.equal(requests[0].url.searchParams.get('updated_at'), 'eq.' + previous.updated_at);
  assert.deepEqual(Object.keys(requests[0].body).sort(), ['explicit_profile', 'reviewed_at']);
  await assert.rejects(access.save('synthetic', emptyProfile(), null), /changed elsewhere/);
  assert.equal(requests[1].method, 'POST');
  await assert.rejects(access.save('synthetic', emptyProfile(), previous), error => error.code === 'TEST');
  assert.equal(requests.length, 3);
});

test('PostgreSQL enforces profile ownership, signal separation, immutable identity and revisions', async () => {
  const db = await createLocalDatabase();
  const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
  try {
    await db.query('insert into auth.users(id) values ($1),($2)', [a,b]);
    const asOwner = (owner, callback) => db.transaction(async tx => {
      await tx.exec('set local role authenticated'); await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: owner })]); return callback(tx);
    });
    await asOwner(a, tx => tx.query('insert into career_profiles(explicit_profile,reviewed_at) values ($1,now())', [JSON.stringify(emptyProfile())]));
    assert.equal((await asOwner(b, tx => tx.query('select * from career_profiles'))).rows.length, 0);
    assert.equal((await asOwner(b, tx => tx.query("update career_profiles set reviewed_at=now() where owner_id=$1 returning *", [a]))).rows.length, 0);
    await assert.rejects(asOwner(a, tx => tx.query("update career_profiles set inferred_signals='[]'")), /permission denied/);
    await assert.rejects(asOwner(a, tx => tx.query('update career_profiles set owner_id=$1', [b])), /permission denied/);
    await assert.rejects(asOwner(a, tx => tx.exec('delete from career_profiles')), /permission denied/);
    await db.exec('set role anon'); await assert.rejects(db.query('select * from career_profiles'), /permission denied/); await db.exec('reset role');
    const before = (await db.query('select updated_at::text, revision from career_profiles')).rows[0];
    const explicit = emptyProfile(); explicit.factors.scope.value = 'Synthetic explicit choice';
    await asOwner(a, tx => tx.query('update career_profiles set explicit_profile=$1 where updated_at=$2', [JSON.stringify(explicit), before.updated_at]));
    const after = (await db.query('select updated_at::text, revision from career_profiles')).rows[0];
    assert.equal(after.revision, 2); assert.notEqual(after.updated_at, before.updated_at);
    assert.equal((await asOwner(a, tx => tx.query('update career_profiles set explicit_profile=$1 where updated_at=$2 returning *', [JSON.stringify(emptyProfile()), before.updated_at]))).rows.length, 0);
    await db.exec(`update career_profiles set inferred_signals='[{"factor_id":"scope","value":"Synthetic contrary inference"}]'`);
    const row = (await db.query('select * from career_profiles')).rows[0];
    assert.equal(row.revision, 2); assert.equal(row.explicit_profile.factors.scope.value, 'Synthetic explicit choice');
    assert.throws(() => reviewedFactors({ ...row, reviewed_at: null }));
    await assert.rejects(db.query('update career_profiles set owner_id=$1', [b]), /immutable/);
    assert.equal((await db.query('select count(*)::integer as n from prospect_status_events')).rows[0].n, 0);
  } finally { await db.close(); }
});
