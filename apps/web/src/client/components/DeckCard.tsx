import { ChevronRight } from "lucide-react";
import { Chip } from "./Chip";
import { NavLink, type StaticNav } from "./NavLink";

export interface DeckCardProps {
  id: string;
  name: string;
  language?: string | null | undefined;
  due: number;
  total: number;
  /** Cards added since the last review. Omitted until the endpoint exists. */
  fresh?: number | undefined;
  /** When the next card comes back, for a deck with nothing due. E.g. "Monday". */
  next?: string | null | undefined;
  st?: StaticNav;
}

/**
 * A deck in Library: the name on one line, its counts on the next. Two lines because a deck
 * carries four numbers and one line makes them a row of digits nobody reads.
 */
export function DeckCard({ id, name, language, due, total, fresh, next, st }: DeckCardProps) {
  return (
    <NavLink
      to="/library/$deckId"
      params={{ deckId: id }}
      st={st}
      className="edge group flex items-center gap-3.5 rounded-lg bg-plate px-4 py-4 transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.97] hoverable:hover:edge-2 hoverable:hover:bg-hover"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-lg font-medium tracking-[-0.01em]">{name}</span>
          {language && (
            <span className="shrink-0 text-xs font-medium uppercase tracking-[0.06em] text-muted">
              {language}
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {due > 0 ? <Chip tone="new">{due} due</Chip> : next && <Chip>Next {next}</Chip>}
          {fresh ? <Chip tone="new">{fresh} new</Chip> : null}
          <span className="text-sm tabular-nums text-muted">
            {total} {total === 1 ? "card" : "cards"}
          </span>
        </span>
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-faint" aria-hidden="true" />
    </NavLink>
  );
}
