import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Lantern } from "./Lantern";

interface Props {
  title: ReactNode;
  /** Why it is empty and what to do. One sentence. */
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
  /**
   * "lit" flickers, "still" holds still, "none" is for lists. Never out: an empty screen says
   * nothing about the streak.
   */
  lantern?: "lit" | "still" | "none" | undefined;
  className?: string | undefined;
}

/** An empty screen is a first-run screen, not an error. */
export function EmptyState({ title, body, action, lantern = "still", className }: Props) {
  return (
    <section
      className={clsx(
        "flex flex-col items-center justify-center gap-2 py-10 text-center",
        className,
      )}
    >
      {lantern !== "none" && (
        <Lantern flicker={lantern === "lit"} className="mb-4 size-28 @3xl:size-32" />
      )}
      <h2 className="text-3xl font-medium">{title}</h2>
      {body && <p className="max-w-[30ch] text-md text-muted">{body}</p>}
      {action && <div className="mt-5 flex gap-2">{action}</div>}
    </section>
  );
}

/**
 * An empty group inside a screen, e.g. no API keys yet. One icon, one line of why, and the
 * action that fills it; the lantern stays for whole screens.
 */
export function EmptySection({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="edge flex flex-col items-center gap-1.5 rounded-md bg-plate px-5 py-7 text-center">
      <span
        className="mb-2 grid size-11 place-items-center rounded-full bg-plate-2 text-text-2 [&_svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="text-base font-medium text-text">{title}</h3>
      {body && <p className="max-w-[38ch] text-sm text-muted">{body}</p>}
      {action && <div className="mt-3 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
