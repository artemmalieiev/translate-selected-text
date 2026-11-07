import css from './tooltip.css?inline';

export type TooltipContent =
  | { status: 'loading'; message: string }
  | { status: 'result'; text: string; note?: string }
  | { status: 'error'; message: string };

const GAP = 8;
const EDGE = 8;

/** A single tooltip rendered in a closed shadow root, so page styles can't affect it. */
export class Tooltip {
  private readonly host = document.createElement('div');
  private readonly box = document.createElement('div');
  private readonly text = document.createElement('div');
  private readonly note = document.createElement('div');
  private anchor: { rect: DOMRect; x: number } | null = null;

  constructor() {
    this.host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; z-index: 2147483647;';
    const root = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = css;
    this.box.className = 'box';
    this.box.hidden = true;
    this.text.className = 'text';
    this.note.className = 'note';
    this.box.append(this.text, this.note);
    root.append(style, this.box);
  }

  get visible(): boolean {
    return !this.box.hidden;
  }

  /** Shows the tooltip next to `rect`, horizontally centered on the pointer `x`. */
  show(rect: DOMRect, x: number, content: TooltipContent): void {
    if (!this.host.isConnected) document.documentElement.append(this.host);
    this.anchor = { rect, x };
    this.box.hidden = false;
    this.update(content);
  }

  update(content: TooltipContent): void {
    this.box.classList.remove('loading', 'result', 'error');
    this.box.classList.add(content.status);
    this.text.textContent = content.status === 'result' ? content.text : content.message;
    this.note.textContent = content.status === 'result' ? (content.note ?? '') : '';
    this.box.scrollTop = 0;
    this.position();
  }

  hide(): void {
    this.box.hidden = true;
    this.anchor = null;
  }

  containsPoint(x: number, y: number): boolean {
    if (!this.visible) return false;
    const r = this.box.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  isOwnNode(node: EventTarget | null): boolean {
    return node === this.host;
  }

  private position(): void {
    if (!this.anchor) return;
    const { rect, x } = this.anchor;
    const { width, height } = this.box.getBoundingClientRect();

    let top = rect.top - height - GAP;
    if (top < EDGE) top = rect.bottom + GAP;
    top = Math.max(EDGE, Math.min(top, window.innerHeight - height - EDGE));

    let left = x - width / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE));

    this.box.style.top = `${top}px`;
    this.box.style.left = `${left}px`;
  }
}
