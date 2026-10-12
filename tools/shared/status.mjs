import { gravityIcon } from './icons.mjs';
export const statusIcons = Object.freeze({ success: 'circle-check', danger: 'circle-xmark', warning: 'triangle-exclamation', info: 'circle-info' });

/** Replace an inline message safely. No focus movement or dismissal.
 * @param {HTMLElement} element @param {{message: string, variant?: 'success'|'danger'|'warning'|'info', announcement?: 'polite'|'assertive'|'off'}} options */
export function setAlert(element, { message, variant = 'info', announcement = variant === 'danger' ? 'assertive' : 'polite' }) {
  for (const name of Object.keys(statusIcons)) element.classList.remove(`nc-alert--${name}`);
  element.classList.add('nc-alert');
  element.replaceChildren();
  if (announcement === 'off') { element.removeAttribute('role'); element.removeAttribute('aria-live'); }
  else { element.setAttribute('role', announcement === 'assertive' ? 'alert' : 'status'); element.setAttribute('aria-live', announcement); }
  element.setAttribute('aria-atomic', 'true');
  if (!message) return;
  element.classList.add(`nc-alert--${variant}`);
  const text = document.createElement('span'); text.className = 'nc-alert__message'; text.textContent = message;
  element.append(gravityIcon(statusIcons[variant]), text);
}
