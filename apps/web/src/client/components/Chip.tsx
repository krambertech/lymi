import { clsx } from "clsx";
import type { ReactNode } from "react";

type Tone = "default" | "new" | "known" | "ai";

const tones: Record<Tone, string> = {
  default: "bg-bg text-ink-2 border-border",
  new: "bg-amber-soft text-amber-text border-transparent",
  known: "bg-good-soft text-good border-transparent",
  ai: "bg-bg text-muted border-border",
};

export function Chip({
  tone = "default",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full border text-[12.5px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <i className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Maps FSRS state to the chip the UI shows. 0 New, 1 Learning, 2 Review (Known), 3 Relearning. */
export function StateChip({ state }: { state: number | null | undefined }) {
  if (state === 2)
    return (
      <Chip tone="known" dot>
        Known
      </Chip>
    );
  if (state === 0 || state == null)
    return (
      <Chip tone="new" dot>
        New
      </Chip>
    );
  return <Chip>Learning</Chip>;
}
