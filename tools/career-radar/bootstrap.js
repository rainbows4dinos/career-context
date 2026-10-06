const themeButton = document.getElementById('theme');
function applyTheme() {
  if (themeButton) themeButton.textContent = document.body.classList.contains('light') ? 'Dark theme' : 'Light theme';
}
try { document.body.classList.toggle('light', localStorage.getItem('theme') === 'light'); } catch { /* storage may be unavailable */ }
applyTheme();
themeButton?.addEventListener('click', () => {
  const light = document.body.classList.toggle('light');
  try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch { /* theme still works for this page */ }
  applyTheme();
});
try {
  const configPath = './public-env.js';
  const [{ default: env }, { createRadarClient }, { startRadar }] = await Promise.all([
    import(configPath), import('./supabase-client.js'), import('./app.js')
  ]);
  await startRadar(createRadarClient(env));
} catch {
  const workspace = document.getElementById('workspace');
  if (workspace) {
    workspace.hidden = false;
    const message = document.createElement('p');
    message.textContent = 'Career Radar could not connect. Check your connection and reload. For a new setup, generate public-env.js from the Supabase environment variables first.';
    const reload = document.createElement('button'); reload.textContent = 'Reload';
    reload.addEventListener('click', () => window.location.reload());
    workspace.replaceChildren(message, reload);
  }
}
