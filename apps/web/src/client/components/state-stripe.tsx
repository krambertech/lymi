import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

interface Props {
  known: number;
  learning: number;
  total: number;
  /** The counts in words under the stripe. Off where a filter right below already names them. */
  legend?: boolean | undefined;
  className?: string | undefined;
}

/** State colours, shared with `StateChip` and the deck filter. */
export const stateDot = {
  new: "bg-state-new",
  learning: "bg-state-learning",
  known: "bg-state-known",
} as const;

/**
 * How a deck's cards are split between new, learning and known, as one stripe that fills left to
 * right as cards move along. It is the deck's shape, not its score: nothing here says "complete",
 * because a lesson is not a thing you complete.
 */
export function StateStripe({ known, learning, total, legend = true, className }: Props) {
  const { t } = useLingui();
  const fresh = Math.max(0, total - known - learning);
  const segments = [
    { key: "new", n: fresh, cls: stateDot.new },
    { key: "learning", n: learning, cls: stateDot.learning },
    { key: "known", n: known, cls: stateDot.known },
  ].filter((s) => s.n > 0);
  return (
    <div className={clsx("grid gap-2", className)}>
      <div
        role="img"
        aria-label={t`${fresh} new, ${learning} learning, ${known} known`}
        className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {segments.map((s) => (
          <i
            key={s.key}
            className={clsx("block h-full rounded-full", s.cls)}
            style={{ flexGrow: s.n }}
          />
        ))}
      </div>
      {legend && (
        <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <i className={clsx("size-1.5 rounded-full", stateDot.new)} aria-hidden="true" />
            <Trans>
              <b className="font-medium text-text-2">{fresh}</b> new
            </Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className={clsx("size-1.5 rounded-full", stateDot.learning)} aria-hidden="true" />
            <Trans>
              <b className="font-medium text-text-2">{learning}</b> learning
            </Trans>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className={clsx("size-1.5 rounded-full", stateDot.known)} aria-hidden="true" />
            <Trans>
              <b className="font-medium text-text-2">{known}</b> known
            </Trans>
          </span>
        </p>
      )}
    </div>
  );
}
