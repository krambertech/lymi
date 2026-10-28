import { Plural, Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ChevronDown, RotateCcw, Signpost, Tags, X } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "../Button";

const CARDS = [
  { term: "vaatama", meaning: <Trans>to look, to watch</Trans>, chosen: true },
  { term: "tulema", meaning: <Trans>to come</Trans>, chosen: true },
  { term: "unustama", meaning: <Trans>to forget</Trans>, chosen: true },
  { term: "jooksma", meaning: <Trans>to run</Trans> },
];

function Item({ icon, label }: { icon: ReactNode; label: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-ink first:bg-plate-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-secondary">
      {icon}
      {label}
    </span>
  );
}

/** A deck's cards being chosen, with the selection's Actions menu open on its reviews. */
export function ReviewChosenFigure() {
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-[400px]">
      <div className="flex h-11 items-center gap-1 rounded-lg bg-plate ps-1 pe-1.5 edge-strong">
        <span className="grid size-8 place-items-center text-ink-secondary">
          <X className="size-4" />
        </span>
        <span className="me-auto ps-1 text-base font-medium text-ink tabular-nums">
          <Plural value={3} one="# selected" other="# selected" />
        </span>
        <span className={buttonClass("ghost", "sm")}>
          <Trans>Select all</Trans>
        </span>
        <span className={buttonClass("primary", "sm")}>
          <Trans>Actions</Trans>
          <ChevronDown data-icon="inline-end" />
        </span>
      </div>
      <ul className="mt-3 rounded-xl bg-plate edge">
        {CARDS.map((card) => (
          <li
            key={card.term}
            className="flex items-center gap-3 px-4 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-edge"
          >
            <span
              className={clsx(
                "grid size-5 shrink-0 place-items-center rounded-[6px]",
                card.chosen ? "bg-amber text-amber-ink" : "bg-plate edge-strong",
              )}
            >
              {card.chosen && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span lang="et" className="text-md leading-snug font-medium text-ink">
                {card.term}
              </span>
              <span className="truncate text-sm text-ink-secondary">{card.meaning}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="absolute end-0 top-[50px] grid w-56 rounded-md bg-sheet p-1 edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]">
        <Item
          icon={<RotateCcw />}
          label={<Plural value={2} one="Review # due" other="Review # due" />}
        />
        <Item
          icon={<RotateCcw />}
          label={<Plural value={3} one="Review all #" other="Review all #" />}
        />
        <span className="my-1 h-px bg-edge" />
        <Item icon={<Tags />} label={<Trans>Tags…</Trans>} />
        <Item icon={<Signpost />} label={<Trans>Move to section…</Trans>} />
      </div>
    </div>
  );
}
