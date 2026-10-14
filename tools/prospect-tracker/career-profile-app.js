import { PROFILE_FIELDS, IMPORTANCE, emptyProfile, validateProfile, careerContextDraft } from './career-profile-model.js';
import { createCareerProfileData } from './career-profile-data.js';
import { getRadarClient } from './supabase-client.js';
// @ts-expect-error Browser asset revision; same module URL as the shared header.
import { setAccountBusy } from '../shared/navigation.mjs?v=20261013-tracker-route';
import { bindFieldValidation } from '../shared/fields.mjs';

const workspace = /** @type {HTMLElement} */ (document.getElementById('profile-workspace'));
const notice = /** @type {HTMLElement} */ (document.getElementById('profile-notice'));
/** @type {string|null} */ let owner = null;
let epoch = 0;
let dirty = false;
let busy = false;
let ready = false;
/** @type {import('./career-profile-data.js').ProfileRow|null} */ let saved = null;
/** @type {HTMLFormElement|null} */ let form = null;
/** @type {HTMLInputElement|null} */ let review = null;

/** @param {string} tag @param {string} [text] @param {string} [className] */
function element(tag, text = '', className = '') {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
/** @param {string} label @param {()=>void} action */
function button(label, action) {
  const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
  node.className = 'nc-button nc-button--secondary nc-button--lg'; node.addEventListener('click', action); return node;
}
/** @param {string} name @param {string} label @param {string} value @param {string[]|null} options */
function field(name, label, value, options = null) {
  const wrapper = element('div', '', 'nc-field');
  const caption = document.createElement('label'); caption.htmlFor = `profile-${name}`; caption.textContent = label; caption.className = 'nc-field__label';
  const control = options ? document.createElement('select') : document.createElement('textarea');
  control.id = caption.htmlFor; control.name = name; control.className = options ? 'nc-select' : 'nc-textarea';
  if (options) for (const option of options) {
    const node = document.createElement('option'); node.value = option;
    node.textContent = ({ hard: 'Hard constraint', strong: 'Strong preference', soft: 'Soft preference', explore: 'Open to surprise', review: 'Review missing compensation', exclude: 'Exclude missing compensation', year: 'Per year', hour: 'Per hour' })[option] || option;
    control.append(node);
  }
  else /** @type {HTMLTextAreaElement} */ (control).maxLength = 4000;
  control.value = value; wrapper.append(caption, control); return wrapper;
}
/** @param {string} name */
function value(name) { return String(new FormData(/** @type {HTMLFormElement} */ (form)).get(name) ?? ''); }
function readForm() {
  const draft = emptyProfile();
  for (const [id] of PROFILE_FIELDS) draft.factors[id] = { value: value(id).trim(), importance: /** @type {import('./career-profile-model.js').Importance} */ (value(`${id}-importance`)) };
  draft.compensation = { minimum: value('minimum') === '' ? null : Number(value('minimum')), currency: value('currency').trim().toUpperCase(), period: /** @type {'year'|'hour'} */ (value('period')), importance: /** @type {import('./career-profile-model.js').Importance} */ (value('compensation-importance')), unknown: /** @type {'review'|'exclude'} */ (value('unknown')) };
  return validateProfile(draft);
}
/** @param {boolean} next */
function setBusy(next) {
  busy = next; setAccountBusy(next);
  if (form) for (const control of form.querySelectorAll('button, input, select, textarea')) /** @type {HTMLInputElement} */ (control).disabled = next;
}
function canLeave() { return !busy && (!dirty || window.confirm('Leave without saving your career profile edits?')); }
window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('nextchapter:before-sign-out', event => { if (!canLeave()) event.preventDefault(); });
document.getElementById('nextchapter-header')?.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('a') && !canLeave()) event.preventDefault();
});

