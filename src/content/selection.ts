export interface SelectionSnapshot {
  id: number;
  text: string;
  range: Range;
}

const HIT_PADDING = 3;

let current: SelectionSnapshot | null = null;
let nextId = 1;

export function getCurrentSelection(): SelectionSnapshot | null {
  return current;
}

/** Re-reads the page selection. Keeps the same snapshot (and id) if nothing changed. */
export function captureSelection(): SelectionSnapshot | null {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? '';
  if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !text) {
    current = null;
    return null;
  }

  const range = selection.getRangeAt(0);
  if (current && current.text === text && sameRange(current.range, range)) {
    return current;
  }
  current = { id: nextId++, text, range: range.cloneRange() };
  return current;
}

/** The selection rectangle under the point, if any. */
export function rectAtPoint(x: number, y: number): DOMRect | null {
  if (!current) return null;
  for (const rect of current.range.getClientRects()) {
    if (
      rect.width > 0 &&
      x >= rect.left - HIT_PADDING &&
      x <= rect.right + HIT_PADDING &&
      y >= rect.top - HIT_PADDING &&
      y <= rect.bottom + HIT_PADDING
    ) {
      return rect;
    }
  }
  return null;
}

function sameRange(a: Range, b: Range): boolean {
  return (
    a.compareBoundaryPoints(Range.START_TO_START, b) === 0 &&
    a.compareBoundaryPoints(Range.END_TO_END, b) === 0
  );
}
