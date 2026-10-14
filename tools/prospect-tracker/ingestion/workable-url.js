import { IngestionError } from './errors.js';

/** Account-qualified hosted links only; never resolve short links or redirects.
 * @param {string} input */
export function recognizeWorkable(input) {
  let url;
  try { url = new URL(input); } catch { throw new IngestionError('invalid_url', 'Enter a complete HTTPS job URL.'); }
  const controls = [...input].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127);
  if (input.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port || controls || input.includes('\\') || /\/(?:\.|%2e){1,2}(?=[/?#]|$)/i.test(input)) {
    throw new IngestionError('invalid_url', 'Use an HTTPS posting URL without credentials, custom ports or traversal.');
  }
  const match = /^\/([A-Za-z0-9][A-Za-z0-9_-]{0,99})\/j\/([A-Za-z0-9]{1,64})(?:\/apply)?\/?$/.exec(url.pathname);
  if (url.hostname !== 'apply.workable.com' || !match) {
    throw new IngestionError('unsupported_url', 'Use a Workable link containing the company account: https://apply.workable.com/company/j/POSTING/. For a short /j/ link, open it and copy the resolved address.');
  }
  const [, board, posting_id] = match;
  const canonical = new URL(`https://apply.workable.com/${board}/j/${posting_id}/`);
  for (const [key, value] of url.searchParams) if (!/^utm_/i.test(key)) canonical.searchParams.append(key, value);
  return { provider: /** @type {const} */ ('workable'), board, posting_id,
    canonical_url: canonical.href, retrieval_url: `https://apply.workable.com/api/v2/accounts/${board}/jobs/${posting_id}` };
}
