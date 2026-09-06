import { clsx } from "clsx";
import { type ReactNode, useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode | undefined;
  /** Buttons. Primary last. Keep a destructive action away from "Confirm". */
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

/**
 * Native dialog, centred, focus trapped by the platform. Used rarely: Lymi prefers Undo to
 * asking. Reach for it only when there is no way back.
 */
export function Dialog({ open, onClose, title, children, actions, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog already closes on Escape; this click only catches the backdrop
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        // `sheet-modal` carries the enter and the exit, shared with the desktop shape of Sheet.
        "sheet-modal edge-2 m-auto w-[min(92vw,420px)] rounded-lg bg-plate p-0 text-text",
        className,
      )}
    >
      <div className="grid gap-3 p-5">
        <h2 id={titleId} className="text-lg font-medium">
          {title}
        </h2>
        {children && <div className="text-base text-text-2">{children}</div>}
        {actions && <div className="mt-2 flex justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  );
}
