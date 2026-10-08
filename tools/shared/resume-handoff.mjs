// One-use, same-origin transport. The URL contains only a random token.
export const HANDOFF_TTL = 5 * 60 * 1000;
export const HANDOFF_PARAM = 'radar-handoff';
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** @typedef {{company: string, title: string, description: string}} Job */
/** @typedef {{version: number, createdAt: number, job: Job}} Payload */
/** @param {URL} url */
const prefix = url => `career-resume-handoff:${url.pathname}:`;

/** @param {unknown} value @param {number} now @returns {value is Payload} */
function valid(value, now) {
  if (!value || typeof value !== 'object') return false;
  const payload = /** @type {Payload} */ (value);
  return payload?.version === 1 && Number.isFinite(payload.createdAt)
    && payload.createdAt <= now && now - payload.createdAt < HANDOFF_TTL
    && !!payload.job && ['company', 'title', 'description'].every(field => typeof payload.job[/** @type {keyof Job} */ (field)] === 'string');
}

/** Remove abandoned payloads on the next visit; expiry is also enforced on read.
 * @param {Storage} storage @param {URL} url @param {number} [now] */
export function clearExpiredHandoffs(storage, url, now = Date.now()) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix(url))) keys.push(key);
  }
  for (const key of keys) {
    let payload;
    try { payload = JSON.parse(storage.getItem(key) ?? 'null'); } catch { /* malformed */ }
    if (!valid(payload, now)) storage.removeItem(key);
  }
}

/** Store exact strings, scoped to this Builder path (including a Pages project prefix).
 * @param {Storage} storage @param {URL} builderUrl @param {Job} job
 * @param {number} [now] @param {string} [token] */
export function createHandoff(storage, builderUrl, job, now = Date.now(), token = crypto.randomUUID()) {
  if (!TOKEN.test(token)) throw new Error('Invalid handoff token.');
  const payload = { version: 1, createdAt: now, job };
  if (!valid(payload, now)) throw new Error('Invalid job details.');
  clearExpiredHandoffs(storage, builderUrl, now);
  const key = prefix(builderUrl) + token;
  storage.setItem(key, JSON.stringify(payload));
  const url = new URL(builderUrl);
  url.hash = new URLSearchParams({ [HANDOFF_PARAM]: token }).toString();
  return { url, key };
}

/** Read only an explicitly addressed payload; standalone tabs never steal a handoff.
 * @param {Storage} storage @param {URL} url @param {number} [now] */
export function readHandoff(storage, url, now = Date.now()) {
  const params = new URLSearchParams(url.hash.slice(1));
  if (!params.has(HANDOFF_PARAM)) return null;
  const token = params.get(HANDOFF_PARAM);
  if (!TOKEN.test(token ?? '')) throw new Error('This job transfer is invalid. Send it again from Career Radar.');
  const key = prefix(url) + token;
  const raw = storage.getItem(key);
  let payload;
  try { payload = JSON.parse(raw ?? 'null'); } catch { /* malformed */ }
  if (!valid(payload, now)) {
    storage.removeItem(key);
    throw new Error('This job transfer is missing, expired or invalid. Send it again from Career Radar.');
  }
  return { key, job: payload.job };
}

/** Delete before applying fields: failed deletion must not allow replay or partial replacement.
 * @param {Storage} storage @param {{key: string, job: Job}} handoff
 * @param {Record<keyof Job, {value: string}>} fields @param {() => boolean} confirmReplace */
export function consumeHandoff(storage, handoff, fields, confirmReplace) {
  const replace = !Object.values(fields).some(field => field.value !== '') || confirmReplace();
  storage.removeItem(handoff.key);
  if (!replace) return false;
  for (const [name, field] of Object.entries(fields)) field.value = handoff.job[/** @type {keyof Job} */ (name)];
  return true;
}
