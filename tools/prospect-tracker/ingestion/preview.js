/** @typedef {ReturnType<typeof import('./posting-url.js').recognizePosting>} PostingIdentity */
/** @typedef {{draft: import('../model.js').DetailsPatch, identity: PostingIdentity & {requisition_id: string|null}, original_url: string, retrieved_at: string, method: 'greenhouse-job-board-api'|'ashby-job-posting-api'|'lever-postings-api'|'workday-cxs-detail', field_sources: Record<string,string>, warnings: string[]}} IngestionPreview */
export {};
