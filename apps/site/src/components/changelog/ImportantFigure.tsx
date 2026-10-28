import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Archive, ChartNoAxesColumn, Ellipsis, Lightbulb, SquarePen, Star } from "lucide-react";
import type { ReactNode } from "react";

const ROWS = [
  { term: "vaatama", meaning: <Trans>to look, to watch</Trans>, important: true },
  { term: "kohe", meaning: <Trans>right away</Trans>, open: true },
  { term: "järjekord", meaning: <Trans>queue, line</Trans> },
  { term: "tasuta", meaning: <Trans>free of charge</Trans> },
];

function Item({
  icon,
  label,
  lit,
  danger,
}: {
  icon: ReactNode;
  label: ReactNode;
  lit?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={clsx(
        "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0",
        lit && "bg-plate-hover",
        danger ? "text-danger" : "text-ink [&_svg]:text-ink-secondary",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

/** A deck's cards with one already marked important and the card menu open on the next. */
export function ImportantFigure() {
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-[400px]">
      <ul className="rounded-xl bg-plate edge">
        {ROWS.map((row) => (
          <li
            key={row.term}
            className="flex items-center gap-3 px-4 py-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-edge"
          >
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span lang="et" className="text-lg leading-snug font-medium text-ink">
                {row.term}
                {row.important && (
                  <Star className="ms-1.5 inline size-3.5 fill-current align-[-1px] text-amber-mark" />
                )}
              </span>
              <span className="truncate text-sm text-ink-secondary">{row.meaning}</span>
            </span>
            <span
              className={clsx(
                "grid size-8 place-items-center rounded-md text-ink-muted",
                row.open && "bg-plate-hover text-ink-secondary",
              )}
            >
              <Ellipsis className="size-4" />
            </span>
          </li>
        ))}
      </ul>
      <div className="absolute end-3 top-[124px] grid w-52 rounded-md bg-sheet p-1 edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]">
        <Item icon={<Lightbulb />} label={<Trans>Add hint</Trans>} />
        <Item icon={<SquarePen />} label={<Trans>Edit card</Trans>} />
        <Item icon={<Star />} label={<Trans>Mark important</Trans>} lit />
        <Item icon={<ChartNoAxesColumn />} label={<Trans>View card</Trans>} />
        <span className="my-1 h-px bg-edge" />
        <Item icon={<Archive />} label={<Trans>Archive card</Trans>} danger />
      </div>
    </div>
  );
}
