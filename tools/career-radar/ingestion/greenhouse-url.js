import { IngestionError } from './errors.js';
export { IngestionError } from './errors.js';

/** Recognize identities, never fetch the pasted URL. All other hosts fail closed.
 * @param {string} input
 */
export function recognizeGreenhouse(input) {
  let url;
  try { url = new URL(input); } catch { throw new IngestionError('invalid_url', 'Enter a complete HTTPS job URL.'); }
  if (input.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new IngestionError('invalid_url', 'Use an HTTPS posting URL without credentials or a custom port.');
  }
  if (!['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname)) {
    throw new IngestionError('unsupported_url', 'URL import currently supports Greenhouse hosted job links only. You can still add this prospect manually.');
  }
  const hosted = /^\/([A-Za-z0-9_-]{1,100})\/jobs\/([1-9]\d{0,15})\/?$/.exec(url.pathname);
  const embedded = url.pathname === '/embed/job_app';
  const board = hosted?.[1] ?? (embedded ? url.searchParams.get('for') : null);
  const postingId = hosted?.[2] ?? (embedded ? url.searchParams.get('token') : null);
  if (!board || !postingId || !/^[A-Za-z0-9_-]{1,100}$/.test(board) || !/^[1-9]\d{0,15}$/.test(postingId)) {
    throw new IngestionError('unsupported_url', 'Use a Greenhouse job detail URL, not a board or application redirect.');
  }
  return {
    provider: /** @type {const} */ ('greenhouse'), board, posting_id: postingId,
    canonical_url: `https://job-boards.greenhouse.io/${board}/jobs/${postingId}`,
    retrieval_url: `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${postingId}?pay_transparency=true`
  };
}
