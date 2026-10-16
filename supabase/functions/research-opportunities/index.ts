import { readPublicConfig } from '../../../tools/prospect-tracker/config.js';
import { createAuthenticator } from '../../../tools/prospect-tracker/ingestion/handler.js';
import { createProfileLoader, createResearchHandler } from '../../../tools/prospect-tracker/research/handler.js';

const config = readPublicConfig({ SUPABASE_URL: Deno.env.get('SUPABASE_URL'), SUPABASE_PUBLISHABLE_KEY: Deno.env.get('RADAR_PUBLISHABLE_KEY') });
const allowedOrigins = (Deno.env.get('RADAR_ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean);
for (const origin of allowedOrigins) {
  const url = new URL(origin);
  if (url.origin !== origin || url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('Invalid research origin.');
}
// No service-role key, no writes, no browser credentials. Disabled by default.
export default { fetch: createResearchHandler({
  ownerId: Deno.env.get('RADAR_OWNER_ID') ?? '', allowedOrigins,
  key: Deno.env.get('OPENAI_API_KEY') ?? '', enabled: Deno.env.get('RADAR_RESEARCH_ENABLED') === 'true',
  billingConfirmed: Deno.env.get('RADAR_RESEARCH_BILLING_CONFIRMED') === 'true',
  authenticate: createAuthenticator(config,fetch), loadProfile: createProfileLoader(config,fetch), fetcher: fetch
}) };
