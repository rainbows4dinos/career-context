import { readPublicConfig } from '../../../tools/career-radar/config.js';
import { createAuthenticator, createIngestionHandler } from '../../../tools/career-radar/ingestion/handler.js';

// Platform JWT verification stays enabled; Auth additionally verifies the actual
// user and the handler restricts retrieval to the configured personal account.
// Deliberately do not read SUPABASE_SERVICE_ROLE_KEY or create an admin client.
const config = readPublicConfig({
  SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: Deno.env.get('RADAR_PUBLISHABLE_KEY')
});
const allowedOrigins = (Deno.env.get('RADAR_ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean);
for (const origin of allowedOrigins) {
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new Error('RADAR_ALLOWED_ORIGINS must contain exact HTTPS origins or explicit HTTP localhost origins');
  }
}
export default { fetch: createIngestionHandler({
  ownerId: Deno.env.get('RADAR_OWNER_ID') ?? '', allowedOrigins,
  authenticate: createAuthenticator(config, fetch), fetcher: fetch
}) };
