import { clsx } from "clsx";
import { type ReactNode, useEffect, useState } from "react";

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
  const words = typeof children === "string" ? children.split(/\s+/).length : 6;
  const ms = duration ?? Math.max(4000, 1500 + words * 350);

  useEffect(() => {
    if (inline || !onDismiss) return;
    let remaining = ms;
    let started = Date.now();
    const leave = () => {
      setLeaving(true);
      window.setTimeout(() => onDismiss(), 150);
    };
    let t = window.setTimeout(leave, remaining);
    const onVis = () => {
      if (document.hidden) {
        window.clearTimeout(t);
        remaining -= Date.now() - started;
      } else {
        started = Date.now();
        t = window.setTimeout(leave, Math.max(remaining, 800));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms, onDismiss, inline]);

  return (
    <div
      role="status"
      className={clsx(
        "flex w-fit max-w-[calc(100vw-32px)] items-center gap-3 rounded-md bg-text py-2.5 pl-4 pr-2 text-base text-canvas",
        !inline &&
          "fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] left-1/2 z-(--z-toast) -translate-x-1/2 @3xl:bottom-6",
        !inline && (leaving ? "toast-exit" : "toast-enter"),
        className,
      )}
    >
      <span className="text-pretty">{children}</span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="relative -my-1 rounded-[6px] px-2.5 py-1.5 font-semibold text-toast-action transition-[background-color,scale] duration-150 hoverable:hover:bg-canvas/10 active:scale-[0.97] before:absolute before:-inset-1 before:content-['']"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
