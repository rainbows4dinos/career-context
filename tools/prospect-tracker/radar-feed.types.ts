import type { Facts, Verification } from './research/types.js';
import type { Database } from './database.types.js';
export type Snapshot = {
  facts: Facts; claims: Facts;
  assessment: { why_fit:string[]; concerns_or_unknowns:string[]; wildcard_rationale:string|null };
  verification: Pick<Verification,'availability'|'consultation'|'reason'|'checked_at'|'application'>;
  sources: {field:string;url:string;origin:'ai_discovery'|'independent_check'}[];
  original_url:string|null; discovery_url:string; profile_revision:number; searched_at:string;
};
export type OpportunityRow = Omit<Database['public']['Tables']['radar_opportunities']['Row'],'snapshot'|'decision'> & {snapshot:Snapshot;decision:'new'|'accepted'|'passed'};
export type ResearchResult = {id:string;timestamp:string;profile_revision:number;status:'completed'|'partial'|'failed';opportunities:Snapshot[];estimated_cost:number|null;message:string};
