import { decodeOpportunity, opportunityKey, snapshot, PASS_REASONS } from './radar-feed-model.js';
import { validateId } from './model.js';
/** @typedef {import('./radar-feed.types.js').OpportunityRow} OpportunityRow */
/** @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client */
export function createOpportunityData(client) {
  /** @param {string} owner @returns {Promise<OpportunityRow[]>} */
  async function load(owner) {
    const rows=[];
    for(let offset=0;;offset+=500) {
      const {data,error}=await client.from('radar_opportunities').select('*').eq('owner_id',validateId(owner)).order('id').range(offset,offset+499);
      if(error) throw error;
      rows.push(...data.map(decodeOpportunity));if(data.length<500) return rows;
    }
  }
  /** @param {string} owner @param {string} id */
  async function get(owner,id) {
    const {data,error}=await client.from('radar_opportunities').select('*').eq('owner_id',validateId(owner)).eq('id',validateId(id)).maybeSingle();
    if(error) throw error;return data ? decodeOpportunity(data):null;
  }
  /** New identities only. A retry reconciles the same key; never upsert a decision away.
   * @param {string} owner @param {import('./radar-feed.types.js').Snapshot} value @param {string} id */
  async function insert(owner,value,id) {
    const card=snapshot(value,value.profile_revision,value.searched_at),key=opportunityKey(card);
    const {data,error}=await client.from('radar_opportunities').insert({owner_id:validateId(owner),id:validateId(id),identity_key:key,snapshot:/** @type {import('./database.types.js').Json} */(card)}).select('*').single();
    if(error) {
      // An insert may have committed before its response was lost. Reconcile, never overwrite.
      const found=(await load(owner)).find(r=>r.identity_key===key);
      if(found) return found;throw error;
    }
    return decodeOpportunity(data);
  }
  /** @param {OpportunityRow} row @param {import('./database.types.js').Database['public']['Tables']['radar_opportunities']['Update']} values */
  async function update(row,values) {
    const {data,error}=await client.from('radar_opportunities').update(values).eq('owner_id',row.owner_id).eq('id',row.id).eq('updated_at',row.updated_at).select('*').maybeSingle();
    if(error) throw error;
    if(!data) throw new Error('Opportunity changed elsewhere. Your choice is still pending; reload history before retrying.');
    return decodeOpportunity(data);
  }
  /** @param {OpportunityRow} row @param {'new'|'accepted'|'passed'} decision @param {string|null} [reason] @param {string|null} [note] */
  async function decide(row,decision,reason=null,note=null) {
    if(!['new','accepted','passed'].includes(decision) || reason!==null && !Object.hasOwn(PASS_REASONS,reason) || note!==null && note.length>500) throw new Error('Invalid review decision.');
    return update(row,{decision,pass_reason:decision==='passed'?reason:null,pass_note:decision==='passed'?note:null});
  }
  /** @param {OpportunityRow} row @param {string} prospect */
  async function link(row,prospect) { return update(row,{prospect_id:validateId(prospect)}); }
  return {load,get,insert,decide,link};
}
