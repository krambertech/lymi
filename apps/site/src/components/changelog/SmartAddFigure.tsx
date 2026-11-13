import { Plural, Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { buttonClass } from "../Button";

const TERMS = [
  { term: "kohvik", gloss: <Trans>café</Trans>, ticked: true },
  { term: "arve", gloss: <Trans>bill, check</Trans>, ticked: true },
  { term: "jootraha", gloss: <Trans>tip</Trans>, ticked: true },
  { term: "laud", gloss: <Trans>table</Trans> },
];

/** Smart add's pick list: the terms found in a lesson, most of them ticked, ready to add to a deck. */
export function SmartAddFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px] rounded-xl bg-sheet edge-strong">
      <p className="flex items-center gap-2 px-5 pt-4 text-lg font-medium text-ink">
        <Trans>Smart add</Trans>
        <span className="inline-flex h-[22px] items-center rounded-full bg-plate-nested px-2 text-2xs font-medium text-ink-secondary">
          <Trans>Beta</Trans>
        </span>
      </p>
      <div className="grid gap-3 px-5 pt-4">
        <span className="flex h-10 items-center justify-between rounded-md bg-plate px-3 text-base text-ink edge-strong">
          Estonian A2
          <ChevronDown className="size-4 text-ink-muted" />
        </span>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-secondary tabular-nums">
            <Trans>3 of 4 chosen</Trans>
          </span>
          <span className="font-medium text-ink-secondary underline decoration-edge-strong underline-offset-3">
            <Trans>Select all</Trans>
          </span>
        </div>
        <ul className="-mx-2 -mt-1 grid">
          {TERMS.map((row) => (
            <li key={row.term} className="flex items-start gap-3 rounded-lg px-2 py-1.5">
              <span
                className={clsx(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px]",
                  row.ticked ? "bg-amber text-amber-ink" : "bg-plate edge-strong",
                )}
              >
                {row.ticked && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="grid min-w-0">
                <span lang="et" className="text-base font-medium text-ink">
                  {row.term}
                </span>
                <span className="text-sm text-ink-secondary">{row.gloss}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 flex justify-end gap-2 border-t border-edge px-5 py-3">
        <span className={buttonClass("ghost", "md")}>
          <Trans>Back</Trans>
        </span>
        <span className={buttonClass("primary", "md")}>
          <Plural value={3} one="Add # card" other="Add # cards" />
        </span>
      </div>
    </div>
  );
}
