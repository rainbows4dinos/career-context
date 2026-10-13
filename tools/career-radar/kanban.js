import { resolveBoardDrop, statusLabel } from './view-model.js';

/** @typedef {import('./data.js').ProspectCard} Card
 * @typedef {{canMove:()=>boolean, move:(card:Card,status:import('./model.js').ProspectStatus)=>Promise<void>}} MoveOptions */

/** Native desktop DnD only. No persistence, sorting or shared StatusPicker.
 * @param {HTMLElement} board @param {Card[]} cards @param {MoveOptions} options
 * @returns {()=>void} Dispose when the board/route/session is replaced. */
export function mountBoardDrag(board, cards, options) {
  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };
  const desktop = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const byId = new Map(cards.map(card => [card.id, card]));
  /** @type {{card:Card,element:HTMLElement}|null} */
  let dragging = null;
  /** @type {HTMLElement|null} */
  let chooser = null;
  /** @type {AbortController|null} */
  let chooserController = null;
  /** @type {HTMLElement|null} */
  let returnFocus = null;
  let suppressClick = false;
  let clickTimer = 0;

  function closeChooser(restore = true) {
    chooserController?.abort(); chooserController = null;
    chooser?.remove(); chooser = null;
    if (restore && returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }
  function clearDrag() {
    dragging?.element.classList.remove('prospect-card--dragging');
    dragging = null; board.classList.remove('board--dragging');
    for (const column of board.querySelectorAll('.column')) column.classList.remove('column--drop-valid', 'column--drop-over');
  }
  function configure() {
    for (const element of board.querySelectorAll('.prospect-card')) {
      /** @type {HTMLElement} */ (element).draggable = desktop.matches;
    }
    if (!desktop.matches) { clearDrag(); closeChooser(); }
  }
  configure(); desktop.addEventListener('change', configure, listenerOptions);

  /** @param {Card} card @param {HTMLElement} source @param {HTMLElement} destination
   * @param {readonly import('./model.js').ProspectStatus[]} statuses */
  function chooseDone(card, source, destination, statuses) {
    closeChooser(false); returnFocus = source;
    chooserController = new AbortController();
    const signal = chooserController.signal;
    const panel = document.createElement('div'); panel.className = 'kanban-outcome';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'kanban-outcome-title');
    const title = document.createElement('p'); title.id = 'kanban-outcome-title'; title.textContent = 'Select a Done outcome';
    const description = document.createElement('p'); description.className = 'muted'; description.textContent = card.company;
    panel.append(title, description);
    for (const status of statuses) {
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'nc-button nc-button--tertiary nc-button--sm'; button.textContent = statusLabel(status);
      button.addEventListener('click', () => {
        if (!options.canMove()) return;
        closeChooser(); void options.move(card, status);
      }, { signal });
      panel.append(button);
    }
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'nc-button nc-button--tertiary nc-button--sm'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => closeChooser(), { signal }); panel.append(cancel);
    chooser = panel; document.body.append(panel);
    const anchor = destination.querySelector('summary,h3')?.getBoundingClientRect() ?? destination.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(anchor.left, window.innerWidth - box.width - 12))}px`;
    panel.style.top = `${Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - box.height - 12))}px`;
    panel.querySelector('button')?.focus();
    /** @param {Event} event */
    const dismissOutside = event => {
      if (event.target instanceof Element && !panel.contains(event.target)) closeChooser(false);
    };
    document.addEventListener('pointerdown', dismissOutside, { signal, capture: true });
    document.addEventListener('click', dismissOutside, { signal, capture: true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeChooser(); return; }
      if (!panel.contains(document.activeElement)) return;
      const buttons = [...panel.querySelectorAll('button')];
      const index = buttons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'Tab' && (event.shiftKey ? index === 0 : index === buttons.length - 1)) { closeChooser(); return; }
      else return;
      event.preventDefault(); buttons[next]?.focus();
    }, { signal });
    // Anchor remains meaningful only while the board stays in this position.
    window.addEventListener('resize', () => closeChooser(), { signal });
    window.addEventListener('scroll', event => { if (event.target instanceof Element && panel.contains(event.target)) return; closeChooser(); }, { signal, capture: true });
  }

  board.addEventListener('pointerdown', event => {
    const card = event.target instanceof Element ? event.target.closest('.prospect-card') : null;
    if (card) /** @type {HTMLElement} */ (card).draggable = desktop.matches && event.pointerType === 'mouse';
  }, listenerOptions);
  board.addEventListener('dragstart', event => {
    const element = event.target instanceof Element ? event.target.closest('.prospect-card') : null;
    const card = element instanceof window.HTMLElement ? byId.get(element.dataset.prospectId ?? '') : undefined;
    if (!card || !(element instanceof window.HTMLElement) || !event.dataTransfer || !desktop.matches || !options.canMove()) { event.preventDefault(); return; }
    closeChooser(false); suppressClick = true;
    dragging = { card, element }; element.classList.add('prospect-card--dragging'); board.classList.add('board--dragging');
    event.dataTransfer.clearData(); event.dataTransfer.setData('application/x-nextchapter-prospect', card.id); event.dataTransfer.effectAllowed = 'move';
    for (const column of board.querySelectorAll('.column')) {
      if (resolveBoardDrop(card.status, /** @type {HTMLElement} */ (column).dataset.columnId ?? '')) column.classList.add('column--drop-valid');
    }
  }, listenerOptions);
  board.addEventListener('dragover', event => {
    const column = event.target instanceof Element ? event.target.closest('.column') : null;
    if (!dragging || !column || !options.canMove()) return;
    const valid = resolveBoardDrop(dragging.card.status, /** @type {HTMLElement} */ (column).dataset.columnId ?? '');
    event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = valid ? 'move' : 'none';
    for (const other of board.querySelectorAll('.column')) other.classList.toggle('column--drop-over', other === column && !!valid);
  }, listenerOptions);
  board.addEventListener('dragenter', event => {
    if (dragging && options.canMove() && event.target instanceof Element && event.target.closest('.column')) event.preventDefault();
  }, listenerOptions);
  board.addEventListener('dragleave', event => {
    if (event.target instanceof Element) {
      const column = event.target.closest('.column');
      if (column && !(event.relatedTarget instanceof window.Node && column.contains(event.relatedTarget))) column.classList.remove('column--drop-over');
    }
  }, listenerOptions);
  board.addEventListener('drop', event => {
    const column = event.target instanceof Element ? event.target.closest('.column') : null;
    if (!dragging || !(column instanceof window.HTMLElement)) return;
    event.preventDefault(); const { card, element } = dragging;
    const resolution = options.canMove() ? resolveBoardDrop(card.status, column.dataset.columnId ?? '') : null;
    clearDrag();
    if (!resolution) return;
    if (resolution.kind === 'choose') chooseDone(card, element, column, resolution.statuses);
    else void options.move(card, resolution.status);
  }, listenerOptions);
  board.addEventListener('dragend', () => {
    clearDrag(); window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => { suppressClick = false; }, 0);
  }, listenerOptions);
  board.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
  }, { ...listenerOptions, capture: true });
  return () => { controller.abort(); closeChooser(false); clearDrag(); window.clearTimeout(clickTimer); };
}
