/* Accessibility adapter for opt-in native fields; validation rules stay local. */
let nextId = 0;
/** @type {WeakMap<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement, () => string>} */
const rechecks = new WeakMap();
const controls = '.nc-input, .nc-textarea, .nc-select';
/** @param {EventTarget|null} target @returns {target is HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} */
const isControl = target => (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) && target.matches(controls);

/** @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} control @param {string} message @param {() => string} [recheck] */
export function setFieldError(control, message, recheck) {
  if (message && recheck) rechecks.set(control, recheck);
  if (!message) rechecks.delete(control);
  if (!control.id) control.id = `nc-field-${++nextId}`;
  const errorId = `${control.id}-error`;
  let error = document.getElementById(errorId);
  const described = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  const field = control.closest('.nc-field');
  if (message) {
    if (!error) {
      error = document.createElement('span'); error.id = errorId; error.className = 'nc-field__error';
      (field || control.parentElement)?.append(error);
    }
    error.textContent = message;
    described.add(errorId); control.setAttribute('aria-invalid', 'true'); field?.classList.add('nc-field--error');
  } else {
    error?.remove(); described.delete(errorId); control.removeAttribute('aria-invalid'); field?.classList.remove('nc-field--error');
  }
  if (described.size) control.setAttribute('aria-describedby', [...described].join(' '));
  else control.removeAttribute('aria-describedby');
}

/** Preserve native validation popups/focus; add persistent associated error text.
 * @param {Document|HTMLFormElement|HTMLElement} root */
export function bindFieldValidation(root) {
  root.addEventListener('invalid', event => {
    const control = event.target;
    if (isControl(control)) setFieldError(control, control.validationMessage);
  }, true);
  /** @param {Event} event */
  const update = event => {
    const control = event.target;
    if (!isControl(control) || !control.hasAttribute('aria-invalid')) return;
    const recheck = rechecks.get(control);
    if (recheck) { setFieldError(control, recheck()); return; }
    const blank = control.required && !control.value.trim();
    if (control.validity.valid && !blank) setFieldError(control, '');
    else if (!control.validity.valid) setFieldError(control, control.validationMessage);
  };
  root.addEventListener('input', update); root.addEventListener('change', update);
  root.addEventListener('reset', event => {
    if (event.target instanceof HTMLFormElement) for (const control of event.target.querySelectorAll(controls)) {
      if (isControl(control)) setFieldError(control, '');
    }
  });
}
