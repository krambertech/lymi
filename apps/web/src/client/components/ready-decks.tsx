import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ChevronRight, Compass } from "lucide-react";
import { DeckTile } from "./deck-tray";
import type { StaticNav } from "./nav-link";
import { NavLink } from "./nav-link";

interface Props {
  /** Published decks the learner has not added, in the catalogue's own order. */
  decks: PublicDeckSummary[];
  onAdd: (deck: { slug: string; name: string; edition: string }) => void;
  /** The slug currently being added, so only its own tile waits. */
  adding?: string | undefined;
  st?: StaticNav;
}

/**
 * The way to a ready-made deck under Today's getting started guide: the Explore tile in a row that
 * scrolls sideways, with the next deck cut by the screen's edge so the row says it carries more.
 * It carries no amber, so the guide's own step stays the one thing to press; the trays' colour is
 * what marks the row out. On a phone it is also the first sight of Explore, which otherwise sits
 * in the learner menu.
 */
export function ReadyDecks({ decks, onAdd, adding, st }: Props) {
  return (
    <section aria-labelledby="today-ready" className="grid gap-2.5 border-t border-edge pt-7">
      <div className="flex min-h-8 items-center justify-between gap-3 px-1">
        <h2 id="today-ready" className="flex items-center gap-2 text-lg font-medium">
          <Compass className="size-4.5 text-muted" aria-hidden="true" />
          <Trans>Ready-made decks</Trans>
        </h2>
        <NavLink
          to="/explore"
          st={st}
          className="relative -me-1 inline-flex items-center gap-0.5 rounded-sm px-1.5 py-1 text-sm font-medium text-text-2 transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hoverable:hover:text-text"
        >
          <Trans>Explore</Trans>
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </NavLink>
      </div>
      <p className="max-w-[54ch] px-1 text-sm text-text-2">
        <Trans>Decks from Lymi. Add one to study it in your language.</Trans>
      </p>
      <ul className="deck-strip -mx-5 mt-1 px-5 @3xl/shell:-mx-8 @3xl/shell:px-8">
        {decks.map((deck) => (
          <li key={deck.slug}>
            <DeckTile
              deck={deck}
              addedTo={null}
              onAdd={() =>
                // The edition this row was read in, so Library says what the strip said.
                onAdd({ slug: deck.slug, name: deck.name, edition: deck.meaningLanguage })
              }
              adding={adding === deck.slug}
              st={st}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
