try {
  const [{ getRadarClient }, { startRadar }] = await Promise.all([
    import('./supabase-client.js'),
    // @ts-expect-error Browser asset revision; TypeScript does not resolve URL query strings.
    import('./app.js?v=20261014-workable')
  ]);
  await startRadar(await getRadarClient());
} catch {
  const workspace = document.getElementById('workspace');
  if (workspace) {
    workspace.hidden = false;
    const message = document.createElement('p');
    message.textContent = 'Prospect Tracker could not connect. Check your connection and reload. For a new setup, generate public-env.js from the Supabase environment variables first.';
    const reload = document.createElement('button'); reload.textContent = 'Reload';
    reload.addEventListener('click', () => window.location.reload());
    workspace.replaceChildren(message, reload);
  }
}
