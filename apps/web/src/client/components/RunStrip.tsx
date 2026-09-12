import { clsx } from "clsx";

export interface Day {
  /** Local YYYY-MM-DD. */
  date: string;
  lit: boolean;
}

/**
 * A stretch of days, lit or not, with consecutive lit days joined into one capsule. The
 * joining is the whole point: a row of separate marks has to be counted, where an unbroken
 * capsule is a run whose length you can see. Same material as `SevenLights` — the lantern
 * glass, amber when lit — at the size a month needs.
 *
 * Lit or unlit and nothing else. Grading a day by how many cards it held turns a habit
 * picture into a scoreboard, and makes a heavy Tuesday look better than a steady one.
 */
export function RunStrip({
  days,
  className,
  label,
}: {
  days: Day[];
  className?: string | undefined;
  /** Overrides the generated description. */
  label?: string | undefined;
}) {
  const lit = days.filter((d) => d.lit).length;
  if (days.length === 0) return null;
  const runs: { from: number; to: number; lit: boolean }[] = [];
  days.forEach((d, i) => {
    const last = runs.at(-1);
    if (last && last.lit === d.lit && d.lit) last.to = i;
    else runs.push({ from: i, to: i, lit: d.lit });
  });

  return (
    <div
      className={clsx("flex h-10 w-full items-stretch", className)}
      role="img"
      aria-label={label ?? `Reviewed on ${lit} of the last ${days.length} days`}
    >
      {runs.map((r) => {
        const span = r.to - r.from + 1;
        return (
          <i
            key={days[r.from]?.date ?? r.from}
            // Width by share of the whole, so a day is the same width wherever it sits.
            // The 2 px comes off each run, which is the separator between them.
            style={{ width: `calc(${(span / days.length) * 100}% - 2px)`, marginRight: 2 }}
            // The hairline is inset: `edge` draws outside the box, which would make an
            // unlit day a pixel taller and wider than a lit one all down the strip.
            className={clsx(
              "block rounded-[4px_4px_5px_5px]",
              r.lit ? "bg-amber" : "edge-inset bg-plate-2",
            )}
          />
        );
      })}
    </div>
  );
}
