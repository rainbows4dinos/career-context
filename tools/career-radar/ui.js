import { gravityIcon } from '../shared/icons.mjs';
import { bindFieldValidation } from '../shared/fields.mjs';
import { setAlert } from '../shared/status.mjs';
import { APPLIED_CARD_LIMIT, formatAppliedDate, groupCards, statusLabel, visibleCards } from './view-model.js';
import { SELECTABLE_STATUSES, WORK_ARRANGEMENTS, validateHttpUrl } from './model.js';
import { createHandoff, HANDOFF_TTL } from '../shared/resume-handoff.mjs';
import { STATUS_BADGE_TONES } from './prospect-status.js';
import { mountBoardDrag } from './kanban.js';

/** @param {HTMLElement} element @param {import('./model.js').ProspectStatus} status */
export function setProspectStatusBadge(element, status) {
  element.className = `nc-status-badge nc-status-badge--${STATUS_BADGE_TONES[status]}`;
  element.textContent = statusLabel(status);
}
/** @param {import('./model.js').ProspectStatus} status */
function statusBadge(status) {
  const badge = el('span'); setProspectStatusBadge(badge, status); return badge;
}

/** @template {keyof HTMLElementTagNameMap} T @param {T} tag @param {string} [text] @param {string} [className] */
export function el(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
/** @param {string} text @param {() => void} action @param {string} [className] */
export function button(text, action, className = 'secondary') {
  const node = el('button', text, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
/** @param {string} text @param {string} href */
function link(text, href) { const node = el('a', text); node.href = href; return node; }
/** @param {HTMLElement} root @param {string} message @param {(() => void)} [retry] */
export function messageView(root, message, retry) {
  const panel = el('section', '', 'panel');
  const feedback = el('div');
  if (message.startsWith('Loading')) {
    feedback.setAttribute('role', 'status');
    const spinner = el('span', '', 'nc-spinner'); spinner.setAttribute('aria-hidden', 'true');
    feedback.append(spinner, el('span', message)); feedback.className = 'loading-message';
  } else setAlert(feedback, { message, variant: retry ? 'danger' : 'info' });
  panel.append(feedback);
  if (retry) panel.append(button('Try again', retry, 'secondary nc-button nc-button--tertiary nc-button--lg'));
  root.replaceChildren(panel);
}
/** @param {HTMLElement} root @param {import('./data.js').ProspectCard[]} cards @param {() => void} refresh
 * @param {Partial<import('./kanban.js').MoveOptions> & {appliedExpanded?:boolean, doneOpen?:boolean}} [options] */
export function boardView(root, cards, refresh, options = {}) {
  const heading = el('div', '', 'view-heading');
  heading.append(el('h2', `Prospects (${cards.length})`), button('Refresh', refresh, 'secondary nc-button nc-button--tertiary nc-button--lg'));
  const hint = el('p', cards.length ? 'Open a card to edit it. Drag cards between columns on desktop to change status. Expand Done to see completed prospects.' : 'No prospects yet. Add a company and role you want to keep track of.', 'muted');
  const board = el('div', '', 'board');
  board.tabIndex = 0;
  board.setAttribute('role', 'region'); board.setAttribute('aria-label', 'Prospects by lifecycle');
  for (const group of groupCards(cards)) {
    const done = group.id === 'done';
    const column = done ? el('details', '', 'column column-done') : el('section', '', 'column');
    column.dataset.columnId = group.id;
    if (column instanceof window.HTMLDetailsElement) column.open = options.doneOpen ?? false;
    const title = el('h3', `${group.label} `);
    title.append(el('span', String(group.cards.length), 'count'));
    if (done) {
      const summary = el('summary'); summary.append(title); column.append(summary);
    } else {
      column.append(title);
    }
    if (!group.cards.length) column.append(el('p', 'No prospects', 'empty-column'));
    const list = el('div'); list.id = `${group.id}-cards`;
    let expanded = options.appliedExpanded ?? false;
    function renderCards() {
      list.replaceChildren(...visibleCards(group, expanded).map(card => {
        const node = link('', `#/prospects/${card.id}`); node.className = 'prospect-card';
        node.dataset.prospectId = card.id;
        node.append(el('strong', card.company), el('span', card.title));
        node.append(statusBadge(card.status));
        const appliedDate = formatAppliedDate(card.applied_on);
        if (appliedDate) {
          const time = el('time', `Applied ${appliedDate}`); time.dateTime = card.applied_on ?? '';
          node.append(time);
        }
        return node;
      }));
    }
    renderCards(); column.append(list);
    if (group.id === 'applied' && group.cards.length > APPLIED_CARD_LIMIT) {
      const toggle = button(expanded ? 'Show fewer' : `Show all ${group.cards.length}`, () => {
        expanded = !expanded;
        renderCards();
        toggle.textContent = expanded ? 'Show fewer' : `Show all ${group.cards.length}`;
        toggle.setAttribute('aria-expanded', String(expanded));
      }, 'secondary column-toggle');
      toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-controls', list.id);
      column.append(toggle);
    }
    board.append(column);
  }
  root.replaceChildren(heading, hint);
  if (!cards.length) root.append(link('Add your first prospect', '#/prospects/new'));
  root.append(board);
  return options.move ? mountBoardDrag(board, cards, { move: options.move, canMove: options.canMove ?? (() => true) }) : () => {};
}
/** @param {string} name @param {string} label @param {string} value @param {string} [type] */
function field(name, label, value, type = 'text') {
  const wrapper = el('div', '', 'nc-field');
  const caption = el('label', label.replace(/ \*$/, ''), 'nc-field__label');
  if (label.endsWith(' *')) { const required = el('span', '*', 'nc-field__required'); required.setAttribute('aria-hidden', 'true'); caption.append(required); }
  wrapper.append(caption);
  const input = type === 'textarea' ? el('textarea') : el('input');
  if (input instanceof HTMLInputElement) input.type = type;
  input.name = name; input.value = value; input.id = `${name}-field`; caption.htmlFor = input.id;
  input.className = type === 'textarea' ? 'nc-textarea' : 'nc-input';
  input.required = name === 'company' || name === 'title';
  wrapper.append(input);
  return wrapper;
}
/** @param {string} name @param {string} label @param {readonly string[]} options @param {string} value @param {boolean} [unknown] */
function selectField(name, label, options, value, unknown = false) {
  const wrapper = el('div', '', 'nc-field'); const select = el('select', '', 'nc-select'); select.name = name;
  select.id = `${name}-field`; const caption = el('label', label, 'nc-field__label'); caption.htmlFor = select.id;
  wrapper.append(caption);
  const closed = el('span', '', 'nc-select-wrap'); closed.append(select, gravityIcon('chevron-down')); wrapper.append(closed);
  if (unknown) { const option = el('option', 'Not specified'); option.value = ''; select.append(option); }
  if (name === 'status' && value === 'applying') {
    const current = el('option', 'Applying (retired)'); current.value = value; current.disabled = true; select.append(current);
  }
  for (const item of options) { const option = el('option', statusLabel(item)); option.value = item; select.append(option); }
  select.value = value; return wrapper;
}
/** @param {HTMLElement} root @param {import('./model.js').Prospect|null} row */
export function editorView(root, row) {
  const editor = el('div', '', row ? 'editor editor--detail' : 'editor');
  const back = link('← Back to board', '#/board'); back.className = 'editor__back';
  const heading = el(row ? 'h1' : 'h2', row ? row.company : 'Add prospect', 'editor__heading');
  editor.append(back, heading);
  const panels = el('div', '', 'editor__panels'); editor.append(panels);
  const form = el('form', '', 'panel'); form.id = 'prospect-form';
  const fields = el('fieldset');
  const grid = el('div', '', 'field-grid');
  grid.append(field('company', 'Company *', row?.company ?? ''), field('title', 'Role / title *', row?.title ?? ''));
  const jobUrl = field('job_url', 'Job URL', row?.job_url ?? '', 'url');
  const urlInput = /** @type {HTMLInputElement} */ (jobUrl.querySelector('input'));
  const urlControl = el('div', '', 'job-url-control');
  const open = link('Open', ''); open.className = 'job-url-control__open'; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.setAttribute('aria-label', 'Open job posting');
  const updateOpen = () => {
    const value = urlInput.value.trim();
    try { if (!value) throw new Error('Empty URL'); validateHttpUrl(value); open.href = value; open.hidden = false; }
    catch { open.hidden = true; open.removeAttribute('href'); }
    urlControl.classList.toggle('job-url-control--linked', !open.hidden);
  };
  urlControl.append(urlInput, open); jobUrl.append(urlControl);
  urlInput.addEventListener('input', updateOpen); urlInput.addEventListener('change', updateOpen); updateOpen();
  fields.append(grid, jobUrl, field('job_description', 'Job description', row?.job_description ?? '', 'textarea'));
  const details = el('details'); details.append(el('summary', 'More job details'));
  const extra = el('div', '', 'field-grid');
  for (const [name, label] of /** @type {const} */ ([['source','Source'], ['location','Location'], ['employment_type','Employment type'], ['compensation_text','Compensation range / type']])) {
    extra.append(field(name, label, row?.[name] ?? '', name === 'compensation_text' ? 'textarea' : 'text'));
  }
  const source = extra.querySelector('input[name="source"]');
  if (source) {
    source.setAttribute('list', 'source-options');
    const options = el('datalist'); options.id = 'source-options';
    for (const value of ['ChatGPT', 'LinkedIn', 'Welcome to the Jungle', 'Referral', 'Company site', 'Other']) {
      const option = el('option'); option.value = value; options.append(option);
    }
    extra.append(options);
    const helper = el('small', 'Optional discovery channel; any text is allowed.', 'nc-field__helper');
    helper.id = 'source-field-helper'; source.setAttribute('aria-describedby', helper.id); source.closest('.nc-field')?.append(helper);
  }
  extra.append(selectField('work_arrangement', 'Work arrangement', WORK_ARRANGEMENTS, row?.work_arrangement ?? '', true));
  for (const [name, label] of /** @type {const} */ ([['posted_on','Posted date'], ['discovered_on','Discovered date'], ['applied_on','Applied date']])) extra.append(field(name, label, row?.[name] ?? '', 'date'));
  details.append(extra, field('notes', 'Notes', row?.notes ?? '', 'textarea'));
  fields.append(details);
  const feedback = el('p', '', 'feedback nc-alert'); feedback.id = 'save-feedback'; feedback.setAttribute('role','status');
  const save = el('button', row ? 'Save details' : 'Add prospect', 'primary nc-button nc-button--primary nc-button--lg'); save.type = 'submit';
  fields.append(feedback, save);
  if (row) {
    const feedback = el('p', '', 'feedback nc-alert'); feedback.setAttribute('role', 'status');
    const send = button('Send to Résumé Builder', () => {
      let key = '';
      let tab;
      try {
        const destination = new URL('../resume-tailor.html', window.location.href);
        const handoff = createHandoff(window.localStorage, destination, {
          company: row.company, title: row.title, description: row.job_description ?? ''
        });
        key = handoff.key;
        // Open synchronously from the click, then detach the opener before navigation.
        tab = window.open('about:blank', '_blank');
        if (!tab) throw new Error('Allow pop-ups for this site, then try again.');
        tab.opener = null;
        tab.location.replace(handoff.url.href);
        feedback.classList.remove('error');
        setAlert(feedback, { message: 'Opened Résumé Builder with this prospect’s saved job details.', variant: 'success' });
        setTimeout(() => { try { window.localStorage.removeItem(key); } catch { /* read enforces expiry */ } }, HANDOFF_TTL);
      } catch (error) {
        tab?.close();
        if (key) { try { window.localStorage.removeItem(key); } catch { /* expires on read */ } }
        feedback.classList.add('error');
        const message = error instanceof Error && error.message.startsWith('Allow pop-ups')
          ? error.message : 'Could not send job details. Browser storage may be unavailable or full. Your prospect is unchanged; try again or copy the fields manually.';
        setAlert(feedback, { message, variant: 'danger' });
      }
    }, 'secondary nc-button nc-button--tertiary nc-button--lg');
    const actions = el('div', '', 'actions'); actions.append(save, send);
    fields.append(actions, feedback);
  }
  form.append(fields); bindFieldValidation(form); panels.append(form);
  if (row) {
    const section = el('section', '', 'panel editor__status'); section.append(el('h2', 'Status'));
    const currentBadge = statusBadge(row.status); currentBadge.id = 'current-status-badge'; section.append(currentBadge);
    const statusForm = el('form', '', 'status-controls'); statusForm.id = 'status-form';
    const statusFields = el('fieldset', '', 'status-controls');
    statusFields.append(selectField('status', 'Current status', SELECTABLE_STATUSES, row.status));
    statusForm.append(statusFields); section.append(statusForm);
    const statusFeedback = el('p', '', 'feedback nc-alert'); statusFeedback.id = 'status-feedback'; statusFeedback.setAttribute('role','status'); section.append(statusFeedback);
    section.append(el('p', 'Status saves automatically when selected. Applied date is editable under More job details.', 'muted'));
    const history = el('section'); history.id = 'history'; history.setAttribute('aria-live','polite'); section.append(history); panels.append(section);
  }
  root.replaceChildren(editor);
  return form;
}
/** @param {HTMLElement} root @param {import('./model.js').StatusEvent[]} events */
export function historyView(root, events) {
  const list = el('ol', '', 'history');
  for (const event of events) {
    const item = el('li');
    if (event.from_status) item.append(statusBadge(/** @type {import('./model.js').ProspectStatus} */ (event.from_status)), document.createTextNode(' → '));
    else item.append(document.createTextNode('Added as '));
    item.append(statusBadge(/** @type {import('./model.js').ProspectStatus} */ (event.to_status)));
    const time = el('time', new Date(event.recorded_at).toLocaleString()); time.dateTime = event.recorded_at; item.append(time); list.append(item);
  }
  root.replaceChildren(el('h3', 'Status history'), events.length ? list : el('p', 'No status events recorded yet.', 'muted'));
}
