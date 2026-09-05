import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Lantern } from "./Lantern";

interface Props {
  title: ReactNode;
  /** Why it is empty and what to do. One sentence. */
  body?: ReactNode | undefined;
  action?: ReactNode | undefined;
  /** "lit" when something is waiting, "unlit" when nothing is, "none" for lists. */
  lantern?: "lit" | "unlit" | "none" | undefined;
  className?: string | undefined;
}

/** An empty screen is a first-run screen, not an error. */
export function EmptyState({ title, body, action, lantern = "unlit", className }: Props) {
  return (
    <section
      className={clsx(
        "flex flex-col items-center justify-center gap-2 py-10 text-center",
        className,
      )}
    >
      {lantern !== "none" && (
        <Lantern
          variant={lantern}
          flicker={lantern === "lit"}
          glow={lantern === "lit"}
          className="mb-4 size-28 @3xl:size-32"
        />
      )}
      <h2 className="text-3xl font-medium">{title}</h2>
      {body && <p className="max-w-[30ch] text-md text-muted">{body}</p>}
      {action && <div className="mt-5 flex gap-2">{action}</div>}
    </section>
  );
}
