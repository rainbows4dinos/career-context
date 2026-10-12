import { gravityIcon } from './icons.mjs';
import { statusIcons } from './status.mjs';

/** @typedef {'success'|'danger'|'warning'|'info'} Variant
 * @typedef {{id:string, variant:Variant, message:string, dismissible:boolean, duration:number, remaining:number, started:number, timer:ReturnType<typeof setTimeout>|null, element:HTMLElement|null, hovered:boolean, focused:boolean, exiting:boolean, returnFocus:HTMLElement|null}} Toast */
/** @type {Map<string, Toast>} */
const records = new Map();
/** @type {string[]} */
const pending = [];
/** @type {Set<string>} */
const visible = new Set();
let serial = 0;
/** @type {HTMLElement} */
let stack;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mount() {
  if (stack?.isConnected) return;
  stack = document.createElement('div'); stack.className = 'nc-toast-stack'; stack.setAttribute('aria-label', 'Notifications');
  document.body.append(stack);
}

/** @param {Toast} record */
function pause(record) {
  if (record.timer !== null) {
    clearTimeout(record.timer); record.timer = null;
    record.remaining = Math.max(0, record.remaining - (performance.now() - record.started));
  }
}
/** @param {Toast} record */
function resume(record) {
  if (!record.duration || record.hovered || record.focused || record.exiting || record.timer !== null) return;
  record.started = performance.now();
  record.timer = setTimeout(() => {
    record.timer = null;
    if (record.element?.contains(document.activeElement)) { record.focused = true; record.remaining = 0; return; }
    dismissToast(record.id);
  }, record.remaining);
}

/** @param {Toast} record */
function render(record) {
  const toast = document.createElement('div'); toast.className = `nc-toast nc-toast--${record.variant}`; toast.dataset.toastId = record.id;
  const text = document.createElement('span'); text.className = 'nc-toast__message'; text.textContent = record.message; text.setAttribute('aria-hidden', 'true');
  toast.append(gravityIcon(statusIcons[record.variant]), text);
  if (record.dismissible) {
    const close = document.createElement('button'); close.type = 'button'; close.className = 'nc-toast__dismiss';
    close.setAttribute('aria-label', 'Dismiss notification'); close.append(gravityIcon('xmark'));
    close.addEventListener('click', () => dismissToast(record.id)); toast.append(close);
  }
  record.element = toast;
  toast.addEventListener('pointerenter', () => { record.hovered = true; pause(record); });
  toast.addEventListener('pointerleave', () => { record.hovered = false; resume(record); });
  toast.addEventListener('focusin', event => {
    if (event.relatedTarget instanceof HTMLElement && !toast.contains(event.relatedTarget)) record.returnFocus = event.relatedTarget;
    record.focused = true; pause(record);
  });
  toast.addEventListener('focusout', () => {
    setTimeout(() => { record.focused = toast.contains(document.activeElement); if (!record.focused) resume(record); }, 0);
  });
  stack.append(toast); visible.add(record.id);
  requestAnimationFrame(() => { if (!record.exiting) toast.classList.add('is-visible'); });
  // Mount an empty live region first; each admitted toast announces only once.
  const live = document.createElement('span'); live.className = 'nc-visually-hidden';
  live.setAttribute('role', record.variant === 'danger' ? 'alert' : 'status');
  live.setAttribute('aria-atomic', 'true');
  toast.append(live);
  setTimeout(() => { if (!record.exiting) live.textContent = `${record.variant}: ${record.message}`; }, 50);
  resume(record);
}
function drain() {
  while (visible.size < 3 && pending.length) {
    const id = pending.shift(); const record = id ? records.get(id) : undefined;
    if (record) render(record);
  }
}

/** Show a notification without stealing focus. Oldest first, max three visible.
 * @param {{variant?: 'success'|'danger'|'warning'|'info', message: string, dismissible?: boolean, duration?: number}} options
 * @returns {string} Identifier for dismissToast(). duration 0 means persistent. */
export function showToast({ variant = 'info', message, dismissible = true, duration = ['success', 'info'].includes(variant) ? 4000 : 0 }) {
  if (!Object.hasOwn(statusIcons, variant)) throw new TypeError('Unknown notification variant');
  if (typeof message !== 'string' || !message.trim()) throw new TypeError('A notification message is required');
  if (!Number.isFinite(duration) || duration < 0) throw new TypeError('Notification duration must be nonnegative');
  for (const record of records.values()) if (record.variant === variant && record.message === message) return record.id;
  mount();
  const id = `nc-toast-${++serial}`;
  records.set(id, { id, variant, message, dismissible, duration, remaining: duration, started: 0, timer: null, element: null, hovered: false, focused: false, exiting: false, returnFocus: null });
  pending.push(id); drain(); return id;
}

/** Dismiss only this toast; queued notifications have no timers or announcements.
 * @param {string} id */
export function dismissToast(id) {
  const record = records.get(id);
  if (!record || record.exiting) return;
  if (!visible.has(id)) { records.delete(id); pending.splice(pending.indexOf(id), 1); return; }
  record.exiting = true; pause(record);
  const toast = record.element;
  if (!toast) return;
  if (toast.contains(document.activeElement)) {
    const next = [...visible].filter(key => key !== id).map(key => { const other = records.get(key); return !other?.exiting ? other?.element?.querySelector('button') : null; }).find(Boolean);
    const destination = next || record.returnFocus;
    if (destination?.isConnected && typeof destination.focus === 'function') destination.focus();
  }
  toast.classList.remove('is-visible');
  setTimeout(() => {
    const positions = new Map([...stack.children].map(node => [node, node.getBoundingClientRect().top]));
    toast.remove(); records.delete(id); visible.delete(id); drain();
    if (!reducedMotion()) for (const node of stack.children) {
      const previous = positions.get(node);
      if (previous !== undefined) {
        const delta = previous - node.getBoundingClientRect().top;
        if (delta) node.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
      }
    }
  }, reducedMotion() ? 150 : 180);
}
