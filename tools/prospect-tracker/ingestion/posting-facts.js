import { Parser } from 'htmlparser2';
import { decodeHTML } from 'entities';
import { normalizePatch } from '../model.js';

/** Inert parsing only: no script execution, resources or remote contexts.
 * Greenhouse descriptions may have up to two additional HTML-entity layers.
 * @param {string} html
 */
export function descriptionText(html) {
  let decoded = html;
  for (let i = 0; i < 2 && !/<[A-Za-z!/][^>]*>/.test(decoded) && /&(?:amp;)?(?:lt|#0*60|#x0*3c);/i.test(decoded); i++) decoded = decodeHTML(decoded);
  const blocks = new Set(['p', 'div', 'section', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'tr']);
  const forbidden = new Set(['script', 'style', 'iframe', 'object', 'svg', 'template']);
  let ignored = 0;
  let text = '';
  const parser = new Parser({
    onopentag(name) {
      if (forbidden.has(name)) ignored++;
      if (!ignored && blocks.has(name)) text += name === 'li' ? '\n• ' : '\n';
    },
    ontext(value) { if (!ignored) text += value; },
    onclosetag(name) {
      if (forbidden.has(name)) ignored = Math.max(0, ignored - 1);
      if (!ignored && blocks.has(name)) text += '\n';
    }
  }, { decodeEntities: true });
  parser.end(decoded);
  return text.replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** @param {unknown} value */
export function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? /** @type {Record<string,unknown>} */ (value) : {}; }
/** @param {unknown} value */
export function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
/** Plain fields stay plain; angle brackets are not interpreted as HTML.
 * @param {unknown} value
 */
export function plainText(value) { return text(value)?.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim() || null; }
/** Prefer meaningful HTML, then explicitly plain fields. @param {unknown} html @param {unknown} plain */
export function postingText(html, plain) { return (text(html) ? descriptionText(String(html)) : null) || plainText(plain); }

/** Common preview envelope; no persistence or inferred facts.
 * @param {import('../model.js').DetailsPatch} draft
 * @param {import('./preview.js').PostingIdentity} identity
 * @param {string} originalUrl @param {Date} now
 * @param {Record<string,string>} fieldSources @param {string[]} warnings
 * @param {import('./preview.js').IngestionPreview['method']} method
 * @returns {import('./preview.js').IngestionPreview}
 */
export function finishPreview(draft, identity, originalUrl, now, fieldSources, warnings, method) {
  for (const [key, label] of [['company','Company'], ['title','Title'], ['compensation_text','Compensation'], ['location','Location'], ['work_arrangement','Work arrangement'], ['employment_type','Employment type'], ['posted_on','Posted date'], ['job_description','Job description']]) {
    if (!draft[/** @type {keyof typeof draft} */ (key)]) warnings.push(`${label} was not supplied unambiguously. ${key === 'company' || key === 'title' ? 'Required before saving.' : 'Leave blank or complete it manually.'}`);
  }
  return { draft: /** @type {import('../model.js').DetailsPatch} */ (normalizePatch(draft)), identity: { ...identity, requisition_id: null }, original_url: originalUrl, retrieved_at: now.toISOString(), method, field_sources: fieldSources, warnings };
}