/** @param {import('./career-profile-model.js').Profile} profile @param {boolean} draft */
function render(profile, draft) {
  form = document.createElement('form'); form.id = 'career-profile-form';
  const heading = element('section', '', 'panel');
  heading.append(element('h2', 'Your career profile'), element('p', draft
    ? 'Suggested draft • Not yet approved. Review every field, remove assumptions and fill in what matters to you.'
    : `Reviewed profile • Revision ${saved?.revision}. Edit any setting and review before saving.`));
  heading.append(element('p', 'Your saved settings are the source of truth. Hard constraints are requirements; strong and soft preferences guide fit; open-to-surprise areas invite exploration. Blank means undecided.'));
  heading.append(element('p', 'The starting strengths and roles come from resume-master.md. They describe experience, not confirmed search preferences. Import your Consumer Design Watch draft to review its additional suggestions.', 'muted'));
  const fileLabel = element('label', 'Import draft (JSON)', 'nc-field__label');
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.json,application/json'; file.id = 'profile-import'; fileLabel.setAttribute('for', file.id);
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]; if (!selected) return;
    const currentEpoch = epoch;
    try {
      if (selected.size > 100000) throw new Error('Draft file must be under 100 KB.');
      const imported = validateProfile(JSON.parse(await selected.text()));
      if (currentEpoch !== epoch || busy) return;
      if (dirty && !window.confirm('Replace unsaved edits with this draft?')) return;
      dirty = true; render(imported, true); notice.textContent = 'Imported as an unapproved draft. Nothing has been saved.';
    } catch (error) { if (currentEpoch === epoch) notice.textContent = error instanceof Error ? error.message : 'Could not read draft.'; }
  });
  const tools = element('div', '', 'profile-tools'); tools.append(fileLabel, file, button('Export current draft', () => {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(readForm(), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'career-radar-private-profile.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { notice.textContent = error instanceof Error ? error.message : 'Could not export.'; }
  })); heading.append(tools); form.append(heading);
  for (const [title, ids] of [
    ['Experience & strengths', ['strengths']],
    ['Preferences', ['seniority', 'scope', 'focus', 'sectors', 'work_style']],
    ['Constraints', ['location', 'time_zones', 'employment', 'dealbreakers']],
    ['Open to surprise', ['exploration']]
  ]) {
    const section = element('section', '', 'panel'); section.append(element('h2', /** @type {string} */ (title)));
    for (const id of /** @type {string[]} */ (ids)) {
      const definition = PROFILE_FIELDS.find(row => row[0] === id); if (!definition) continue;
      const row = element('div', '', 'profile-factor');
      const entry = field(id, definition[1], profile.factors[id].value);
      const helper = element('p', definition[2], 'nc-field__helper'); helper.id = `profile-${id}-help`;
      entry.querySelector('textarea')?.setAttribute('aria-describedby', helper.id); entry.append(helper); row.append(entry);
      if (id !== 'strengths') row.append(field(`${id}-importance`, `Importance: ${definition[1]}`, profile.factors[id].importance, IMPORTANCE));
      else { const importance = document.createElement('input'); importance.type = 'hidden'; importance.name = `${id}-importance`; importance.value = profile.factors[id].importance; row.append(importance); }
      section.append(row);
    }
    if (title === 'Constraints') {
      section.append(element('h3', 'Compensation'), element('p', 'Minimum is base compensation in the selected currency and period. Blank means no threshold. Missing salary remains an unknown, never an estimate.', 'muted'));
      const compensation = element('div', '', 'profile-compensation');
      for (const [name, label, initial] of [['minimum', 'Minimum base compensation', profile.compensation.minimum === null ? '' : String(profile.compensation.minimum)], ['currency', 'Currency code', profile.compensation.currency]]) {
        const wrapper = field(name, label, initial); const old = wrapper.querySelector('textarea');
        const input = document.createElement('input'); input.id = `profile-${name}`; input.name = name; input.className = 'nc-input'; input.value = initial;
        if (name === 'minimum') { input.type = 'number'; input.min = '0'; input.max = '100000000'; input.step = '0.01'; }
        else { input.required = true; input.pattern = '[A-Za-z]{3}'; input.maxLength = 3; }
        old?.replaceWith(input); compensation.append(wrapper);
      }
      compensation.append(field('period', 'Pay period', profile.compensation.period, ['year', 'hour']), field('compensation-importance', 'Threshold importance', profile.compensation.importance, IMPORTANCE), field('unknown', 'When compensation is missing', profile.compensation.unknown, ['review', 'exclude'])); section.append(compensation);
    }
    form.append(section);
  }
  const signals = element('section', '', 'panel'); signals.append(element('h2', 'Inferred signals'), element('p', 'Signals are separate from your explicit settings. AI-assisted proposals will require your approval; conversational editing is planned for later.'));
  const list = document.createElement('pre'); list.textContent = saved && JSON.stringify(saved.inferred_signals) !== '[]' ? JSON.stringify(saved.inferred_signals, null, 2) : 'No inferred signals.'; signals.append(list); form.append(signals);
  const footer = element('section', '', 'panel profile-save'); review = document.createElement('input'); review.type = 'checkbox'; review.id = 'profile-reviewed'; review.required = true;
  const label = document.createElement('label'); label.htmlFor = review.id; label.append(review, document.createTextNode(' I have reviewed this profile, including suggested values and undecided constraints.'));
  const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Save reviewed profile'; submit.className = 'nc-button nc-button--primary nc-button--lg';
  footer.append(label, submit); form.append(footer);
  form.addEventListener('input', event => { if (event.target !== review) { dirty = true; if (review) review.checked = false; notice.textContent = 'Unsaved edits.'; } });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !ready || !owner || !review?.checked) return;
    const currentOwner = owner, currentEpoch = epoch;
    try {
      const profile = readForm(); setBusy(true); notice.textContent = 'Saving profile…';
      const result = await access.save(currentOwner, profile, saved);
      if (currentEpoch !== epoch) return;
      saved = result; dirty = false; render(profile, false); notice.textContent = `Saved reviewed profile, revision ${saved.revision}.`;
    } catch (error) { if (currentEpoch === epoch) notice.textContent = `Could not save. Your edits are still here. ${error instanceof Error ? error.message : 'Check your connection.'}`; }
    finally { setBusy(false); }
  });
  bindFieldValidation(form); workspace.replaceChildren(form);
}

