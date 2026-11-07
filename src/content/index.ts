import { createChromeTranslator } from '../translate/chromeTranslator';
import type { TextTranslator, TranslationResult } from '../translate/types';
import { captureSelection, getCurrentSelection, rectAtPoint, type SelectionSnapshot } from './selection';
import { Tooltip, type TooltipContent } from './tooltip';

// Stage 1: swap in `identityTranslator` from '../translate/identity' to show the original text.
const translator: TextTranslator = createChromeTranslator('ru');

const HIDE_DELAY_MS = 150;
const SELECTION_DEBOUNCE_MS = 100;

const tooltip = new Tooltip();
let shownFor: number | null = null;
let dismissedFor: number | null = null;
let hideTimer: number | undefined;
let selectionTimer: number | undefined;
let frame: number | undefined;
let pointer = { x: -1, y: -1 };
let mouseDown = false;

function showFor(snap: SelectionSnapshot, rect: DOMRect): void {
  window.clearTimeout(hideTimer);
  if (shownFor === snap.id) return;
  shownFor = snap.id;

  tooltip.show(rect, pointer.x, { status: 'loading', message: 'Перевожу…' });
  translator
    .translate(snap.text, (fraction) => {
      if (shownFor !== snap.id) return;
      tooltip.update({
        status: 'loading',
        message: `Загрузка языковой модели… ${Math.round(fraction * 100)}%`,
      });
    })
    .then((result) => {
      if (shownFor === snap.id) tooltip.update(toContent(result));
    })
    .catch((err: unknown) => {
      if (shownFor !== snap.id) return;
      console.warn('[translate-selected-text]', err);
      tooltip.update({ status: 'error', message: 'Не удалось перевести текст.' });
    });
}

function toContent(result: TranslationResult): TooltipContent {
  switch (result.kind) {
    case 'original':
      return { status: 'result', text: result.text };
    case 'translated':
      return { status: 'result', text: result.text, note: `${result.sourceLanguage} → ru` };
    case 'same-language':
      return { status: 'result', text: result.text, note: 'Текст уже на русском' };
    case 'unsupported':
      return { status: 'result', text: result.text, note: result.reason };
  }
}

function hideNow(): void {
  window.clearTimeout(hideTimer);
  shownFor = null;
  tooltip.hide();
}

function scheduleHide(): void {
  if (!tooltip.visible) return;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hideNow, HIDE_DELAY_MS);
}

function evaluatePointer(): void {
  frame = undefined;
  const snap = getCurrentSelection();
  if (mouseDown || !snap || dismissedFor === snap.id) return scheduleHide();

  const { x, y } = pointer;
  if (tooltip.containsPoint(x, y)) {
    window.clearTimeout(hideTimer);
    return;
  }
  const rect = rectAtPoint(x, y);
  if (rect) showFor(snap, rect);
  else scheduleHide();
}

function onSelectionChange(): void {
  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(() => {
    const snap = captureSelection();
    if (!snap || snap.id !== shownFor) hideNow();
    if (snap && snap.id !== dismissedFor) dismissedFor = null;
    // Still within the user gesture's activation window, so model downloads are allowed.
    if (snap) translator.prepare?.(snap.text);
  }, SELECTION_DEBOUNCE_MS);
}

document.addEventListener('selectionchange', onSelectionChange);

document.addEventListener(
  'mousemove',
  (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    frame ??= requestAnimationFrame(evaluatePointer);
  },
  { passive: true },
);

document.addEventListener(
  'mousedown',
  (e) => {
    if (tooltip.isOwnNode(e.target)) return;
    mouseDown = true;
    hideNow();
  },
  true,
);

document.addEventListener(
  'mouseup',
  () => {
    mouseDown = false;
  },
  true,
);

document.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Escape' || !tooltip.visible) return;
    dismissedFor = shownFor;
    hideNow();
  },
  true,
);

window.addEventListener('scroll', hideNow, { capture: true, passive: true });
window.addEventListener('resize', hideNow, { passive: true });
window.addEventListener('blur', hideNow);
