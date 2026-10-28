import { clsx } from "clsx";
import { ArrowRight, CornerDownLeft, Hourglass, Moon, Sprout, X } from "lucide-react";

const cell = "size-2.5 shrink-0 rounded-[3px] sm:size-3.5";

/**
 * A forgotten card and how many other attempts pass before it is back. The dashed cells are the
 * jitter: the gap can land on any of them, so returns do not arrive in a visible rhythm.
 */
export function ReturnGaps({ gap, jitter }: { gap: number; jitter: number }) {
  return (
    <ol className="grid list-none gap-3 !ps-0" aria-label="How long a forgotten card waits">
      <li className="!m-0 grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
        <p className="!m-0 flex items-center gap-1.5 text-sm text-ink">
          <X aria-hidden="true" strokeWidth={2.5} className="size-3.5 text-grade-forgot" />
          Forgot
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 sm:gap-1">
          <span className="sr-only">
            Back after {gap - jitter} to {gap + jitter} other attempts.
          </span>
          {Array.from({ length: gap + jitter }, (_, j) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: cells are positions
              key={j}
              aria-hidden="true"
              className={clsx(
                cell,
                j < gap - jitter ? "bg-edge-strong" : "border border-dashed border-edge-strong",
              )}
            />
          ))}
          <ArrowRight aria-hidden="true" className="mx-1 size-3.5 text-ink-faint" />
          <span
            aria-hidden="true"
            className="flex items-center gap-1 rounded-xs bg-state-learning-soft px-1.5 py-0.5 text-xs font-medium text-state-learning-text"
          >
            <CornerDownLeft className="size-3" />
            Return
          </span>
          <span aria-hidden="true" className="ms-1 text-xs tabular-nums text-ink-muted">
            {gap} ± {jitter}
          </span>
        </div>
      </li>
      <li className="!m-0 grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
        <p className="!m-0 flex items-center gap-1.5 text-sm text-ink">
          <X aria-hidden="true" strokeWidth={2.5} className="size-3.5 text-grade-forgot" />
          Forgot again
        </p>
        <p className="!m-0 flex items-center gap-1.5 text-sm text-ink-muted">
          <Moon aria-hidden="true" className="size-3.5" />
          Back tomorrow
        </p>
      </li>
    </ol>
  );
}

/**
 * The first ordinary draws of a day. Returns and cards left learning are served between them
 * without moving this pattern, because they do not count toward it.
 */
export function SlotPattern({
  newEvery,
  oldestEvery,
  length,
}: {
  newEvery: number;
  oldestEvery: number;
  length: number;
}) {
  const slots = Array.from({ length }, (_, i) => {
    const newSlot = (i + 1) % newEvery === 0;
    const oldest = newSlot && ((i + 1) / newEvery) % oldestEvery === 0;
    return { newSlot, oldest };
  });
  const name = (s: (typeof slots)[number]) =>
    s.oldest
      ? "the oldest unseen card"
      : s.newSlot
        ? "a new card, recent ones likelier"
        : "a review";
  return (
    <div>
      <ol
        className="grid list-none grid-cols-10 gap-1.5 !ps-0 sm:grid-cols-20"
        aria-label={`The first ${length} ordinary draws`}
      >
        {slots.map((s, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions
            key={i}
            aria-label={`Draw ${i + 1}: ${name(s)}`}
            className="relative !m-0 grid aspect-[3/4] place-items-center overflow-hidden rounded-xs bg-plate-nested"
          >
            {s.oldest ? (
              <Hourglass aria-hidden="true" className="size-3.5 text-ink-secondary" />
            ) : s.newSlot ? (
              <Sprout aria-hidden="true" className="size-3.5 text-ink-secondary" />
            ) : null}
            <span
              aria-hidden="true"
              className={clsx(
                "absolute inset-x-0 bottom-0 h-1",
                s.newSlot ? "bg-state-new" : "bg-state-known",
              )}
            />
          </li>
        ))}
      </ol>
      <ul className="mt-4 flex list-none flex-wrap gap-x-5 gap-y-2 !ps-0 text-xs text-ink-muted">
        <li className="!m-0 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="relative size-4 overflow-hidden rounded-[3px] bg-plate-nested"
          >
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-state-known" />
          </span>
          Review, weighted by recall
        </li>
        <li className="!m-0 flex items-center gap-1.5">
          <Sprout aria-hidden="true" className="size-3.5 text-ink-secondary" />
          New card, weighted toward recent
        </li>
        <li className="!m-0 flex items-center gap-1.5">
          <Hourglass aria-hidden="true" className="size-3.5 text-ink-secondary" />
          Oldest unseen card
        </li>
      </ul>
    </div>
  );
}
