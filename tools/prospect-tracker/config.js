/** @typedef {{ supabaseUrl: string, publishableKey: string }} PublicConfig */

/**
 * Accept only public browser credentials. Never import process.env wholesale.
 * @param {Record<string, string | undefined>} env
 * @returns {PublicConfig}
 */
export function readPublicConfig(env) {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');
  }
  const url = new URL(supabaseUrl);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SUPABASE_URL must be a project origin without credentials or a path');
  }
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('SUPABASE_URL must use HTTPS (HTTP is allowed for local Supabase)');
  }
  // Explicitly exclude secret/service-role keys. Legacy anon JWTs are supported.
  let publicKey = publishableKey.startsWith('sb_publishable_');
  if (!publicKey && publishableKey.split('.').length === 3) {
    try {
      const payload = publishableKey.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      publicKey = decoded.role === 'anon';
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) throw new Error('Use a publishable key or legacy anon key, never a secret/service-role key');
  return { supabaseUrl: url.origin, publishableKey };
}
