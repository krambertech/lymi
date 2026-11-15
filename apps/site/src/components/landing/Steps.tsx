import type { ReactNode } from "react";

export interface Step {
  id: string;
  title: ReactNode;
  body: ReactNode;
  /** What the step looks like, or what to copy. */
  after?: ReactNode;
}

/**
 * Setup a visitor follows in order, one plate per step. On wide screens the steps sit side by side
 * and share their rows, so each step's picture lines up with the others however the copy wraps.
 */
export function Steps({ steps }: { steps: readonly Step[] }) {
  return (
    <ol
      className="grid gap-4 @3xl:grid-flow-col @3xl:grid-rows-[auto_1fr_auto] @3xl:gap-x-4 @3xl:gap-y-0"
      style={{ gridAutoColumns: "minmax(0, 1fr)" }}
    >
      {steps.map((step, i) => (
        <li
          key={step.id}
          className="grid min-w-0 gap-3 rounded-2xl bg-plate p-5 edge @3xl:row-span-3 @3xl:grid-rows-subgrid @3xl:gap-0"
        >
          <h3 className="flex items-center gap-3 text-lg font-medium tracking-[-0.02em] text-ink">
            <span
              aria-hidden="true"
              className="grid size-7 shrink-0 place-items-center rounded-full bg-plate-nested text-sm text-ink-secondary tabular-nums"
            >
              {i + 1}
            </span>
            {step.title}
          </h3>
          <p className="text-md text-pretty text-ink-secondary @3xl:mt-2">{step.body}</p>
          <div className="mt-3 min-w-0 @3xl:mt-6">{step.after}</div>
        </li>
      ))}
    </ol>
  );
}
