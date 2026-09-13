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
    el.toggleAttribute("data-below", above < EDGE);
    el.style.left = `${left}px`;
    el.style.top = `${above < EDGE ? r.bottom + GAP : above}px`;

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
      <span className="sr-only" role="alert">
        {message}
      </span>
    </>
  );
}
