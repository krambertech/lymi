import { clsx } from "clsx";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

/** Do and don't, side by side: a do comes first and its don't sits beside it on a wide page. */
export function Rules({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-5 gap-y-10 @2xl:grid-cols-2">{children}</div>;
}

/** The round mark and the word that open a rule, in success or danger. `bare` drops the word. */
export function Verdict({ kind, bare }: { kind: "do" | "dont"; bare?: boolean | undefined }) {
  const Icon = kind === "do" ? Check : X;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        kind === "do" ? "text-success" : "text-danger",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "grid size-[18px] place-items-center rounded-full text-canvas",
          kind === "do" ? "bg-success" : "bg-danger",
        )}
      >
        <Icon className="size-3" strokeWidth={3} />
      </span>
      {!bare && (kind === "do" ? "Do" : "Don’t")}
    </span>
  );
}

/**
 * One rule. With children it is a picture: the example on the room's canvas, a bar in the rule's
 * colour under it, then the verdict and what it means. Without children it is a line of text.
 */
export function Rule({
  kind,
  title,
  children,
  note,
  className,
}: {
  kind: "do" | "dont";
  title: ReactNode;
  /** The example. Left out for a rule that a picture would not make clearer. */
  children?: ReactNode | undefined;
  note?: ReactNode | undefined;
  /** For the example's frame, such as a different alignment. */
  className?: string | undefined;
}) {
  const words = (
    <div className="grid gap-1">
      <Verdict kind={kind} />
      <p className="text-base font-medium text-pretty text-ink">{title}</p>
      {note && <p className="max-w-[62ch] text-sm text-pretty text-ink-muted">{note}</p>}
    </div>
  );
  if (!children)
    return <div className="edge content-start rounded-lg bg-plate px-4 py-3.5">{words}</div>;
  return (
    <figure className="grid content-start gap-3">
      <div className="grid gap-0">
        <div
          className={clsx(
            "@container edge flex min-h-40 flex-wrap items-center justify-center gap-3 overflow-hidden rounded-t-lg bg-canvas p-6 text-ink",
            className,
          )}
        >
          {children}
        </div>
        <div
          aria-hidden="true"
          className={clsx("h-1 rounded-b-lg", kind === "do" ? "bg-success" : "bg-danger")}
        />
      </div>
      <figcaption className="px-0.5">{words}</figcaption>
    </figure>
  );
}
