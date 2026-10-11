// Static destinations resolve from this module, including a GitHub Pages prefix.
const destinations = [
  ['radar', 'Career Radar', '../career-radar.html'],
  ['tracker', 'Prospect Tracker', '../career-radar/'],
  ['builder', 'Résumé Builder', '../resume-tailor.html']
];
const header = document.getElementById('nextchapter-header');
if (header) {
  header.classList.add('nextchapter-header');
  const wordmark = document.createElement('a');
  wordmark.className = 'nextchapter-wordmark';
  wordmark.textContent = 'nextchapter';
  wordmark.href = new URL('../career-radar/', import.meta.url).href;
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'nextchapter applications');
  for (const [app, label, path] of destinations) {
    const link = document.createElement('a');
    link.textContent = label;
    link.href = new URL(path, import.meta.url).href;
    if (app === header.dataset.app) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  // Builder's existing track, thumb and icons, with a native keyboard button.
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'theme-toggle';
  toggle.title = 'Toggle light/dark mode';
  toggle.innerHTML = '<span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span><span class="material-icons-outlined toggle-icon-sun">light_mode</span><span class="material-icons-outlined toggle-icon-moon">dark_mode</span></span>';
  const updateToggle = () => {
    const light = document.body.classList.contains('light');
    toggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    toggle.setAttribute('aria-pressed', String(light));
  };
  // Preserve Builder's default dark, body.light and existing storage key.
  try { document.body.classList.toggle('light', localStorage.getItem('theme') === 'light'); } catch { /* use default when storage is blocked */ }
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
  header.replaceChildren(wordmark, toggle, nav);
}