/** @type {ReturnType<typeof createCareerProfileData>} */ let access;
try {
  const client = await getRadarClient(); access = createCareerProfileData(client);
  /** @param {string|null} id */
  async function changeOwner(id) {
    if (id === owner && ready) return;
    owner = id; const currentEpoch = ++epoch; ready = false; dirty = false; saved = null; form = null; review = null; notice.textContent = '';
    if (!id) {
      workspace.replaceChildren(element('p', 'Sign in using Log In in the header to review and save your private career profile.')); return;
    }
    workspace.replaceChildren(element('p', 'Loading career profile…'));
    try {
      const row = await access.load(id); if (currentEpoch !== epoch) return; saved = row;
      let draft = emptyProfile();
      if (row) draft = validateProfile(row.explicit_profile);
      else {
        try {
          const response = await fetch(new URL('../../resume-master.md', import.meta.url));
          if (!response.ok) throw new Error('Career context unavailable');
          draft = careerContextDraft(await response.text());
        } catch { notice.textContent = 'Career context could not load. Start with blank fields or import your draft.'; }
      }
      if (currentEpoch !== epoch) return; ready = true; render(draft, !row);
    } catch {
      if (currentEpoch !== epoch) return;
      workspace.replaceChildren(element('p', 'Career profile could not load. Check your connection. If this is a new setup, apply the career profiles migration first.'), button('Retry', () => { void changeOwner(id); }));
    }
  }
  client.auth.onAuthStateChange((_event, session) => { window.setTimeout(() => { void changeOwner(session?.user.id || null); }, 0); });
  const { data, error } = await client.auth.getSession(); if (error) throw error;
  await changeOwner(data.session?.user.id || null);
} catch {
  workspace.replaceChildren(element('p', 'Career Radar could not connect. Check your connection or generate Prospect Tracker’s public Supabase configuration, then reload.'), button('Reload', () => window.location.reload()));
}
