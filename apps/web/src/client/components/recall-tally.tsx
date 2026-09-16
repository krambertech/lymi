import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

/** Past this, the marks are too thin to count, so the tally draws as shares instead. */
const COUNTABLE = 60;

/**
 * What a recall percentage is made of: one mark per graded review, remembered first, the
 * forgotten ones darker at the end. Drawn while there are too few weeks to have a trend,
 * because a rate hides its sample size and the sample size is the whole reason an early
 * figure swings.
 *
 * A tally, not a timeline. The API returns totals rather than the order they happened in,
 * so the marks are grouped and never claim to be a sequence.
 *
 * Ink at two weights, like every other figure on Insights. The forgotten marks carry the
 * heavier one because they are what the number is asking you to notice.
 */
export function RecallTally({
  passed,
  failed,
  className,
}: {
  passed: number;
  failed: number;
  className?: string | undefined;
}) {
  const { t } = useLingui();
  const graded = passed + failed;
  if (graded === 0) return null;

  const label = t`${passed} remembered, ${failed} forgotten`;
  const tone = (ok: boolean) => (ok ? "bg-text/25" : "bg-text/70");

  if (graded > COUNTABLE) {
    return (
      <div
        className={clsx("flex h-7 w-full gap-1", className)}
        role="img"
        aria-label={label}
        // Shares rather than marks: past sixty, individual marks are thinner than the gap
        // between them and stop being countable, which is the only thing they were for.
      >
        {[true, false]
          .filter((ok) => (ok ? passed : failed) > 0)
          .map((ok) => (
            <i
              key={String(ok)}
              className={clsx("block rounded-[3px]", tone(ok))}
              style={{ flexGrow: ok ? passed : failed }}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={clsx("flex h-7 w-full items-stretch gap-[3px]", className)}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: graded }, (_, i) => i < passed).map((ok, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a mark is a count, with no identity beyond its place
        <i key={i} className={clsx("block max-w-[14px] flex-1 rounded-[3px]", tone(ok))} />
      ))}
    </div>
  );
}
