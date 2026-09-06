import { ChevronRight } from "lucide-react";
import { Chip } from "./Chip";
import { NavLink, type StaticNav } from "./NavLink";

export interface NewCards {
  deckId: string;
  deckName: string;
  count: number;
  /** Who wrote them, as Activity names actors: "Claude", "You", "The API". */
  actor: string;
  /** When they landed, already worded: "Tuesday", "today". */
  when: string;
}

/**
 * One deck's worth of cards that arrived since the last review. The actor is on the row
 * because a card an integration added should never look like one the learner typed.
 */
export function NewCardsRow({
  deckId,
  deckName,
  count,
  actor,
  when,
  st,
}: NewCards & { st?: StaticNav }) {
  return (
    <NavLink
      to="/library/$deckId"
      params={{ deckId }}
      st={st}
      className="edge flex items-center gap-3 rounded-lg bg-plate px-4 py-3 transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover"
    >
      <Chip tone="new">{count} new</Chip>
      <span className="min-w-0 flex-1 truncate text-md font-medium">{deckName}</span>
      <span className="hidden shrink-0 text-sm text-muted @xl:inline">
        {actor} · {when}
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-faint" aria-hidden="true" />
    </NavLink>
  );
}
