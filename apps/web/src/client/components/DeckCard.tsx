import { Plural, Trans } from "@lingui/react/macro";
import { languageName } from "./DeckFields";
import { NavLink, type StaticNav } from "./NavLink";
import { StateStripe } from "./StateStripe";

export interface DeckCardProps {
  id: string;
  name: string;
  language?: string | null | undefined;
  due: number;
  total: number;
  /** How many of the deck's cards FSRS calls known, and how many are on the way there. */
  known?: number | undefined;
  learning?: number | undefined;
  /** When the next card comes back, for a deck with nothing due. E.g. "Monday". */
  next?: string | null | undefined;
  st?: StaticNav;
}

/**
 * A deck in Library. A card rather than a row because it holds three kinds of line: the
 * name with its language, the stripe that says how the deck is split, and the one thing it
 * asks of you today. Due is the only amber, and it is text, so a page of decks stays quiet.
 */
export function DeckCard({
  id,
  name,
  language,
  due,
  total,
  known,
  learning,
  next,
  st,
}: DeckCardProps) {
  return (
    <NavLink
      to="/library/$deckId"
      params={{ deckId: id }}
      st={st}
      className="edge group grid w-full min-w-0 content-start gap-3 rounded-lg bg-plate px-4 pb-4 pt-3.5 transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.98] hoverable:hover:edge-2 hoverable:hover:bg-hover"
    >
      <span className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-lg font-medium tracking-[-0.01em]">{name}</span>
        {language && <span className="shrink-0 text-sm text-muted">{languageName(language)}</span>}
      </span>
      {known !== undefined && total > 0 && (
        <StateStripe known={known} learning={learning ?? 0} total={total} />
      )}
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted tabular-nums">
        {due > 0 ? (
          <b className="font-semibold text-amber-text">
            <Plural value={due} one="# due today" other="# due today" />
          </b>
        ) : next ? (
          <span>
            <Trans>Next {next}</Trans>
          </span>
        ) : total === 0 ? (
          <span>
            <Trans>Nothing in it yet</Trans>
          </span>
        ) : null}
        {total > 0 && (
          <span>
            <Plural value={total} one="# card" other="# cards" />
          </span>
        )}
      </span>
    </NavLink>
  );
}
