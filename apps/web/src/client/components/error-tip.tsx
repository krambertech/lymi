import { CircleAlert, type LucideIcon } from "lucide-react";
import { type ComponentProps, type RefObject, useEffect, useState } from "react";
import { Popover, PopoverContent } from "./ui/popover";

const SHOWN_MS = 4_000;

interface Props {
  /** The control that failed or cannot act. The tip points at it. */
  anchor: RefObject<HTMLElement | null>;
  /** Shows the tip when it becomes non-null. A new failure after a retry shows it again. */
  message: string | null;
  /** Shows the same message again each time it changes, as a second press of the same control. */
  nudge?: number | undefined;
  /**
   * Why the control is unavailable rather than what went wrong: its own icon, in `muted`, read out
   * politely instead of as an alert.
   */
  reason?: LucideIcon | undefined;
  /** How far over the control the tip sits, to clear something else standing there. */
  sideOffset?: ComponentProps<typeof PopoverContent>["sideOffset"];
  /** Told when the tip shows and goes, so the control's own tooltip can stand aside. */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

/**
 * What went wrong, or why a control cannot act, over that control instead of a line of text that
 * pushes the layout down. It leaves on its own after four seconds, or at the next tap, key or scroll.
 *
 * It is announced from a separate live region, because the popup's text is not in the page until shown.
 */
export function ErrorTip({ anchor, message, nudge = 0, reason, sideOffset, onOpenChange }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new nudge reopens the same message.
  useEffect(() => {
    setOpen(message !== null);
  }, [message, nudge]);

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

  const Icon = reason ?? CircleAlert;
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverContent
          // A fresh tip per press, so it places itself again around whatever arrived meanwhile.
          key={nudge}
          anchor={anchor}
          sideOffset={sideOffset}
          initialFocus={false}
          finalFocus={false}
          aria-hidden="true"
          className="pointer-events-none flex items-start gap-2 leading-snug"
        >
          <Icon
            className={
              reason ? "mt-0.5 size-4 shrink-0 text-muted" : "mt-0.5 size-4 shrink-0 text-danger"
            }
            aria-hidden="true"
          />
          <span>{message}</span>
        </PopoverContent>
      </Popover>
      {/* Only while shown: it sits inside the word's line, and would otherwise be read with it. */}
      <span className="sr-only" role={reason ? "status" : "alert"}>
        {open ? message : null}
      </span>
    </>
  );
}
