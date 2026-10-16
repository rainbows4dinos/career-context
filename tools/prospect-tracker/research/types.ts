/** Transient research contract. Decisions remain caller-owned; no Tracker writes. */
export type DecisionIdentity = { original_url: string | null; company: string | null; job_title: string | null };
export type Decision = DecisionIdentity & { decision: 'accept' | 'pass' };
export type Evidence = { field: string; url: string; support: string };
export type Candidate = {
  company: string; job_title: string; location: string | null; remote_eligibility: string | null;
  compensation_text: string | null; original_employer_or_ats_url: string | null;
  discovery_source_url: string; source_check_timestamp: null; verification_status: string;
  why_fit: string[]; concerns_or_unknowns: string[]; wildcard_rationale: string | null; evidence: Evidence[];
};
export type Action = { id: string; type: 'search' | 'open_page' | 'find_in_page'; status: string; url: string | null; sources: string[] };
export type Facts = { company: string | null; job_title: string | null; location: string | null; remote_eligibility: string | null; compensation_text: string | null };
export type Verification = {
  source_urls: string[]; notes: string[]; work_arrangement: string | null; field_sources: Record<string,string>; incomplete: boolean;
  consultation: 'unknown' | 'search_only' | 'original_page_consulted';
  availability: 'uncertain' | 'appears_available' | 'unavailable'; reason: string; checked_at: string;
  requested_url: string | null; observed_url: string | null; redirect_url: string | null;
  application: { status: 'not_established' | 'control_visible' | 'form_observed'; url: string | null };
};
export type PostingCheck = Verification & { facts: Facts };
export type Opportunity = {
  facts: Facts;
  claims: Facts; decision_identity: DecisionIdentity;
  original_url: string | null; discovery_url: string; evidence: Array<Evidence & { origin: 'ai_discovery' | 'independent_check' }>;
  assessment: { why_fit: string[]; concerns_or_unknowns: string[]; wildcard_rationale: string | null };
  verification: Verification;
};
export type Usage = { input_tokens: number; cached_tokens: number; output_tokens: number; reasoning_tokens: number };
export type Run = {
  id: string; timestamp: string; profile_revision: number; provider: 'openai'; model: string;
  error_code: 'provider_failure' | 'timeout' | 'invalid_structured_output' | 'missing_search' | 'profile_mismatch' | null;
  status: 'completed' | 'partial' | 'failed'; elapsed_ms: number; opportunities: Opportunity[];
  actions: Action[]; usage: Usage | null;
  estimated_cost: { usd: number; basis: string; confirmed: false } | null;
  notes: string[]; rejected_count: number; suppressed_count: number;
};
