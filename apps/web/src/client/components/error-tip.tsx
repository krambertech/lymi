import { CircleAlert } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import { Popover, PopoverContent } from "./ui/popover";

const SHOWN_MS = 4_000;

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
 * It is announced from a separate live region, because the popup's text is not in the page until shown.
 */
export function ErrorTip({ anchor, message }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(message !== null);
  }, [message]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const timer = window.setTimeout(close, SHOWN_MS);
    const events = ["pointerdown", "keydown", "scroll"] as const;
    for (const e of events) window.addEventListener(e, close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverContent
          anchor={anchor}
          initialFocus={false}
          finalFocus={false}
          aria-hidden="true"
          className="pointer-events-none flex items-start gap-2 leading-snug"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <span>{message}</span>
        </PopoverContent>
      </Popover>
      {/* Only while shown: it sits inside the word's line, and would otherwise be read with it. */}
      <span className="sr-only" role="alert">
        {open ? message : null}
      </span>
    </>
  );
}
