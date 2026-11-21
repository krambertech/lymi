import type { ReactNode } from "react";

/**
 * A door sign with opening hours, written the way Estonian shops write them: days as their capital
 * letters, hours on the 24-hour clock, and suletud for closed. Its text is Estonian.
 */
export function OpeningHours({
  name,
  rows,
  caption,
}: {
  /** What the sign says above the hours, such as avatud or a café's name. */
  name: string;
  /** Days and hours, such as ["E–R", "9–18"] or ["P", "suletud"]. */
  rows: readonly (readonly [days: string, hours: string])[];
  /** What the sign is, in the reader's language. */
  caption: ReactNode;
}) {
  return (
    <figure className="m-0 grid justify-items-center gap-2">
      <div
        lang="et"
        className="grid w-full max-w-64 gap-1.5 rounded-lg bg-ink px-5 pt-3.5 pb-4 text-canvas shadow-(--learn-lift)"
      >
        <span className="text-center text-sm font-semibold tracking-[0.12em] uppercase">
          {name}
        </span>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xl font-semibold tabular-nums">
          {rows.map(([days, hours]) => (
            <div key={days} className="contents">
              <dt>{days}</dt>
              <dd className="m-0 text-end">{hours}</dd>
            </div>
          ))}
        </dl>
      </div>
      <figcaption className="text-sm text-ink-secondary">{caption}</figcaption>
    </figure>
  );
}
