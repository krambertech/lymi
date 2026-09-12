import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

interface Props {
  known: number;
  learning: number;
  total: number;
  /** Averaged retrievability, 0 to 1. Adds the one sentence FSRS can say about a deck. */
  recall?: number | undefined;
  className?: string | undefined;
}

/**
 * How a deck's cards are split between known, learning and new, as one stripe in ink at
 * three opacities and the counts in words. It is the deck's shape, not its score: nothing here
 * says "complete", because a lesson is not a thing you complete, and nothing is green or amber,
 * because a state is a fact and not a state to press on.
 */
export function StateStripe({ known, learning, total, recall, className }: Props) {
  const { t, i18n } = useLingui();
  const fresh = Math.max(0, total - known - learning);
  const pct = (n: number) => (total > 0 ? `${(n / total) * 100}%` : "0%");
  return (
    <div className={clsx("@container grid gap-2", className)}>
      <div
        role="img"
        aria-label={t`${known} known, ${learning} learning, ${fresh} new`}
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-text/12"
      >
        <i className="block h-full bg-text" style={{ width: pct(known) }} />
        <i className="block h-full bg-text/40" style={{ width: pct(learning) }} />
      </div>
      <p className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1 text-sm text-muted tabular-nums">
        <span>
          <Trans>
            <b className="font-medium text-text-2">{known}</b> known
          </Trans>
        </span>
        <span>
          <Trans>
            <b className="font-medium text-text-2">{learning}</b> learning
          </Trans>
        </span>
        <span>
          <Trans>
            <b className="font-medium text-text-2">{fresh}</b> new
          </Trans>
        </span>
        {recall !== undefined && total > 0 && (
          <span className="basis-full @md:ms-auto @md:basis-auto">
            <Trans>
              about {i18n.number(recall, { style: "percent", maximumFractionDigits: 0 })} would come
              back today
            </Trans>
          </span>
        )}
      </p>
    </div>
  );
}
