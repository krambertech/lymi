import { Plural, Trans } from "@lingui/react/macro";
import { isolate } from "@lymi/core";
import { Avatar, FormerOwnerMark } from "./avatar";
import { languageName } from "./deck-fields";
import { DueCount } from "./due-count";
import { NavLink } from "./nav-link";
import { Go } from "./next-steps";
import { PublisherMark } from "./publisher-mark";

export interface DeckRowProps {
  id: string;
  /** The name as its group shows it: inside a series, without the series' own name. */
  name: string;
  language?: string | null | undefined;
  due: number;
  total: number;
  /** When the next card comes back, for a deck with nothing due. E.g. "Monday". */
  next?: string | null | undefined;
  /** The owner's name on a deck the learner joined. An owned deck names nobody. */
  owner?: string | null | undefined;
  /** A joined deck whose owner deleted their account. */
  ownerLeft?: boolean | undefined;
  /** Whether the deck is published, which is what makes its owner a publisher. */
  published?: boolean | undefined;
  /** The publisher's photo, on a published deck. A deck shared by link keeps the letter. */
  publisherPhoto?: string | null | undefined;
  /** Instructions a screen reader reads with the link, such as how to drag the deck. */
  "aria-describedby"?: string | undefined;
  /** Called as the row opens its deck, before the route changes. */
  onOpen?: (() => void) | undefined;
}

/**
 * A deck in Library, a row in one plate like Today's deck rows: the name, its language and size,
 * and whether it wants you today. Due is the row's only colour, so a quiet Library stays quiet.
 */
export function DeckRow({
  id,
  name,
  language,
  due,
  total,
  next,
  owner,
  ownerLeft,
  published,
  publisherPhoto,
  "aria-describedby": describedBy,
  onOpen,
}: DeckRowProps) {
  const lang = language ? languageName(language) : null;
  return (
    <NavLink
      to="/library/$deckId"
      params={{ deckId: id }}
      aria-describedby={describedBy}
      onClick={onOpen}
      className="group flex min-h-18 w-full min-w-0 items-center gap-4 py-3 ps-5 pe-4 transition-[background-color] duration-150 hoverable:hover:veil"
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-md font-medium">{name}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-ink-muted tabular-nums">
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
        {ownerLeft ? (
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-ink-secondary">
            <FormerOwnerMark size={18} />
            <span className="min-w-0 truncate">
              <Trans>Its owner left Lymi</Trans>
            </span>
          </span>
        ) : (
          owner && (
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-ink-secondary">
              {published ? (
                <PublisherMark name={owner} src={publisherPhoto} size={18} />
              ) : (
                <Avatar name={owner} size={18} />
              )}
              <span className="min-w-0 truncate">
                <Trans>Shared by {{ owner: isolate(owner) }}</Trans>
              </span>
            </span>
          )
        )}
      </span>
      {/* The count sits beside the chevron, so the two read as one end, as on a series' Review all. */}
      <span className="flex shrink-0 items-center gap-1">
        {due > 0 && (
          <DueCount
            count={due}
            label={<Plural value={due} one="# due today" other="# due today" />}
          />
        )}
        <Go />
      </span>
    </NavLink>
  );
}
