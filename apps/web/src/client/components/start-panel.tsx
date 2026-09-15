import { clsx } from "clsx";
import type { ReactNode } from "react";

interface StartPanelProps {
  title: ReactNode;
  body?: ReactNode | undefined;
  /** Beside the title, e.g. the lantern. */
  lead?: ReactNode | undefined;
  /** The one thing to press. */
  action?: ReactNode | undefined;
  /** Further sections, each under a dashed rule, such as the other ways in. */
  children?: ReactNode;
  className?: string | undefined;
}

/**
 * Where an empty screen says how to fill it. Dashed, like New's mark, and on the bare canvas, so
 * it reads as a temporary panel rather than a plate of content. DESIGN.md, "Empty states".
 */
export function StartPanel({ title, body, lead, action, children, className }: StartPanelProps) {
  return (
    <section
      className={clsx(
        "grid gap-4 rounded-xl border-[1.5px] border-dashed border-edge-2 p-5",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {lead}
        <div className="grid min-w-0 gap-0.5">
          <h2 className="text-lg font-medium leading-snug text-balance">{title}</h2>
          {body && <p className="text-base text-text-2 text-pretty">{body}</p>}
        </div>
      </div>
      {action}
      {children}
    </section>
  );
}

interface StartPanelSectionProps {
  children: ReactNode;
}

/** A section of a start panel, under a dashed rule. */
export function StartPanelSection({ children }: StartPanelSectionProps) {
  return <div className="border-t border-dashed border-edge-2 pt-3">{children}</div>;
}
