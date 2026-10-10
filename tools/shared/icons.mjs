import { gravityIconNames } from './vendor/gravity-icons/names.mjs';
export { gravityIconNames };

const names = new Set(gravityIconNames);
const sprite = new URL('./vendor/gravity-icons/sprite.svg', import.meta.url);
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Create an icon; omit label when adjacent text already describes its action.
 * @param {string} name @param {{label?: string, size?: number}} [options] */
export function gravityIcon(name, { label = '', size = 16 } = {}) {
  if (!names.has(name)) throw new Error(`Unknown Gravity UI icon: ${name}`);
  if (!Number.isFinite(size) || size <= 0) throw new Error('Icon size must be positive.');
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.classList.add('gravity-icon');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('width', String(size));
  icon.setAttribute('height', String(size));
  icon.setAttribute('focusable', 'false');
  if (label) {
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', label);
  } else icon.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('width', '16');
  use.setAttribute('height', '16');
  use.setAttribute('href', `${sprite.href}#${name}`);
  icon.append(use);
  return icon;
}
