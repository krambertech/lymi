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
  control,
  note,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Smaller text on the value's baseline: "/ 30 days", "cards". */
  unit?: ReactNode | undefined;
  /** The picture under the number. Optional, because not every number has one. */
  figure?: ReactNode | undefined;
  /**
   * A control that changes this plate's figure, on the label row. Scoped to the plate on
   * purpose: in the page header the same control reads as a filter for the whole screen.
   * The row keeps its height whether or not a plate has one, so the grid stays aligned.
   */
  control?: ReactNode | undefined;
  note: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={clsx("edge flex flex-col gap-3 rounded-xl bg-plate p-5", className)}>
      {/* 34 px is the segmented control at `sm` plus its track padding. Fixed so a plate
          with a control and one without still line up across the grid. */}
      <div className="flex min-h-[34px] flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h3 className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">{label}</h3>
        {control}
      </div>
      <p className="text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-text tabular-nums">
        {value}
        {unit && <span className="ms-1 text-lg font-normal text-muted">{unit}</span>}
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
