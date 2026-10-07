import { retrieveJob } from './ingestion-client.js';
import { duplicateCandidates } from './duplicate-match.js';
import { el, button } from './ui.js';
import { errorMessage, statusLabel } from './view-model.js';
import { PROVIDER_NAMES } from './ingestion/posting-url.js';

/** UI adapter only: editable preview and explicit duplicate decisions.
 * @param {HTMLFormElement} form
 * @param {{client: import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>, data: ReturnType<typeof import('./data.js').createRadarDataAccess>, createId: string, current: () => boolean, busy: (value: boolean) => void, markDirty: () => void, canReplace: () => boolean, cancel: () => void}} options
 */
export function mountIngestion(form, options) {
  const panel = el('section', '', 'panel ingestion');
  panel.append(el('h3', 'Import a job posting'), el('p', 'Paste a hosted Greenhouse, Ashby, Lever or supported Workday job link, then review before saving. Other sites can be entered manually.', 'muted'));
  const retrieveForm = el('form');
  const fields = el('fieldset');
  const label = el('label', 'Job posting URL'); const input = el('input'); input.type = 'url'; input.required = true; input.maxLength = 2048; label.append(input);
  const retrieve = el('button', 'Retrieve posting', 'primary'); retrieve.type = 'submit';
  fields.append(label, retrieve); retrieveForm.append(fields);
  const cancel = button('Cancel', () => { controller?.abort(); options.cancel(); }, 'secondary ingestion-cancel');
  const feedback = el('div'); feedback.setAttribute('role', 'status');
  const duplicates = el('div'); duplicates.setAttribute('aria-live', 'polite');
  panel.append(retrieveForm, feedback, duplicates, cancel);
  form.before(panel);
  /** @type {AbortController|null} */
  let controller = null;
  let hasPreview = false;
  let approved = '';
  form.addEventListener('input', event => {
    const hint = event.target instanceof Element ? event.target.closest('label')?.querySelector('.field-origin') : null;
    if (hint) hint.textContent = 'Edited by you';
  });
  /** @param {import('./model.js').DetailsPatch} patch @param {ReturnType<typeof duplicateCandidates>} candidates */
  function signature(patch, candidates) {
    return JSON.stringify([patch.company, patch.title, patch.job_url, patch.location, candidates.map(item => item.prospect.id).sort()]);
  }
  /** @param {ReturnType<typeof duplicateCandidates>} candidates @param {import('./model.js').DetailsPatch} patch */
  function showDuplicates(candidates, patch) {
    duplicates.replaceChildren();
    if (!candidates.length) { duplicates.append(el('p', 'No likely duplicate found.', 'muted')); return; }
    duplicates.append(el('h3', 'Review likely duplicates'), el('p', 'No records will be merged. Open an existing prospect or explicitly save a separate one.'));
    const list = el('ul');
    for (const { prospect, reason } of candidates) {
      const item = el('li', `${prospect.company} — ${prospect.title} · ${statusLabel(prospect.status)}${prospect.applied_on ? ' · Applied ' + prospect.applied_on : ''}\n${reason}`);
      const link = el('a', 'Open existing'); link.href = `#/prospects/${prospect.id}`;
      item.append(el('br'), link); list.append(item);
    }
    duplicates.append(list, button('Save separately', () => {
      approved = signature(patch, candidates); form.requestSubmit();
    }, 'primary'));
  }
  retrieveForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (controller || !options.canReplace()) return;
    controller = new AbortController();
    cancel.setAttribute('data-retrieving', '');
    const active = controller;
    const timer = setTimeout(() => active.abort(), 20000);
    options.busy(true); feedback.replaceChildren(el('p', 'Retrieving posting…', 'feedback')); duplicates.replaceChildren(); approved = '';
    try {
      const preview = await retrieveJob(options.client, input.value, active.signal);
      if (!options.current() || active.signal.aborted) return;
      for (const name of ['company','title','job_url','location','work_arrangement','employment_type','compensation_text','job_description','posted_on','discovered_on']) {
        const control = /** @type {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|null} */ (form.elements.namedItem(name));
        if (!control) continue;
        control.value = String(preview.draft[/** @type {keyof typeof preview.draft} */ (name)] ?? '');
        control.closest('label')?.querySelector('.field-origin')?.remove();
        control.closest('label')?.append(el('small', preview.field_sources[name] ? (name === 'discovered_on' ? 'First captured in Radar (UTC); editable' : `Extracted from ${PROVIDER_NAMES[preview.identity.provider]}`) : 'Not supplied; complete if known', 'field-origin'));
      }
      const details = form.querySelector('details'); if (details) details.open = true;
      const save = form.querySelector('button[type="submit"]'); if (save) save.textContent = 'Save prospect';
      hasPreview = true; options.markDirty();
      const warnings = el('ul', '', 'muted'); for (const warning of preview.warnings) warnings.append(el('li', warning));
      feedback.replaceChildren(el('h3', 'Preview — review before saving'), el('p', `${PROVIDER_NAMES[preview.identity.provider]} · ${preview.identity.board}${'region' in preview.identity && preview.identity.region ? ' · ' + preview.identity.region.toUpperCase() : ''} · Posting ${preview.identity.posting_id}${preview.identity.requisition_id ? ' · Requisition ' + preview.identity.requisition_id : ''}`, 'muted'), warnings);
      const candidates = duplicateCandidates(preview.draft, await options.data.listProspectIdentities(), options.createId);
      if (options.current() && !active.signal.aborted) showDuplicates(candidates, preview.draft);
    } catch (error) {
      if (options.current() && !active.signal.aborted) feedback.replaceChildren(el('p', `${errorMessage(error)} Nothing was saved. Your current draft is still here; manual entry remains available.`, 'feedback error'));
      else if (options.current()) feedback.replaceChildren(el('p', 'Retrieval canceled or timed out. Nothing was saved. Try again or add the details manually.', 'feedback error'));
    } finally {
      clearTimeout(timer); controller = null; cancel.removeAttribute('data-retrieving');
      if (options.current()) options.busy(false);
    }
  });
  return {
    /** Fresh check before each save. Changed facts or new matches invalidate consent.
     * @param {import('./model.js').DetailsPatch} patch
     */
    async check(patch) {
      if (!hasPreview) return true;
      const candidates = duplicateCandidates(patch, await options.data.listProspectIdentities(), options.createId);
      if (!options.current()) return false;
      if (!candidates.length || approved === signature(patch, candidates)) return true;
      showDuplicates(candidates, patch); duplicates.scrollIntoView({ block: 'nearest' });
      return false;
    }
  };
}
