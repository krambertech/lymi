import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ListFilter, X } from "lucide-react";

const CARDS = [
  { term: "vaatama", meaning: <Trans>to look, to watch</Trans> },
  { term: "tulema", meaning: <Trans>to come</Trans> },
  { term: "unustama", meaning: <Trans>to forget</Trans> },
];

/** The Filter menu open on a deck's tags, beside the cards the chosen tag leaves. */
export function TagsFigure() {
  const { t } = useLingui();
  const verb = t`verb`;
  const tags = [
    { name: verb, cards: 24, chosen: true },
    { name: t`noun`, cards: 31 },
    { name: t`idiom`, cards: 12 },
    { name: t`travel`, cards: 9 },
  ];
  return (
    <div aria-hidden="true" className="mx-auto grid w-fit grid-cols-[auto_12rem] items-start gap-3">
      <div className="grid justify-items-start">
        <span className="inline-flex h-9 items-center gap-2 rounded-md bg-plate-hover px-3 text-sm font-medium text-ink edge">
          <ListFilter className="size-4" />
          <Trans>Filter</Trans>
        </span>
        <div className="mt-1.5 grid min-w-44 rounded-md bg-sheet p-1 edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]">
          <span className="px-2.5 py-1.5 text-xs text-ink-muted">
            <Trans>Tags</Trans>
          </span>
          {tags.map((tag) => (
            <span
              key={tag.name}
              className={clsx(
                "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-ink",
                tag.chosen && "bg-plate-hover",
              )}
            >
              <span className="grid size-4 place-items-center">
                {tag.chosen && <Check className="size-4" strokeWidth={2.4} />}
              </span>
              <span className="flex-1">{tag.name}</span>
              <span className="ps-3 text-sm text-ink-muted tabular-nums">{tag.cards}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="inline-flex h-9 items-center gap-1.5 justify-self-start rounded-full bg-plate-nested ps-3 pe-2 text-sm font-medium text-ink-secondary">
          {t`Tag: ${verb}`}
          <X className="size-3.5 text-ink-muted" />
        </span>
        <ul className="rounded-xl bg-plate edge">
          {CARDS.map((card) => (
            <li
              key={card.term}
              className="grid gap-0.5 px-3.5 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-edge"
            >
              <span lang="et" className="text-md leading-snug font-medium text-ink">
                {card.term}
              </span>
              <span className="truncate text-sm text-ink-secondary">{card.meaning}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
