// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { setAccountBusy } from '../shared/navigation.mjs?v=20261013-transitions';
import { returnAfterLogin } from '../shared/navigation-return.mjs';
import { setAlert } from '../shared/status.mjs';
import { showToast } from '../shared/notifications.mjs';
import { bindFieldValidation, setFieldError } from '../shared/fields.mjs';
import { createRadarDataAccess, StaleProspectError } from './data.js';
import { errorMessage, parseRoute, readDetails } from './view-model.js';
import { validateStatus, validateHttpUrl } from './model.js';
import { createStatusSaver } from './status-save.js';
// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { boardView, button, editorView, historyView, messageView, setProspectStatusBadge } from './ui.js?v=20261013-toolbar-lg';
// @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
import { mountIngestion } from './ingestion-ui.js?v=20261013-statuses';

/** @param {import('@supabase/supabase-js').SupabaseClient<import('./database.types.js').Database>} client */
export async function startRadar(client) {
  const data = createRadarDataAccess(client);
  /** @template {HTMLElement} T @param {string} id @returns {T} */
  const node = id => {
    const result = document.getElementById(id);
    if (!result) throw new Error(`Missing element: ${id}`);
    return /** @type {T} */ (result);
  };
  const workspace = node('workspace');
  const login = node('login');
  const loginForm = /** @type {HTMLFormElement} */ (node('login-form'));
  bindFieldValidation(loginForm);
  let userId = '';
  let lastUserId = '';
  let dirty = false;
  let pending = false;
  let epoch = 0;
  let activeHash = '';
  let mounted = false;
  /** @type {(()=>void)|null} */
  let boardCleanup = null;
  /** @type {import('./ui.js').BoardState} */
  let boardState = { query: '', doneOpen: false, scrollLeft: 0, scrollTop: {} };

  const clear = () => {
    boardCleanup?.(); boardCleanup = null;
    epoch++; dirty = false; mounted = false; activeHash = '';
    workspace.replaceChildren();
    boardState = { query: '', doneOpen: false, scrollLeft: 0, scrollTop: {} };
  };
  /** @param {import('@supabase/supabase-js').Session|null} session */
  function acceptSession(session) {
    const nextId = session?.user.id ?? '';
    if (nextId && lastUserId && nextId !== lastUserId) clear();
    userId = nextId;
    if (nextId) lastUserId = nextId;
    login.hidden = !!nextId; workspace.hidden = !nextId;
    if (!nextId) node('tracker-heading').hidden = false;
    if (!nextId) { boardCleanup?.(); boardCleanup = null; }
    if (nextId) returnAfterLogin();
    if (nextId && (!mounted || activeHash !== (window.location.hash || '#/board') || !boardCleanup && !!workspace.querySelector('.board'))) void renderRoute();
  }
  /** @param {unknown} error @param {HTMLElement} feedback */
  function showError(error, feedback) {
    const message = error instanceof StaleProspectError
      ? 'This prospect changed elsewhere. Your draft is still here. Reload the saved prospect before editing again.'
      : errorMessage(error);
    setAlert(feedback, { message, variant: 'danger' });
    if (error instanceof StaleProspectError) feedback.querySelector('.nc-alert__message')?.append(button('Reload saved prospect', () => {
      if (window.confirm('Discard this draft and load the saved prospect?')) { dirty = false; void renderRoute(); }
    }));
    if (error && typeof error === 'object' && ('status' in error && error.status === 401 || 'code' in error && ['PGRST301','PGRST303'].includes(String(error.code)))) {
      acceptSession(null);
      setAlert(node('login-error'), { message: 'Your session expired. Sign in again to continue with your draft.', variant: 'danger' });
    }
  }
  /** @param {boolean} value */
  function busy(value) {
    pending = value;
    for (const fields of workspace.querySelectorAll('fieldset')) fields.disabled = value;
    for (const cancel of workspace.querySelectorAll('button.ingestion-cancel')) {
      /** @type {HTMLButtonElement} */ (cancel).disabled = value && !cancel.hasAttribute('data-retrieving');
    }
    setAccountBusy(value);
    workspace.setAttribute('aria-busy', String(value));
  }
  const saveProspectStatus = createStatusSaver(data, { canSave: () => !!userId && !pending, busy });
  async function renderRoute() {
    if (!userId) return;
    const thisEpoch = ++epoch;
    const owner = userId;
    activeHash = window.location.hash || '#/board';
    const route = parseRoute(activeHash);
    boardCleanup?.(); boardCleanup = null;
    node('tracker-heading').hidden = route.kind === 'detail';
    dirty = false; mounted = true;
    messageView(workspace, route.kind === 'board' ? 'Loading prospects…' : 'Loading prospect…');
    const current = () => epoch === thisEpoch && lastUserId === owner;
    try {
      if (route.kind === 'board') {
        let cards = await data.listProspects();
        const canMove = () => current() && !!userId && !pending;
        /** @type {ReturnType<typeof import('./ui.js').boardView>|undefined} */
        let boardViewController;
        const renderBoard = () => {
          if (!current()) return;
          if (boardViewController) boardViewController.update(cards);
          else {
            boardViewController = boardView(workspace, cards, () => { if (canMove()) void renderRoute(); }, { canMove, move, state: boardState });
            boardCleanup = () => boardViewController?.dispose();
          }
        };
        /** @param {import('./data.js').ProspectCard} card @param {import('./model.js').ProspectStatus} status */
        const move = async (card, status) => {
          if (!canMove() || status === card.status) return;
          const before = cards;
          const saving = saveProspectStatus(card, status);
          cards = cards.map(item => item.id === card.id ? { ...item, status } : item);
          renderBoard();
          try {
            const saved = await saving;
            if (current()) {
              cards = cards.map(item => item.id === saved.id ? { ...item, ...saved } : item);
              renderBoard(); boardViewController?.revealCard(saved.id); showToast({ message: 'Status saved.', variant: 'success' });
            }
          } catch (error) {
            if (!current()) return;
            cards = before; renderBoard();
            const message = error instanceof StaleProspectError
              ? 'This prospect changed elsewhere. The move was undone. Refresh the board before trying again.'
              : `Could not save status. The move was undone. ${errorMessage(error)}`;
            showToast({ message, variant: 'danger' });
            if (error && typeof error === 'object' && ('status' in error && error.status === 401 || 'code' in error && ['PGRST301','PGRST303'].includes(String(error.code)))) acceptSession(null);
          }
        };
        renderBoard();
      } else if (route.kind === 'new' || route.kind === 'detail') {
        let row = route.id ? await data.getProspect(route.id) : null;
        if (!current()) return;
        if (route.kind === 'detail' && !row) { messageView(workspace, 'Prospect unavailable. It may no longer be accessible to this account.'); return; }
        const createId = crypto.randomUUID();
        let attemptedCreate = false;
        /** @type {HTMLFormElement} */
        let form = editorView(workspace, row);
        const ingestion = route.kind === 'new' ? mountIngestion(form, {
          client, data, createId, current, busy,
          markDirty: () => { dirty = true; },
          canReplace: () => !pending && (!dirty || window.confirm('Replace the job facts in this draft with a retrieved posting? Source, notes and applied date will be kept.')),
          cancel: () => { busy(false); dirty = false; window.location.hash = '#/board'; }
        }) : null;
        const bindDetails = () => {
          form.addEventListener('input', () => { dirty = true; });
          form.addEventListener('submit', async event => {
            event.preventDefault();
            if (pending || !userId) return;
            const feedback = node('save-feedback'); feedback.classList.remove('error');
            const values = new FormData(form);
            busy(true); setAlert(feedback, { message: row ? 'Saving details…' : 'Adding prospect…' });
            try {
              const patch = readDetails(values);
              if (row) row = await data.updateProspect(row.id, patch, row.updated_at);
              else {
                // A retry first reconciles an uncertain insert using the retained ID.
                const previous = attemptedCreate ? await data.getProspect(createId) : null;
                if (!previous && ingestion && !await ingestion.check(patch)) {
                  setAlert(feedback, { message: 'Review the likely duplicates above before saving.', variant: 'warning' }); return;
                }
                attemptedCreate = true;
                row = previous ?? await data.createProspect({ ...patch, id: createId, company: patch.company ?? '', title: patch.title ?? '' });
              }
              if (!current()) return;
              dirty = false;
              if (route.kind === 'new') {
                showToast({ message: 'Prospect saved.', variant: 'success' });
                window.location.hash = `#/prospects/${row.id}`;
              } else {
                form = editorView(workspace, row); bindDetails(); bindStatus();
                showToast({ message: 'Details saved.', variant: 'success' });
                void loadHistory();
              }
            } catch (error) { if (current()) {
              for (const name of ['company', 'title']) {
                const control = form.elements.namedItem(name);
                if (control instanceof HTMLInputElement && !control.value.trim()) setFieldError(control, 'This field is required.');
              }
              const url = form.elements.namedItem('job_url');
              if (url instanceof HTMLInputElement) {
                const recheck = () => { try { if (url.value.trim()) validateHttpUrl(url.value.trim()); return ''; } catch (error) { return errorMessage(error); } };
                const message = recheck(); if (message) setFieldError(url, message, recheck);
              }
              showError(error, feedback);
            } }
            finally { busy(false); }
          });
        };
        const loadHistory = async () => {
          if (!row || !current()) return;
          const history = node('history'); messageView(history, 'Loading status history…');
          try {
            const events = await data.listStatusEvents(row.id);
            if (current() && history.isConnected) historyView(history, events);
          } catch (error) {
            if (current() && history.isConnected) messageView(history, `Could not load history. ${errorMessage(error)}`, () => { void loadHistory(); });
          }
        };
        const bindStatus = () => {
          if (!row) return;
          const statusForm = /** @type {HTMLFormElement} */ (node('status-form'));
          const statusSelect = /** @type {HTMLSelectElement} */ (statusForm.elements.namedItem('status'));
          statusSelect.addEventListener('change', () => statusForm.requestSubmit());
          statusForm.addEventListener('submit', async event => {
            event.preventDefault();
            if (!row || pending || !userId) return;
            const feedback = node('status-feedback'); feedback.classList.remove('error');
            const status = validateStatus(new FormData(statusForm).get('status'));
            if (status === row.status) { setAlert(feedback, { message: 'Already at this status.' }); return; }
            const restoreFocus = document.activeElement === statusSelect;
            setAlert(feedback, { message: 'Saving status…' });
            try {
              row = await saveProspectStatus(row, status);
              if (current()) { setProspectStatusBadge(node('current-status-badge'), row.status); setAlert(feedback, { message: '' }); showToast({ message: 'Status saved.', variant: 'success' }); void loadHistory(); }
            } catch (error) { if (current()) { statusSelect.value = row.status; showError(error, feedback); } }
            finally {
              if (current() && restoreFocus && statusSelect.isConnected && document.activeElement === document.body) statusSelect.focus();
            }
          });
        };
        bindDetails(); bindStatus();
        if (row) void loadHistory();
      } else messageView(workspace, 'Page not found. Use Board to return to your prospects.');
    } catch (error) {
      if (current()) messageView(workspace, `Could not load prospects. ${errorMessage(error)}`, () => { void renderRoute(); });
    }
    if (current()) workspace.focus();
  }
  const canLeave = () => !pending && (!dirty || window.confirm('Discard your unsaved changes?'));
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (link && !link.target && !event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      if (!canLeave()) event.preventDefault();
      else if (link.hash !== activeHash || link.pathname !== window.location.pathname) dirty = false;
    }
  });
  window.addEventListener('hashchange', () => {
    if (!userId) return;
    if (!canLeave()) { window.history.replaceState(null, '', activeHash); return; }
    node('notice').textContent = '';
    void renderRoute();
  });
  window.addEventListener('beforeunload', event => {
    if (dirty || pending) { event.preventDefault(); event.returnValue = ''; }
  });
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = new FormData(loginForm);
    const submit = loginForm.querySelector('button');
    if (!submit || submit.disabled) return;
    submit.disabled = true; setAlert(node('login-error'), { message: '' });
    try {
      const { data: authData, error } = await client.auth.signInWithPassword({ email: String(values.get('email')).trim(), password: String(values.get('password')) });
      if (error) throw error;
      loginForm.reset(); acceptSession(authData.session);
    } catch (error) { setAlert(node('login-error'), { message: errorMessage(error), variant: 'danger' }); }
    finally { submit.disabled = false; }
  });
  window.addEventListener('nextchapter:before-sign-out', event => {
    if (!canLeave()) event.preventDefault();
  });
  // Keep auth callbacks synchronous: defer reads until outside the SDK auth lock.
  client.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      if (event === 'SIGNED_OUT') { clear(); lastUserId = ''; }
      acceptSession(session);
    }, 0);
  });
  const { data: authData, error } = await client.auth.getSession();
  if (error) throw error;
  acceptSession(authData.session);
}
