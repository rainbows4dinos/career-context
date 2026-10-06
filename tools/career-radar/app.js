import { createRadarDataAccess, StaleProspectError } from './data.js';
import { errorMessage, parseRoute, readDetails } from './view-model.js';
import { validateStatus } from './model.js';
import { boardView, button, editorView, historyView, messageView } from './ui.js';

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
  const logout = /** @type {HTMLButtonElement} */ (node('logout'));
  const addLink = node('add-link');
  let userId = '';
  let lastUserId = '';
  let dirty = false;
  let pending = false;
  let epoch = 0;
  let activeHash = '';
  let signingOut = false;
  let mounted = false;

  const clear = () => {
    epoch++; dirty = false; mounted = false; activeHash = '';
    workspace.replaceChildren();
  };
  /** @param {import('@supabase/supabase-js').Session|null} session */
  function acceptSession(session) {
    const nextId = session?.user.id ?? '';
    if (nextId && lastUserId && nextId !== lastUserId) clear();
    if (signingOut && !nextId) { clear(); lastUserId = ''; }
    userId = nextId;
    if (nextId) lastUserId = nextId;
    login.hidden = !!nextId; workspace.hidden = !nextId;
    logout.hidden = !nextId; addLink.hidden = !nextId;
    if (nextId && (!mounted || activeHash !== (window.location.hash || '#/board'))) void renderRoute();
  }
  /** @param {unknown} error @param {HTMLElement} feedback */
  function showError(error, feedback) {
    feedback.textContent = error instanceof StaleProspectError
      ? 'This prospect changed elsewhere. Your draft is still here. Reload the saved prospect before editing again.'
      : errorMessage(error);
    feedback.classList.add('error');
    if (error instanceof StaleProspectError) feedback.append(button('Reload saved prospect', () => {
      if (window.confirm('Discard this draft and load the saved prospect?')) { dirty = false; void renderRoute(); }
    }));
    if (error && typeof error === 'object' && ('status' in error && error.status === 401 || 'code' in error && ['PGRST301','PGRST303'].includes(String(error.code)))) {
      acceptSession(null);
      node('login-error').textContent = 'Your session expired. Sign in again to continue with your draft.';
    }
  }
  /** @param {boolean} value */
  function busy(value) {
    pending = value;
    for (const fields of workspace.querySelectorAll('fieldset')) fields.disabled = value;
    logout.disabled = value;
    workspace.setAttribute('aria-busy', String(value));
  }
  async function renderRoute() {
    if (!userId) return;
    const thisEpoch = ++epoch;
    const owner = userId;
    activeHash = window.location.hash || '#/board';
    const route = parseRoute(activeHash);
    dirty = false; mounted = true;
    messageView(workspace, route.kind === 'board' ? 'Loading prospects…' : 'Loading prospect…');
    const current = () => epoch === thisEpoch && lastUserId === owner;
    try {
      if (route.kind === 'board') {
        const cards = await data.listProspects();
        if (current()) boardView(workspace, cards, () => { void renderRoute(); });
      } else if (route.kind === 'new' || route.kind === 'detail') {
        let row = route.id ? await data.getProspect(route.id) : null;
        if (!current()) return;
        if (route.kind === 'detail' && !row) { messageView(workspace, 'Prospect unavailable. It may no longer be accessible to this account.'); return; }
        const createId = crypto.randomUUID();
        let attemptedCreate = false;
        let form = editorView(workspace, row);
        const bindDetails = () => {
          form.addEventListener('input', () => { dirty = true; });
          form.addEventListener('submit', async event => {
            event.preventDefault();
            if (pending || !userId) return;
            const feedback = node('save-feedback'); feedback.classList.remove('error');
            const values = new FormData(form);
            busy(true); feedback.textContent = row ? 'Saving details…' : 'Adding prospect…';
            try {
              const patch = readDetails(values);
              if (row) row = await data.updateProspect(row.id, patch, row.updated_at);
              else {
                // A retry first reconciles an uncertain insert using the retained ID.
                const previous = attemptedCreate ? await data.getProspect(createId) : null;
                attemptedCreate = true;
                row = previous ?? await data.createProspect({ ...patch, id: createId, company: patch.company ?? '', title: patch.title ?? '' });
              }
              if (!current()) return;
              dirty = false;
              if (route.kind === 'new') {
                node('notice').textContent = 'Prospect saved.';
                window.location.hash = `#/prospects/${row.id}`;
              } else {
                form = editorView(workspace, row); bindDetails(); bindStatus();
                node('save-feedback').textContent = 'Details saved.';
                void loadHistory();
              }
            } catch (error) { if (current()) showError(error, feedback); }
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
          statusForm.addEventListener('submit', async event => {
            event.preventDefault();
            if (!row || pending || !userId) return;
            const feedback = node('status-feedback'); feedback.classList.remove('error');
            const status = validateStatus(new FormData(statusForm).get('status'));
            if (status === row.status) { feedback.textContent = 'Already at this status.'; return; }
            busy(true); feedback.textContent = 'Saving status…';
            try {
              row = await data.changeStatus(row.id, status, row.updated_at);
              if (current()) { feedback.textContent = 'Status saved.'; void loadHistory(); }
            } catch (error) { if (current()) showError(error, feedback); }
            finally { busy(false); }
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
    submit.disabled = true; node('login-error').textContent = '';
    try {
      const { data: authData, error } = await client.auth.signInWithPassword({ email: String(values.get('email')).trim(), password: String(values.get('password')) });
      if (error) throw error;
      loginForm.reset(); acceptSession(authData.session);
    } catch (error) { node('login-error').textContent = errorMessage(error); }
    finally { submit.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    if (!canLeave()) return;
    signingOut = true; logout.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      clear(); lastUserId = ''; acceptSession(null); node('notice').textContent = 'Signed out.';
    } catch (error) { node('notice').textContent = `Could not sign out. ${errorMessage(error)}`; }
    finally { signingOut = false; logout.disabled = false; }
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
