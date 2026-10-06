import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLocalDatabase } from '../scripts/local-database.js';
import { STATUSES, WORK_ARRANGEMENTS, SCORE_FIELDS } from '../model.js';

test('migration, constraints, ownership, RLS, revisions and atomic status history in PostgreSQL', async () => {
  const db = await createLocalDatabase();
  try {
    await db.exec(await readFile(new URL('../../../supabase/tests/career_radar.sql', import.meta.url), 'utf8'));
    const { rows } = await db.query('select count(*)::integer as count from public.prospects');
    assert.equal(rows[0].count, 0, 'synthetic fixtures must roll back');
  } finally {
    await db.close();
  }
});

test('application vocabularies and assessment fields match the database constraints', async () => {
  const db = await createLocalDatabase();
  try {
    await db.exec("insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111')");
    for (const status of STATUSES) {
      await db.query('insert into public.prospects(company,title,status,owner_id) values ($1,$2,$3,$4)', [
        'Synthetic', 'Designer', status, '11111111-1111-4111-8111-111111111111'
      ]);
    }
    for (const arrangement of WORK_ARRANGEMENTS) {
      await db.query('update public.prospects set work_arrangement = $1', [arrangement]);
    }
    for (const field of SCORE_FIELDS) {
      // Field names come from the constant above, never from user input.
      await db.exec(`update public.prospects set ${field} = 5`);
      await assert.rejects(db.exec(`update public.prospects set ${field} = 6`));
      await db.exec(`update public.prospects set ${field} = null`);
    }
  } finally {
    await db.close();
  }
});
