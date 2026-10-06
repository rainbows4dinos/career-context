import { groupCards, statusLabel } from './view-model.js';
import { STATUSES, WORK_ARRANGEMENTS, validateHttpUrl } from './model.js';

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
  panel.append(el('p', message));
  if (retry) panel.append(button('Try again', retry));
  root.replaceChildren(panel);
}
/** @param {HTMLElement} root @param {import('./data.js').ProspectCard[]} cards @param {() => void} refresh */
export function boardView(root, cards, refresh) {
  const heading = el('div', '', 'view-heading');
  heading.append(el('h2', `Prospects (${cards.length})`), button('Refresh', refresh));
  const hint = el('p', cards.length ? 'Open a card to edit it or change its status. Expand Done to see completed prospects.' : 'No prospects yet. Add a company and role you want to keep track of.', 'muted');
  const board = el('div', '', 'board');
  board.tabIndex = 0;
  board.setAttribute('role', 'region'); board.setAttribute('aria-label', 'Prospects by lifecycle');
  for (const group of groupCards(cards)) {
    const done = group.id === 'done';
    const column = done ? el('details', '', 'column column-done') : el('section', '', 'column');
    const title = el('h3', `${group.label} `);
    title.append(el('span', String(group.cards.length), 'count'));
    if (done) {
      const summary = el('summary'); summary.append(title); column.append(summary);
    } else {
      column.append(title);
    }
    if (!group.cards.length) column.append(el('p', 'No prospects', 'empty-column'));
    for (const card of group.cards) {
      const node = link('', `#/prospects/${card.id}`); node.className = 'prospect-card';
      node.append(el('strong', card.company), el('span', card.title));
      if (group.statuses.length > 1) node.append(el('span', statusLabel(card.status), 'card-status'));
      node.append(el('small', [card.location, card.work_arrangement && statusLabel(card.work_arrangement)].filter(Boolean).join(' · ') || 'Location not specified'));
      column.append(node);
    }
    board.append(column);
  }
  root.replaceChildren(heading, hint);
  if (!cards.length) root.append(link('Add your first prospect', '#/prospects/new'));
  root.append(board);
}
/** @param {string} name @param {string} label @param {string} value @param {string} [type] */
function field(name, label, value, type = 'text') {
  const wrapper = el('label', label);
  const input = type === 'textarea' ? el('textarea') : el('input');
  if (input instanceof HTMLInputElement) input.type = type;
  input.name = name; input.value = value;
  input.required = name === 'company' || name === 'title';
  wrapper.append(input);
  return wrapper;
}
/** @param {string} name @param {string} label @param {readonly string[]} options @param {string} value @param {boolean} [unknown] */
function selectField(name, label, options, value, unknown = false) {
  const wrapper = el('label', label); const select = el('select'); select.name = name;
  if (unknown) { const option = el('option', 'Not specified'); option.value = ''; select.append(option); }
  for (const item of options) { const option = el('option', statusLabel(item)); option.value = item; select.append(option); }
  select.value = value; wrapper.append(select); return wrapper;
}
/** @param {HTMLElement} root @param {import('./model.js').Prospect|null} row */
export function editorView(root, row) {
  const editor = el('div', '', 'editor');
  editor.append(link('← Back to board', '#/board'), el('h2', row ? row.company : 'Add prospect'));
  if (row?.job_url) {
    try { validateHttpUrl(row.job_url); const jobLink = link('Open job posting ↗', row.job_url); jobLink.target = '_blank'; jobLink.rel = 'noopener noreferrer'; editor.append(jobLink); } catch { /* unsafe stored link stays editable as text */ }
  }
  const form = el('form', '', 'panel'); form.id = 'prospect-form';
  const fields = el('fieldset');
  const grid = el('div', '', 'field-grid');
  grid.append(field('company', 'Company *', row?.company ?? ''), field('title', 'Role / title *', row?.title ?? ''));
  fields.append(grid, field('job_url', 'Job URL', row?.job_url ?? '', 'url'), field('notes', 'Notes', row?.notes ?? '', 'textarea'));
  const details = el('details'); details.append(el('summary', 'More job details'));
  const extra = el('div', '', 'field-grid');
  for (const [name, label] of /** @type {const} */ ([['source','Source'], ['location','Location'], ['employment_type','Employment type'], ['compensation_text','Compensation range / type']])) {
    extra.append(field(name, label, row?.[name] ?? ''));
  }
  extra.append(selectField('work_arrangement', 'Work arrangement', WORK_ARRANGEMENTS, row?.work_arrangement ?? '', true));
  for (const [name, label] of /** @type {const} */ ([['posted_on','Posted date'], ['discovered_on','Discovered date'], ['applied_on','Applied date']])) extra.append(field(name, label, row?.[name] ?? '', 'date'));
  details.append(extra, field('job_description', 'Job description', row?.job_description ?? '', 'textarea'));
  fields.append(details);
  const feedback = el('p', '', 'feedback'); feedback.id = 'save-feedback'; feedback.setAttribute('role','status');
  const save = el('button', row ? 'Save details' : 'Add prospect', 'primary'); save.type = 'submit';
  fields.append(feedback, save); form.append(fields); editor.append(form);
  if (row) {
    const section = el('section', '', 'panel'); section.append(el('h3', 'Status'));
    const statusForm = el('form', '', 'status-controls'); statusForm.id = 'status-form';
    const statusFields = el('fieldset', '', 'status-controls');
    const change = el('button', 'Change status', 'primary'); change.type = 'submit';
    statusFields.append(selectField('status', 'Current status', STATUSES, row.status), change);
    statusForm.append(statusFields); section.append(statusForm);
    const statusFeedback = el('p', '', 'feedback'); statusFeedback.id = 'status-feedback'; statusFeedback.setAttribute('role','status'); section.append(statusFeedback);
    section.append(el('p', 'Status changes save separately. Applied date is editable under More job details.', 'muted'));
    const history = el('section'); history.id = 'history'; history.setAttribute('aria-live','polite'); section.append(history); editor.append(section);
  }
  root.replaceChildren(editor);
  return form;
}
/** @param {HTMLElement} root @param {import('./model.js').StatusEvent[]} events */
export function historyView(root, events) {
  const list = el('ol', '', 'history');
  for (const event of events) {
    const item = el('li', event.from_status ? `${statusLabel(event.from_status)} → ${statusLabel(event.to_status)}` : `Added as ${statusLabel(event.to_status)}`);
    const time = el('time', new Date(event.recorded_at).toLocaleString()); time.dateTime = event.recorded_at; item.append(time); list.append(item);
  }
  root.replaceChildren(el('h3', 'Status history'), events.length ? list : el('p', 'No status events recorded yet.', 'muted'));
}
