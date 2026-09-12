import { type MouseEvent, type RefObject, useCallback, useRef, useState } from "react";

export type Axis = "x" | "y" | "xy";

export interface ItemRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasuredItem {
  rect: ItemRect;
  /** Items either side of a divider are in different groups; the highlight never crosses one. */
  group: number;
  disabled: boolean;
}

interface Point {
  x: number;
  y: number;
}

function gap(p: number, start: number, length: number) {
  if (p < start) return start - p;
  if (p > start + length) return p - start - length;
  return 0;
}

function distance(p: Point, r: ItemRect, axis: Axis) {
  const dx = gap(p.x, r.x, r.width);
  const dy = gap(p.y, r.y, r.height);
  if (axis === "x") return dx;
  if (axis === "y") return dy;
  return Math.hypot(dx, dy);
}

/** The nearest enabled item in the pointer's group, or null when that group has none. */
export function nearestItem(items: MeasuredItem[], p: Point, axis: Axis, group: number) {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  items.forEach((item, i) => {
    if (item.disabled || item.group !== group) return;
    const d = distance(p, item.rect, axis);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/** How many dividers the pointer has passed, counting along the list's axis. */
export function groupAt(dividers: number[], p: Point, axis: Axis) {
  if (axis === "xy") return 0;
  const along = axis === "x" ? p.x : p.y;
  return dividers.filter((d) => d < along).length;
}

interface Options {
  axis?: Axis | undefined;
  /** Selector for the items, matched inside the container in DOM order. */
  items: string;
  /** Selector for dividers between groups of items. */
  dividers?: string | undefined;
}

interface State {
  index: number | null;
  rect: ItemRect | null;
  shown: boolean;
  /** Bumped each time the highlight reappears, so it remounts at the new row instead of sliding from the old one. */
  enters: number;
}

export interface FluidHover {
  activeIndex: number | null;
  rect: ItemRect | null;
  shown: boolean;
  enters: number;
  handlers: {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
    onMouseMove: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
  };
  hide: () => void;
  /** Call after the items change while the pointer may still be inside. */
  remeasure: () => void;
}

const HIDDEN: State = { index: null, rect: null, shown: false, enters: 0 };

const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * One hover highlight for a list, sliding to the nearest enabled item under the pointer
 * instead of blinking off in the gaps. Pointer devices only, like every other hover. Measures
 * from the DOM on enter, so the list must hold still while the pointer is inside it.
 */
export function useFluidHover(ref: RefObject<HTMLElement | null>, options: Options): FluidHover {
  const { axis = "y", items: itemSelector, dividers: dividerSelector } = options;
  const [state, setState] = useState<State>(HIDDEN);
  const measured = useRef<{ items: MeasuredItem[]; dividers: number[] }>({
    items: [],
    dividers: [],
  });

  const measure = useCallback(() => {
    const container = ref.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    // A transformed ancestor scales client rects; the highlight lives in the container's space.
    const scale = origin.width ? container.offsetWidth / origin.width : 1;
    const selector = dividerSelector ? `${itemSelector}, ${dividerSelector}` : itemSelector;
    const items: MeasuredItem[] = [];
    const dividers: number[] = [];
    for (const el of container.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      const rect = {
        x: (r.left - origin.left) * scale + container.scrollLeft,
        y: (r.top - origin.top) * scale + container.scrollTop,
        width: r.width * scale,
        height: r.height * scale,
      };
      if (dividerSelector && el.matches(dividerSelector)) {
        dividers.push(axis === "x" ? rect.x + rect.width / 2 : rect.y + rect.height / 2);
      } else {
        items.push({
          rect,
          group: dividers.length,
          disabled: el.getAttribute("aria-disabled") === "true" || el.matches(":disabled"),
        });
      }
    }
    measured.current = { items, dividers };
  }, [ref, axis, itemSelector, dividerSelector]);

  const move = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const container = ref.current;
      if (!container) return;
      const origin = container.getBoundingClientRect();
      const scale = origin.width ? container.offsetWidth / origin.width : 1;
      const p = {
        x: (e.clientX - origin.left) * scale + container.scrollLeft,
        y: (e.clientY - origin.top) * scale + container.scrollTop,
      };
      const { items, dividers } = measured.current;
      const index = nearestItem(items, p, axis, groupAt(dividers, p, axis));
      setState((s) => {
        if (index === null) return s.shown ? { ...s, shown: false } : s;
        if (s.shown && s.index === index) return s;
        const rect = items[index]?.rect ?? null;
        return s.shown ? { ...s, index, rect } : { index, rect, shown: true, enters: s.enters + 1 };
      });
    },
    [ref, axis],
  );

  const hide = useCallback(() => setState((s) => (s.shown ? { ...s, shown: false } : s)), []);

  const onMouseEnter = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (!canHover()) return;
      measure();
      move(e);
    },
    [measure, move],
  );
  const onMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (measured.current.items.length === 0) return;
      move(e);
    },
    [move],
  );

  return {
    activeIndex: state.shown ? state.index : null,
    rect: state.rect,
    shown: state.shown,
    enters: state.enters,
    handlers: { onMouseEnter, onMouseMove, onMouseLeave: hide },
    hide,
    remeasure: measure,
  };
}
