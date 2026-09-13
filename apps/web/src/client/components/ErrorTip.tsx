import { CircleAlert } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";

const SHOWN_MS = 4_000;
const GAP = 8;
const EDGE = 12;

interface Props {
  /** The control that failed. The tip points at it. */
  anchor: RefObject<HTMLElement | null>;
  /** Shows the tip when it becomes non-null. A new failure after a retry shows it again. */
  message: string | null;
}

/**
 * What went wrong, over the control it went wrong on, instead of a line of text that pushes the
 * layout down. It leaves on its own after four seconds, or at the next tap, key or scroll.
 *
 * A popover, so it sits in the top layer and no card's overflow or transform can clip it. It is
 * announced from a separate live region, because a popover's text is not in the page until shown.
 */
export function ErrorTip({ anchor, message }: Props) {
  const tip = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(message !== null);
  }, [message]);

  useEffect(() => {
    const el = tip.current;
    const target = anchor.current;
    if (!open || !el || !target) return;
    el.showPopover();
    const r = target.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(
      Math.max(r.left + r.width / 2 - w / 2, EDGE),
      window.innerWidth - w - EDGE,
    );
    const above = r.top - h - GAP;
    const below = above < EDGE;
    el.toggleAttribute("data-below", below);
    el.style.left = `${left}px`;
    el.style.top = `${below ? r.bottom + GAP : above}px`;
    // Enter from the control's side, mirroring the exit in styles.css.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.animate(
      [
        { opacity: 0, transform: still ? "none" : `translateY(${below ? -4 : 4}px) scale(0.98)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );

    const close = () => setOpen(false);
    const timer = window.setTimeout(close, SHOWN_MS);
    const events = ["pointerdown", "keydown", "scroll"] as const;
    for (const e of events) window.addEventListener(e, close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, close, { capture: true });
      window.removeEventListener("resize", close);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [open, anchor]);

  return (
    <>
      {/* A span, and wrapping reset, because it can sit inside a line of text. */}
      <span
        ref={tip}
        popover="manual"
        aria-hidden="true"
        className="error-tip edge-2 w-max max-w-64 items-start gap-2 rounded-md bg-plate px-3 py-2 text-start text-sm font-normal leading-snug tracking-normal whitespace-normal hyphens-manual text-text [overflow-wrap:normal] [&:popover-open]:flex"
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <span>{message}</span>
      </span>
      {/* Only while shown: it sits inside the word's line, and would otherwise be read with it. */}
      <span className="sr-only" role="alert">
        {open ? message : null}
      </span>
    </>
  );
}
