import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const DELAY = 500;
/** Moving from one control to the next inside this window skips the delay and the fade. */
const WARM = 400;
const GAP = 6;
const MARGIN = 8;

let lastClosed = 0;

interface TriggerHandlers {
  onPointerEnter: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: (e: FocusEvent<HTMLElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

/**
 * A visual name for a control whose accessible name it repeats, so the bubble is hidden from
 * assistive technology. Mouse hover after a pause, or keyboard focus at once; never on touch.
 * It is a manual popover, so it sits in the top layer above sheets and dialogs.
 */
export function useTooltip(label: string, { disabled }: { disabled?: boolean | undefined } = {}) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen((was) => {
      if (was) lastClosed = performance.now();
      return false;
    });
  }, []);

  const show = useCallback(
    (immediate: boolean) => {
      if (disabled) return;
      window.clearTimeout(timer.current);
      const warm = performance.now() - lastClosed < WARM;
      if (immediate || warm) {
        setInstant(warm);
        setOpen(true);
        return;
      }
      timer.current = window.setTimeout(() => {
        setInstant(false);
        setOpen(true);
      }, DELAY);
    },
    [disabled],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  // Shown before it is measured, since a closed popover has no size; placed before paint.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    const trigger = triggerRef.current;
    if (!bubble || !trigger) return;
    if (!open) {
      if (bubble.matches(":popover-open")) bubble.hidePopover();
      return;
    }
    if (!bubble.matches(":popover-open")) bubble.showPopover();
    const t = trigger.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const below = t.bottom + GAP + b.height + MARGIN <= window.innerHeight;
    const left = Math.min(
      Math.max(MARGIN, t.left + t.width / 2 - b.width / 2),
      window.innerWidth - b.width - MARGIN,
    );
    bubble.style.left = `${left}px`;
    bubble.style.top = `${below ? t.bottom + GAP : t.top - GAP - b.height}px`;
    bubble.dataset.side = below ? "bottom" : "top";
    const close = () => hide();
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open, hide]);

  const handlers: TriggerHandlers = {
    onPointerEnter: (e) => {
      if (e.pointerType === "mouse") show(false);
    },
    onPointerLeave: () => hide(),
    // Pressing the control is the answer to what it does; the name would only cover the result.
    onPointerDown: () => hide(),
    onFocus: (e) => {
      if (e.currentTarget.matches(":focus-visible")) show(true);
    },
    onBlur: () => hide(),
    onKeyDown: (e) => {
      if (e.key === "Escape" && open) hide();
    },
  };

  const bubble =
    typeof document === "undefined"
      ? null
      : createPortal(
          <div
            ref={bubbleRef}
            popover="manual"
            aria-hidden="true"
            data-instant={instant || undefined}
            className="tooltip"
          >
            {label}
          </div>,
          document.body,
        );

  return { triggerRef, handlers, bubble: bubble as ReactNode };
}

/** Calls every handler that was given, in order. */
export function chain<E>(...fns: (((e: E) => void) | undefined)[]) {
  return (e: E) => {
    for (const fn of fns) fn?.(e);
  };
}
