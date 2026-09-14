import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Lantern } from "../Lantern";

interface LibraryDeck {
  id: string;
  title: MessageDescriptor;
  by: MessageDescriptor;
  firstParty?: boolean;
  sections: number;
  cards: number;
}

const DECKS: LibraryDeck[] = [
  {
    id: "first-steps",
    title: msg`Estonian A1: first steps`,
    by: msg`Made by Lymi`,
    firstParty: true,
    sections: 6,
    cards: 180,
  },
  {
    id: "work",
    title: msg`Estonian for work`,
    by: msg`Kadri Tamm, tutor`,
    sections: 8,
    cards: 260,
  },
  {
    id: "citizenship",
    title: msg`Words for the citizenship exam`,
    by: msg`Anna Kask, language school`,
    sections: 5,
    cards: 140,
  },
];

/** Decks other teachers published, each ready to add to a class as it is. */
export function LibraryDemo() {
  const { t, i18n } = useLingui();
  const [added, setAdded] = useState<string[]>([]);

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-2xl bg-plate p-4 edge @2xl:p-5">
      <div className="flex h-11 items-center gap-2.5 rounded-md bg-plate-2 px-3.5">
        <Search aria-hidden="true" className="size-4 text-muted" />
        <span className="text-md text-text">Eesti</span>
      </div>

      <ul className="mt-3 flex flex-col">
        {DECKS.map((deck) => {
          const isAdded = added.includes(deck.id);
          const title = i18n._(deck.title);
          return (
            <li
              key={deck.id}
              className="flex items-center gap-3 border-b border-edge py-3.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-md font-medium text-text">{title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                  {deck.firstParty && <Lantern className="size-3.5" />}
                  {i18n._(deck.by)}
                </p>
                <p className="mt-1 text-xs text-muted tabular-nums">
                  <Plural value={deck.sections} one="# section" other="# sections" /> ·{" "}
                  <Plural value={deck.cards} one="# card" other="# cards" />
                </p>
              </div>
              <button
                type="button"
                aria-pressed={isAdded}
                aria-label={isAdded ? t`Added ${title}` : t`Add ${title}`}
                onClick={() =>
                  setAdded((list) =>
                    isAdded ? list.filter((id) => id !== deck.id) : [...list, deck.id],
                  )
                }
                className={clsx(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97]",
                  isAdded
                    ? "bg-good-soft text-good"
                    : "bg-plate text-text edge hoverable:hover:bg-hover",
                )}
              >
                {isAdded ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
                {isAdded ? <Trans>Added</Trans> : <Trans>Add</Trans>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
