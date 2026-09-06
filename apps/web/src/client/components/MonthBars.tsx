import { clsx } from "clsx";

export interface Month {
  /** Local YYYY-MM. */
  month: string;
  lit: number;
  /** Days elapsed. The current month counts up to today, not to its last day. */
  days: number;
}

const MONTH = new Intl.DateTimeFormat(undefined, { month: "short" });

function name(month: string): string {
  const [y, m] = month.split("-");
  return MONTH.format(new Date(Number(y), Number(m) - 1, 1));
}

/**
 * One bar per month, filled by the share of days with a review. The long view: whether the
 * habit is holding across seasons, where the thirty-day strip says how the last few weeks
 * went. Twelve at most, because a thirteenth stops being readable at this width.
 */
export function MonthBars({
  months,
  className,
}: {
  months: Month[];
  className?: string | undefined;
}) {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    // Twelve months do not fit on a phone at a width where the labels stay readable, so the
    // strip scrolls rather than squeezing them. On desktop the columns share the row evenly.
    <div className={clsx("-mx-1 overflow-x-auto px-1", className)}>
      <ul
        className="grid grid-flow-col auto-cols-[minmax(2.75rem,1fr)] gap-3"
        aria-label="Days reviewed each month"
      >
        {months.map((m) => {
          const share = m.days > 0 ? m.lit / m.days : 0;
          const partial = m.month === current;
          return (
            <li key={m.month} className="grid gap-2">
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-plate-2"
                role="img"
                aria-label={`${name(m.month)}: ${m.lit} of ${m.days} days${partial ? " so far" : ""}`}
              >
                {/* A month with one review should still show a mark rather than nothing. */}
                <i
                  className="block h-full rounded-full bg-amber"
                  style={{ width: m.lit > 0 ? `max(6px, ${share * 100}%)` : 0 }}
                />
              </div>
              {/* Wraps to a second line when the column is too narrow to hold both. */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-1.5">
                <span className="text-2xs font-medium text-text-2">{name(m.month)}</span>
                <span className="text-2xs text-muted tabular-nums">
                  {m.lit}/{m.days}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
