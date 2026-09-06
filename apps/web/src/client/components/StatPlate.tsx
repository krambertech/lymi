import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * One number with the words that make it mean something. The note is not a caption: 91%
 * says nothing until the plate says you asked for 90, which is what keeps a grid of these
 * from being the dashboard the product does without.
 */
export function StatPlate({
  label,
  value,
  unit,
  figure,
  note,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Smaller text on the value's baseline: "/ 30 days", "cards". */
  unit?: ReactNode | undefined;
  /** The picture under the number. Optional, because not every number has one. */
  figure?: ReactNode | undefined;
  note: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={clsx("edge flex flex-col gap-3 rounded-xl bg-plate p-5", className)}>
      <h3 className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">{label}</h3>
      <p className="text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-text tabular-nums">
        {value}
        {unit && <span className="ml-1 text-lg font-normal text-muted">{unit}</span>}
      </p>
      {/* Every plate gives its figure the same box and centres it there, so a short strip
          and a tall chart leave the notes on one line across the grid instead of one plate
          padding itself out to match the others. */}
      <div className="flex h-[74px] items-center">{figure}</div>
      {/* A chip row is taller than a line of text; the shared box keeps the two on the
          same baseline across the grid. */}
      <div className="mt-auto flex min-h-[26px] items-center text-sm text-muted">{note}</div>
    </section>
  );
}
