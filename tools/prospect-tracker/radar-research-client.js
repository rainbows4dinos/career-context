import { decodeResearch, decisionInputs } from './radar-feed-model.js';
/** Production remains deliberately disabled until a separately authorized enablement.
 * The mounted UI accepts a mock research function for local tests; no browser override flag. */
export const RESEARCH_ENABLED = false;
/** @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client
 * @param {number} revision @param {import('./radar-feed.types.js').OpportunityRow[]} rows @param {AbortSignal} signal */
export async function researchOpportunities(client,revision,rows,signal) {
  if(!RESEARCH_ENABLED) throw new Error('Live discovery is disabled.');
  const {data,error}=await client.functions.invoke('research-opportunities',{body:{profile_revision:revision,decisions:decisionInputs(rows)},signal});
  if(error) throw new Error('Research could not finish. Previous results are unchanged. No retry was made.');
  return decodeResearch(data,revision);
}
