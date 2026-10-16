import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

/**
 * Actual embedded PostgreSQL, without the Supabase services. The bootstrap only
 * supplies Supabase's roles and auth.uid()/auth.users contract for SQL tests.
 */
export async function createLocalDatabase({ boardOrder = true } = {}) {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
    `);
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261006000000_career_radar_v0.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261014000000_career_profiles.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../../supabase/migrations/20261016000000_radar_opportunities.sql', import.meta.url), 'utf8'));
    if (boardOrder) await db.exec(await readFile(new URL('../../../supabase/migrations/20261016010000_prospect_board_order.sql', import.meta.url), 'utf8'));
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}
