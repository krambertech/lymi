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
  cards: number;
}

/** Real decks on Explore's Estonian shelf; Lymi publishes every deck there. */
const DECKS: LibraryDeck[] = [
  { id: "everyday", title: msg`Everyday Estonian`, cards: 99 },
  { id: "verbs", title: msg`Estonian Top 100 Verbs`, cards: 100 },
  { id: "words", title: msg`Estonian Top 1000 Words`, cards: 1000 },
];

/** Ready-made decks from the library, each added as it is. */
export function LibraryDemo() {
  const { t, i18n } = useLingui();
  const [added, setAdded] = useState<string[]>([]);

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-2xl bg-plate p-4 edge @2xl:p-5">
      <div className="flex h-11 items-center gap-2.5 rounded-md bg-plate-nested px-3.5">
        <Search aria-hidden="true" className="size-4 text-ink-muted" />
        <span className="text-md text-ink">Eesti</span>
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
                <p className="truncate text-md font-medium text-ink">{title}</p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-muted tabular-nums">
                  <Lantern className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate">
                    <Trans>Made by Lymi</Trans> ·{" "}
                    <Plural value={deck.cards} one="# card" other="# cards" />
                  </span>
                </p>
              </div>
              <button
                type="button"
                aria-pressed={isAdded}
                aria-label={t`Add ${title}`}
                onClick={() =>
                  setAdded((list) =>
                    isAdded ? list.filter((id) => id !== deck.id) : [...list, deck.id],
                  )
                }
                className={clsx(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97]",
                  isAdded
                    ? "bg-success-soft text-success"
                    : "bg-plate text-ink edge hoverable:hover:bg-plate-hover",
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
