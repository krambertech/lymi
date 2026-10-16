import { Plural, Trans } from "@lingui/react/macro";
import { Button } from "./button";

/** The due cards shown, or every started card shown with the rest reviewed early. */
export type FilterReviewKind = "due" | "all";

export interface FilterReviewProps {
  /** Every card the filter shows, new ones too. */
  shown: number;
  /** Started cards it shows that today's review has not reached yet. */
  started: number;
  /** Of those, the ones due before the day ends. */
  due: number;
  onReview: (kind: FilterReviewKind) => void;
}

/**
 * One line under a deck's filters while they narrow the list: how many cards it shows and how
 * many are due, with quiet ways to review them. The plate's Review stays the page's one primary.
 */
export function FilterReview({ shown, started, due, onReview }: FilterReviewProps) {
  if (shown === 0) return null;
  const early = started > due;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="me-auto flex items-center gap-2 text-sm text-text-2">
        <span className="font-medium text-text">
          <Plural value={shown} one="# card" other="# cards" />
        </span>
        <span aria-hidden="true" className="text-faint">
          ·
        </span>
        <span>
          {due > 0 ? (
            <Plural value={due} one="# due today" other="# due today" />
          ) : (
            <Trans>None due today</Trans>
          )}
        </span>
      </p>
      {started > 0 && (
        <div className="flex items-center gap-2">
          {early && (
            // No count: cards reviewed today and new cards are left out, so a number would disagree with the line.
            <Button
              size="sm"
              variant={due > 0 ? "ghost" : "secondary"}
              onClick={() => onReview("all")}
            >
              <Trans>Review all</Trans>
            </Button>
          )}
          {due > 0 && (
            <Button size="sm" onClick={() => onReview("due")}>
              <Plural value={due} one="Review # due" other="Review # due" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
