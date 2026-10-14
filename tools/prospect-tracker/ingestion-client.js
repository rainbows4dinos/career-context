import { normalizePatch } from './model.js';
import { IngestionError } from './ingestion/errors.js';
import { recognizePosting, INGESTION_METHODS } from './ingestion/posting-url.js';

const FIELDS = ['company','title','job_url','location','work_arrangement','employment_type','compensation_text','job_description','posted_on','discovered_on'];

/** Validate the server boundary instead of passing an arbitrary object to insert.
 * @param {unknown} input @param {string} originalUrl
 * @returns {import('./ingestion/preview.js').IngestionPreview}
 */
export function decodePreview(input, originalUrl) {
  if (!input || typeof input !== 'object') throw new Error('Invalid ingestion preview');
  const value = /** @type {Record<string,unknown>} */ (input);
  const draft = value.draft;
  if (!draft || typeof draft !== 'object' || Array.isArray(draft) || Object.keys(draft).some(key => !FIELDS.includes(key))) throw new Error('Invalid ingestion draft fields');
  const normalized = /** @type {import('./model.js').DetailsPatch} */ (normalizePatch(/** @type {import('./model.js').DetailsPatch} */ (draft)));
  const identity = recognizePosting(originalUrl);
  const meta = /** @type {Record<string,unknown>|null} */ (value.identity);
  if (!meta || meta.provider !== identity.provider || meta.board !== identity.board || meta.posting_id !== identity.posting_id || (meta.region ?? null) !== ('region' in identity ? identity.region : null) || meta.canonical_url !== identity.canonical_url || meta.retrieval_url !== identity.retrieval_url || (meta.requisition_id !== null && typeof meta.requisition_id !== 'string') || normalized.job_url !== identity.canonical_url) throw new Error('Invalid ingestion posting identity');
  if (value.original_url !== originalUrl || value.method !== INGESTION_METHODS[identity.provider] || typeof value.retrieved_at !== 'string' || !Number.isFinite(Date.parse(value.retrieved_at))) throw new Error('Invalid ingestion provenance');
  if (!Array.isArray(value.warnings) || !value.warnings.every(item => typeof item === 'string') || !value.field_sources || typeof value.field_sources !== 'object' || Array.isArray(value.field_sources) || Object.entries(value.field_sources).some(([key, source]) => !FIELDS.includes(key) || typeof source !== 'string')) throw new Error('Invalid ingestion warnings or field sources');
  return { .../** @type {import('./ingestion/preview.js').IngestionPreview} */ (input), draft: normalized };
}

/** Retrieval only; no data-access dependency or write operation.
 * @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client
 * @param {string} url @param {AbortSignal} signal
 */
export async function retrieveJob(client, url, signal) {
  const originalUrl = url.trim(); recognizePosting(originalUrl);
  const { data, error } = await client.functions.invoke('job-ingest', { body: { url: originalUrl }, signal });
  if (error) {
    if ('context' in error && error.context instanceof Response) {
      try {
        const body = await error.context.json();
        if (typeof body.error?.message === 'string') throw new IngestionError(String(body.error.code), body.error.message, error.context.status);
      } catch (detail) { if (detail instanceof IngestionError) throw detail; }
    }
    throw new Error('Could not retrieve this posting. Check your connection and the job-ingest deployment, or enter details manually.');
  }
  return decodePreview(data, originalUrl);
}
