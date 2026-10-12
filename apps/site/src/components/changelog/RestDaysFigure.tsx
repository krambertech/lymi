import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

/** Two weeks of the streak calendar: lit days, one rest day bridged by a dashed band, then today. */
const WEEKS: ("lit" | "rest" | "today" | "later")[][] = [
  ["lit", "lit", "lit", "rest", "lit", "lit", "lit"],
  ["lit", "lit", "lit", "lit", "rest", "today", "later"],
];

function Flame() {
  return (
    <svg viewBox="0 0 24 32" className="h-9 w-7" aria-hidden="true">
      <path d="M12 1C7 9 2 14 2 21a10 10 0 0 0 20 0c0-7-5-12-10-20Z" fill="var(--amber)" />
      <path
        d="M12 15c-2.5 3.5-5 5.5-5 8.5a5 5 0 0 0 10 0c0-3-2.5-5-5-8.5Z"
        fill="var(--flame-core)"
      />
    </svg>
  );
}

/** The streak carrying on through a rest day. */
export function RestDaysFigure() {
  const { i18n } = useLingui();
  // A Monday, so the header reads in the reader's own short weekday names.
  const monday = new Date(Date.UTC(2026, 8, 7));
  const weekdays = Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(i18n.locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(monday.getTime() + day * 86_400_000),
    ),
  );

  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px] rounded-xl bg-plate p-5 edge">
      <div className="flex items-end gap-3">
        <Flame />
        <span className="text-5xl leading-none font-medium tracking-[-0.03em] text-text">11</span>
        <span className="pb-1 text-base text-text-2">
          <Trans>days in a row</Trans>
        </span>
      </div>
      <p className="mt-2 text-sm text-text-2">
        <Trans>Yesterday was a rest day.</Trans>
      </p>
      <div className="mt-5 grid grid-cols-7 gap-y-2 text-center">
        {weekdays.map((name, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: narrow weekday names repeat, so the index is the identity
          <span key={index} className="pb-1 text-xs text-muted">
            {name}
          </span>
        ))}
        {WEEKS.flatMap((week, row) =>
          week.map((day, column) => {
            const run = day === "lit" || day === "rest";
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed drawing, so the place is the identity
                key={`${row}-${column}`}
                className={clsx(
                  "relative flex h-10 items-center justify-center",
                  run && "bg-amber-soft",
                  run && column === 0 && "rounded-s-full",
                  run && (column === 6 || week[column + 1] === "today") && "rounded-e-full",
                )}
              >
                {day === "rest" ? (
                  <span className="absolute inset-x-0 inset-y-1 border-y-2 border-dashed border-amber" />
                ) : (
                  <span
                    className={clsx(
                      "relative size-8 rounded-full",
                      day === "lit" && "border-2 border-amber bg-plate",
                      day === "today" && "border-2 border-edge-2",
                      day === "later" && "border border-dashed border-edge-2",
                    )}
                  />
                )}
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}
