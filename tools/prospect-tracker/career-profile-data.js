import { validateProfile } from './career-profile-model.js';
/** @typedef {import('./database.types.js').Database} Database */
/** @typedef {Database['public']['Tables']['career_profiles']['Row']} ProfileRow */
/** @param {import('@supabase/supabase-js').SupabaseClient<Database>} client */
export function createCareerProfileData(client) {
  /** @param {string} ownerId @returns {Promise<ProfileRow|null>} */
  async function load(ownerId) {
    const { data, error } = await client.from('career_profiles').select('*').eq('owner_id', ownerId).maybeSingle();
    if (error) throw error;
    if (data) validateProfile(data.explicit_profile);
    return data;
  }
  /** User-reviewed conventional editing only. No signals or proposal write surface.
   * @param {string} ownerId @param {unknown} profile @param {ProfileRow|null} previous
   * @returns {Promise<ProfileRow>} */
  async function save(ownerId, profile, previous) {
    const explicit_profile = /** @type {import('./database.types.js').Json} */ (validateProfile(profile));
    const values = { explicit_profile, reviewed_at: new Date().toISOString() };
    const query = previous
      ? client.from('career_profiles').update(values).eq('owner_id', ownerId).eq('updated_at', previous.updated_at)
      : client.from('career_profiles').insert(values);
    const { data, error } = await query.select('*').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Profile changed elsewhere. Your edits are still here. Export them, then reload to reconcile.');
    return data;
  }
  return { load, save };
}
