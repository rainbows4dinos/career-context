import { gravityIcon } from './icons.mjs';
import { showToast } from './notifications.mjs';

// Static destinations resolve from this module, including a GitHub Pages prefix.
const destinations = [
  ['radar', 'Career Radar', '../career-radar.html'],
  ['tracker', 'Prospect Tracker', '../career-radar/'],
  ['builder', 'Résumé Builder', '../resume-tailor.html'],
  ['about', 'About', '../about.html']
];
let accountBusy = false;
let updateAccount = () => {};
/** Tracker uses its existing pending-save state to guard the global control.
 * @param {boolean} value */
export function setAccountBusy(value) { accountBusy = value; updateAccount(); }

const header = document.getElementById('nextchapter-header');
if (header) {
  header.classList.add('nextchapter-header');
  const content = document.createElement('div');
  content.className = 'nextchapter-header__content';
  const wordmark = document.createElement('a');
  wordmark.className = 'nextchapter-wordmark';
  wordmark.textContent = 'nextchapter';
  wordmark.href = new URL('../career-radar/', import.meta.url).href;
  const nav = document.createElement('nav');
  nav.id = 'nextchapter-navigation';
  nav.setAttribute('aria-label', 'Main navigation');
  const primary = document.createElement('div');
  primary.className = 'nextchapter-primary';
  const utilities = document.createElement('div');
  utilities.className = 'nextchapter-utilities';
  const accountLinks = document.createElement('div');
  accountLinks.id = 'nextchapter-account-links';
  accountLinks.className = 'nextchapter-account-links';
  for (const [app, label, path] of destinations) {
    const link = document.createElement('a');
    link.className = 'nextchapter-nav-item';
    link.textContent = label;
    link.href = new URL(path, import.meta.url).href;
    if (app === header.dataset.app) link.setAttribute('aria-current', 'page');
    (app === 'about' ? accountLinks : primary).append(link);
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'theme-toggle';
  const track = document.createElement('span');
  track.className = 'toggle-track';
  track.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('span');
  thumb.className = 'toggle-thumb';
  const sun = gravityIcon('sun', { size: 12 }); sun.classList.add('toggle-icon-sun');
  const moon = gravityIcon('moon', { size: 12 }); moon.classList.add('toggle-icon-moon');
  track.append(thumb, sun, moon); toggle.append(track);
  const updateToggle = () => {
    const light = document.body.classList.contains('light');
    toggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    toggle.setAttribute('aria-pressed', String(light));
  };
  // Preserve default dark, body.light and the existing storage key.
  try { document.body.classList.toggle('light', localStorage.getItem('theme') === 'light'); } catch { /* default when storage is blocked */ }
  toggle.addEventListener('click', () => {
    const light = document.body.classList.toggle('light');
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch { /* keep the in-memory theme */ }
    updateToggle();
  });
  window.addEventListener('storage', event => {
    if (event.key === 'theme' || event.key === null) {
      document.body.classList.toggle('light', event.newValue === 'light');
      updateToggle();
    }
  });
  updateToggle();

  const account = document.createElement('button');
  account.type = 'button';
  account.id = 'nextchapter-account';
  account.className = 'nextchapter-nav-item';
  accountLinks.append(account);
  utilities.append(toggle, accountLinks);
  nav.append(primary, utilities);
  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'nextchapter-menu-toggle';
  const small = window.matchMedia('(max-width: 899px)');
  const large = window.matchMedia('(min-width: 1200px)');
  let open = false;
  /** @param {boolean} value @param {boolean} [restoreFocus] */
  const setOpen = (value, restoreFocus = false) => {
    open = value && !large.matches;
    header.classList.toggle('nextchapter-header--open', open);
    // Closed surfaces stop accepting focus while their exit transition runs.
    nav.inert = small.matches && !open;
    accountLinks.inert = !small.matches && !large.matches && !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-controls', small.matches ? nav.id : accountLinks.id);
    menu.setAttribute('aria-label', `${open ? 'Close' : 'Open'} ${small.matches ? 'main navigation' : 'account and About links'}`);
    menu.replaceChildren(gravityIcon(small.matches ? open ? 'xmark' : 'bars' : 'ellipsis-vertical', { size: 12 }));
    if (restoreFocus) menu.focus();
  };
  menu.addEventListener('click', () => {
    const opening = !open;
    setOpen(opening, !opening);
    if (opening && !small.matches) accountLinks.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
  });
  // Defer closing until Tracker's existing unsaved-change guard has run.
  header.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a')) {
      window.queueMicrotask(() => { if (!event.defaultPrevented && open) setOpen(false, true); });
    }
  });
  document.addEventListener('click', event => {
    // Opening replaces the SVG; its original event path still includes the toggle.
    const path = event.composedPath();
    if (open && !small.matches && !path.includes(accountLinks) && !path.includes(menu)) setOpen(false);
  });
  // Some browsers blur links without focusing a clicked native button.
  // Keep the panel available until an inside pointer press completes.
  let pressingUtility = false;
  accountLinks.addEventListener('pointerdown', () => { pressingUtility = true; });
  document.addEventListener('pointerup', () => { pressingUtility = false; });
  document.addEventListener('pointercancel', () => { pressingUtility = false; });
  header.addEventListener('focusout', () => {
    window.queueMicrotask(() => {
      if (open && !small.matches && !pressingUtility && !accountLinks.contains(document.activeElement) && document.activeElement !== menu) setOpen(false);
    });
  });
  const resetLayout = () => {
    const focused = document.activeElement;
    const restore = focused && (nav.contains(focused) || focused === menu);
    setOpen(false);
    if (restore) (large.matches ? wordmark : menu).focus();
  };
  small.addEventListener('change', resetLayout);
  large.addEventListener('change', resetLayout);
  setOpen(false);
  // In the mobile disclosure, Tab advances from its toggle into the links.
  content.append(wordmark, menu, nav);
  header.replaceChildren(content);

  // The existing Tracker client is shared with bootstrap; public pages only
  // initialize its session, never the Tracker data layer or protected workspace.
  /** @typedef {ReturnType<typeof import('../career-radar/supabase-client.js').createRadarClient>} Client */
  /** @type {Client|undefined} */
  let client;
  /** @type {Awaited<ReturnType<Client['auth']['getSession']>>['data']['session']} */
  let session = null;
  let state = 'loading';
  let signingOut = false;
  /** @type {{unsubscribe:()=>void}|undefined} */
  let subscription;
  updateAccount = () => {
    account.textContent = state === 'loading' ? 'Account…' : state === 'error' ? 'Retry account' : session ? 'Log Out' : 'Log In';
    account.disabled = state === 'loading' || signingOut || accountBusy;
    account.setAttribute('aria-busy', String(state === 'loading' || signingOut));
    account.setAttribute('aria-label', state === 'loading' ? 'Checking account session' : account.textContent);
    account.title = state === 'error' ? 'Account unavailable. Check your connection or Prospect Tracker configuration, then retry.' : '';
  };
  const initializeAccount = async () => {
    state = 'loading'; updateAccount();
    try {
      const { getRadarClient } = await import('../career-radar/supabase-client.js');
      client = await getRadarClient();
      subscription?.unsubscribe();
      subscription = client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession; state = 'ready'; updateAccount();
      }).data.subscription;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      session = data.session; state = 'ready';
    } catch { subscription?.unsubscribe(); state = 'error'; }
    updateAccount();
  };
  account.addEventListener('click', async () => {
    if (state === 'error') { void initializeAccount(); return; }
    if (state !== 'ready' || !client || accountBusy || signingOut) return;
    if (!session) {
      setOpen(false);
      if (header.dataset.app === 'tracker') {
        document.getElementById('login-email')?.focus();
      } else {
        const login = new URL('../career-radar/', import.meta.url);
        login.searchParams.set('returnTo', window.location.href);
        window.location.assign(login.href);
      }
      return;
    }
    if (!window.dispatchEvent(new window.Event('nextchapter:before-sign-out', { cancelable: true }))) return;
    signingOut = true; updateAccount();
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      session = null;
      if (open) setOpen(false, true);
      showToast({ message: 'Signed out.' });
    } catch {
      showToast({ message: 'Could not sign out. Check your connection and try again.', variant: 'danger', duration: 0 });
    } finally { signingOut = false; updateAccount(); }
  });
  updateAccount();
  void initializeAccount();
}
