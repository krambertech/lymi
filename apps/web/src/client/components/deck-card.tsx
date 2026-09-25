import { Plural, Trans } from "@lingui/react/macro";
import { Avatar } from "./avatar";
import { languageName } from "./deck-fields";
import { DueCount } from "./due-count";
import { NavLink, type StaticNav } from "./nav-link";
import { PublisherMark } from "./publisher-mark";

export interface DeckCardProps {
  id: string;
  name: string;
  language?: string | null | undefined;
  due: number;
  total: number;
  /** When the next card comes back, for a deck with nothing due. E.g. "Monday". */
  next?: string | null | undefined;
  /** The owner's name on a deck the learner joined. An owned deck names nobody. */
  owner?: string | null | undefined;
  /** Whether the deck is published, which is what makes its owner a publisher. */
  published?: boolean | undefined;
  /** The publisher's photo, on a published deck. A deck shared by link keeps the letter. */
  publisherPhoto?: string | null | undefined;
  /** Instructions a screen reader reads with the link, such as how to drag the deck. */
  describedBy?: string | undefined;
  st?: StaticNav;
}

/**
 * A deck in Library, which is for choosing a deck to open: the name, whether it wants you today,
 * and how big it is. The split between states lives on the deck page. Due is the card's only
 * colour, so a page of decks with nothing due stays quiet.
 */
export function DeckCard({
  id,
  name,
  language,
  due,
  total,
  next,
  owner,
  published,
  publisherPhoto,
  describedBy,
  st,
}: DeckCardProps) {
  const lang = language ? languageName(language) : null;
  return (
    <NavLink
      to="/library/$deckId"
      params={{ deckId: id }}
      st={st}
      describedBy={describedBy}
      className="edge group grid w-full min-w-0 content-start gap-1 rounded-lg bg-plate px-4 py-3.5 transition-[background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100 hoverable:hover:edge-2 hoverable:hover:bg-hover"
    >
      <span className="flex min-h-[26px] min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 truncate text-lg font-medium tracking-[-0.01em]">{name}</span>
        {due > 0 && (
          <DueCount>
            <Plural value={due} one="# due today" other="# due today" />
          </DueCount>
        )}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted tabular-nums">
        {lang && (
          <>
            <span>{lang}</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        {total === 0 ? (
          <Trans>No cards yet</Trans>
        ) : (
          <Plural value={total} one="# card" other="# cards" />
        )}
        {due === 0 && next && total > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <Trans>Next {next}</Trans>
          </>
        )}
      </span>
      {owner && (
        <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-text-2">
          {published ? (
            <PublisherMark name={owner} src={publisherPhoto} size={18} />
          ) : (
            <Avatar name={owner} size={18} />
          )}
          <span className="min-w-0 truncate">
            <Trans>Shared by {owner}</Trans>
          </span>
        </span>
      )}
    </NavLink>
  );
}
