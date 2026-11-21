import { type PointerEvent, useRef, useState } from "react";

/** Something held under the pointer: what it is, where the pointer is, and where it held it. */
export interface Lift<T> {
  value: T;
  x: number;
  y: number;
  /** Where the pointer held it, so it doesn't jump under the finger. */
  dx: number;
  dy: number;
  moved: boolean;
}

/**
 * Pointer drag for tiles and words, by mouse, pen or finger. A press that barely moves is a tap; one
 * that moves is a drag, dropped where the pointer lets go. The drag lives in a ref, so pointer events
 * arriving faster than React renders see where it is; `lift` mirrors it for drawing.
 */
export function useLift<T>({
  disabled,
  onTap,
  onMove,
  onDrop,
}: {
  disabled?: boolean;
  onTap: (value: T) => void;
  onMove?: (value: T, x: number, y: number) => void;
  onDrop: (value: T, x: number, y: number) => void;
}) {
  const drag = useRef<Lift<T> | null>(null);
  const [lift, setLift] = useState<Lift<T> | null>(null);
  const end = () => {
    drag.current = null;
    setLift(null);
  };
  const start = (value: T) => (event: PointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0) return;
    // No text selection or focus ring from a drag.
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      value,
      x: event.clientX,
      y: event.clientY,
      dx: event.clientX - box.left,
      dy: event.clientY - box.top,
      moved: false,
    };
    setLift(drag.current);
  };
  const handlers = {
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const now = drag.current;
      if (!now) return;
      const moved = now.moved || Math.hypot(event.clientX - now.x, event.clientY - now.y) > 6;
      drag.current = { ...now, x: event.clientX, y: event.clientY, moved };
      setLift(drag.current);
      if (moved) onMove?.(now.value, event.clientX, event.clientY);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const now = drag.current;
      end();
      if (!now) return;
      if (now.moved) onDrop(now.value, event.clientX, event.clientY);
      else onTap(now.value);
    },
    onPointerCancel: end,
  };
  return { lift, start, handlers };
}

/**
 * A pointer's taps are handled as it lifts, so a drag never also counts as a tap; a click with no
 * pointer behind it (detail 0) is a keyboard's Enter or Space.
 */
export const fromKeyboard = (event: { detail: number }) => event.detail === 0;

/** The element under a point that carries `attribute`, and that attribute's value. */
export function targetAt(x: number, y: number, attribute: string): string | null {
  const found = document.elementFromPoint(x, y)?.closest(`[${attribute}]`);
  return found?.getAttribute(attribute) ?? null;
}
