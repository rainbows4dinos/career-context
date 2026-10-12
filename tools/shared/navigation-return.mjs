// Restrict login returns to the suite's existing static entry points.
/** @param {string|null} value @param {string|URL} moduleUrl */
export function safeLoginReturn(value, moduleUrl) {
  if (!value) return null;
  try {
    const base = new URL('../', moduleUrl);
    const destination = new URL(value, base);
    const paths = ['career-radar.html', 'career-radar/', 'career-radar/index.html', 'resume-tailor.html', 'about.html'];
    if (!['http:', 'https:'].includes(destination.protocol) || destination.origin !== base.origin || destination.username || destination.password ||
        !paths.some(path => destination.pathname === new URL(path, base).pathname)) return null;
    // Never chain return destinations, even on an otherwise allowed page.
    destination.searchParams.delete('returnTo');
    return destination.href;
  } catch { return null; }
}

/** Return only after authentication; invalid destinations are simply removed. */
export function returnAfterLogin() {
  const current = new URL(window.location.href);
  if (!current.searchParams.has('returnTo')) return;
  const destination = safeLoginReturn(current.searchParams.get('returnTo'), import.meta.url);
  current.searchParams.delete('returnTo');
  window.history.replaceState(null, '', current.href);
  if (destination && destination !== current.href) window.location.replace(destination);
}
