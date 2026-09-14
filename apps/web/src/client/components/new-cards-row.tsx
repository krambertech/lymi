import { Plural } from "@lingui/react/macro";
import { ChevronRight } from "lucide-react";
import { Chip } from "./chip";
import { NavLink, type StaticNav } from "./nav-link";
import { StateIcon } from "./state-mark";

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
 * One deck's worth of cards that arrived since the last review. The actor stays on the row at
 * every width, because a card an integration added must never look like one the learner typed.
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
      className="edge flex items-center gap-3 rounded-lg bg-plate px-4 py-3 transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.97] hoverable:hover:edge-2 hoverable:hover:bg-hover"
    >
      <Chip>
        <StateIcon state="new" className="size-3" />
        <Plural value={count} one="# new" other="# new" />
      </Chip>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 @xl:flex-row @xl:items-baseline @xl:justify-between @xl:gap-3">
        <span className="truncate text-md font-medium">{deckName}</span>
        <span className="truncate text-sm text-muted">
          {actor} · {when}
        </span>
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-faint" aria-hidden="true" />
    </NavLink>
  );
}
