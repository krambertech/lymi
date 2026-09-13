import { clsx } from "clsx";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface ToastProps {
  children: ReactNode;
  /** One action, usually Undo. */
  action?: { label: string; onClick: () => void } | undefined;
  /** Called after the exit transition. */
  onDismiss?: (() => void) | undefined;
  /** Auto-dismiss after this many ms. Pauses while the tab is hidden. Default scales with length. */
  duration?: number | undefined;
  className?: string | undefined;
  /** Static preview, no timers and no positioning. For the design page. */
  inline?: boolean | undefined;
}

/**
 * A strip in the text colour with one amber action. Undo lives here. It never blocks the page
 * and it never stacks: a new toast replaces the old one.
 */
export function Toast({ children, action, onDismiss, duration, className, inline }: ToastProps) {
  const [leaving, setLeaving] = useState(false);
  const [held, setHeld] = useState(false);
  const words = typeof children === "string" ? children.split(/\s+/).length : 6;
  const ms = duration ?? Math.max(4000, 1500 + words * 350);

  // The clock pauses while the tab is hidden and while the pointer or focus is on the toast,
  // so an Undo cannot leave under a hand reaching for it.
  const remaining = useRef(ms);
  useEffect(() => {
    if (inline || !onDismiss || held) return;
    let started = Date.now();
    const leave = () => {
      setLeaving(true);
      window.setTimeout(() => onDismiss(), 150);
    };
    let t = window.setTimeout(leave, Math.max(remaining.current, 800));
    const onVis = () => {
      if (document.hidden) {
        window.clearTimeout(t);
        remaining.current -= Date.now() - started;
      } else {
        started = Date.now();
        t = window.setTimeout(leave, Math.max(remaining.current, 800));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t);
      remaining.current -= Date.now() - started;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [onDismiss, inline, held]);

  return (
    <div
      role="status"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
      className={clsx(
        "flex w-fit max-w-[calc(100vw-32px)] items-center gap-3 rounded-md bg-text py-2.5 ps-4 pe-2 text-base text-canvas",
        !inline &&
          "fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] left-1/2 z-(--z-toast) -translate-x-1/2 @3xl/shell:bottom-6",
        !inline && (leaving ? "toast-exit" : "toast-enter"),
        className,
      )}
    >
      <span className="text-pretty">{children}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="relative -my-1 rounded-[6px] px-2.5 py-1.5 font-semibold text-toast-action transition-[background-color,scale] duration-150 hoverable:hover:bg-canvas/10 active:scale-[0.97] before:absolute before:-inset-x-1 before:-inset-y-2 before:content-['']"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
