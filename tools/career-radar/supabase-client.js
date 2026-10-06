import { createClient } from '@supabase/supabase-js';
import { readPublicConfig } from './config.js';

/** @typedef {import('./database.types.js').Database} Database */

/**
 * Create once in the future application entry point and share this client.
 * Credentials come from explicitly supplied environment configuration.
 * @param {Record<string, string | undefined>} env
 * @returns {import('@supabase/supabase-js').SupabaseClient<Database>}
 */
export function createRadarClient(env) {
  const { supabaseUrl, publishableKey } = readPublicConfig(env);
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
}
