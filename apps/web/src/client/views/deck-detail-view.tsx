import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Archive,
  ArrowUpDown,
  Download,
  KeyRound,
  Layers,
  ListFilter,
  LogOut,
  MoreHorizontal,
  Plug,
  Plus,
  Search,
  Settings2,
  Signpost,
  SquareCheck,
  X,
} from "lucide-react";
import {
  Fragment,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar } from "../components/avatar";
import { Button, buttonClass, IconButton } from "../components/button";
import { directionLabel, languageName } from "../components/deck-fields";
import { ErrorState, NoResults } from "../components/empty-state";
import { Screen, ScreenBar } from "../components/layout/screen";
import { NextStep, NextSteps } from "../components/next-steps";
import { PublisherMark } from "../components/publisher-mark";
import { SectionProgress } from "../components/section-progress";
import { Skeleton } from "../components/skeleton";
import { StartPanel, StartPanelSection } from "../components/start-panel";
import { StateIcon, stateMarks } from "../components/state-mark";
import { type StreakSummary, useTodayStatus } from "../components/streak";
import { Dialog, DialogContent } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import type { DeckSummary, Section, Sections } from "../lib/api";
import {
  activeFilterCount,
  type DeckFilters,
  type DeckRow,
  type DeckSort,
  filterRows,
  groupRows,
  noFilters,
  rowState,
} from "../lib/deck-list";
import { Glossary, type SectionEditing, sectionAnchor } from "./deck-glossary";
import type { StaticNav } from "./shell";
import { type WordHistory, WordView } from "./word-view";

/** A menu row greys its icons, so a state's mark takes its own colour back. */
const menuMarkColour = {
  new: "text-state-new!",
  learning: "text-state-learning!",
  known: "text-state-known!",
} as const;

/** The narrowest list that still keeps meanings beside words; narrower than it and a card, the card is a sheet. */
const LIST_PX = 640;
const CARD_PX = 400;
const DAY = 86_400_000;

/** A deck the screen cannot draw: one that is not there any more, or one it could not reach. */
export type DeckFailure = "gone" | "unreachable";

export interface DeckDetailProps {
  deck: DeckSummary | undefined;
  cards: DeckRow[] | undefined;
  /** Where today's goal stands, for the line under the due count. */
  streak?: StreakSummary | undefined;
  onReview?: (() => void) | undefined;
  onSettings?: (() => void) | undefined;
  /** Every write to the deck. Absent for a member, who reads someone else's deck. */
  owner?: DeckOwnerActions | undefined;
  /** Absent for the owner, who archives the deck instead of leaving it. */
  member?: DeckMemberActions | undefined;
  /** The owner's series the deck is in, named under the title. */
  seriesName?: string | undefined;
  /** The word that is open, if one is. The view owns it when the route does not. */
  openCardId?: string | null | undefined;
  onOpen?: ((id: string | null) => void) | undefined;
  /** The open word's history, when the route has fetched it. */
  history?: WordHistory | undefined;
  /** Play the word's pronunciation. Absent, the Say button is not drawn. */
  onPlayAudio?: ((card: DeckRow["card"]) => void) | undefined;
  /** Every deck, so a word can be moved out of this one. */
  decks?: { id: string; name: string }[] | undefined;
  /** How to connect an assistant, offered while the deck has no cards. */
  connectUrl?: string | undefined;
  /** Whether an assistant is connected; undefined while unknown, so its row does not flash. */
  connected?: boolean | undefined;
  /** The deck's active sections with the learner's standing, and where the learner is. */
  sections?: Section[] | undefined;
  progress?: Sections["progress"] | undefined;
  /** Start a section, for anyone studying the deck. */
  onStartSection?: ((section: Section) => void) | undefined;
  /** Review one section's cards, from its heading's menu. */
  onReviewSection?: ((section: Section) => void) | undefined;
  startSectionPending?: boolean | undefined;
  /** Why the deck is not on screen: gone for good, or the app could not reach it. */
  failure?: DeckFailure | undefined;
  /** Fetch the deck again, for a failure that can be recovered from. */
  onRetry?: (() => void) | undefined;
  retryPending?: boolean | undefined;
  /** Draw an open card beside the list at any width, for the design system's narrower frames. */
  cardBeside?: boolean | undefined;
  static?: StaticNav;
}

/** What the owner does to the deck and its cards; the route holds the sheets and dialogs. */
export interface DeckOwnerActions {
  onAddCard: () => void;
  onArchiveCard: (id: string) => void;
  onEditCard: (card: DeckRow["card"]) => void;
  /** Asks the AI to fill a card's empty fields. */
  onEnrichCard: (card: DeckRow["card"]) => void;
  onMoveCard: (id: string, deckId: string) => void;
  onArchiveDeck: () => void;
  onExport: () => void;
  onMoveToSeries: () => void;
  sections: DeckSectionActions;
}

export interface DeckMemberActions {
  onLeave: () => void;
}

/** What the owner does to sections from the deck page; the route holds the dialogs. */
export interface DeckSectionActions extends Omit<SectionEditing, "onDropCards"> {
  onCreate: () => void;
  /** Open the picker for these cards; `after` runs once they have moved. */
  onPickSection: (cardIds: string[], after: () => void) => void;
  onMoveCards: (cardIds: string[], section: Section | null) => void;
}

/** Word, meaning, status and next review as a CSV file the browser saves. */
export function exportCsv(deckName: string, rows: DeckRow[]) {
  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    [
      "term",
      "meaning",
      "pronunciation",
      "example",
      "notes",
      "language",
      "source",
      "state",
      "due",
    ].join(","),
    ...rows.map(({ card, state }) =>
      [
        esc(card.term),
        esc(card.meaning),
        esc(card.pronunciation),
        esc(card.example),
        esc(card.notes),
        esc(card.language),
        esc(card.source),
        String(state?.state ?? 0),
        state ? new Date(state.due).toISOString() : "",
      ].join(","),
    ),
  ];
  const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deckName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Whose deck this is, under its title, with the mark the Library card draws. */
function OwnerLine({ deck }: { deck: DeckSummary }) {
  const owner = deck.owner.name;
  return (
    <>
      {deck.published ? (
        <PublisherMark name={owner} src={deck.owner.avatarUrl} size={18} />
      ) : (
        <Avatar name={owner} size={18} />
      )}
      <span className="min-w-0 truncate">
        <Trans>Shared by {owner}</Trans>
      </span>
    </>
  );
}

/** What a member sees in a shared deck with nothing in it yet. */
function OwnerAddsCards({ owner }: { owner: string }) {
  return <Trans>Cards appear here when {owner} adds them.</Trans>;
}

/** The parts under a deck's title, dot-separated, or nothing when there are none. */
function subline(...parts: ReactNode[]) {
  const shown = parts.filter(Boolean);
  if (shown.length === 0) return undefined;
  // One centred row, so a part that carries an icon sits on the same line as the text beside it.
  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {shown.map((part, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts have a fixed order
        <Fragment key={index}>
          {index > 0 && <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

/** "tomorrow", "in 3 days": when the deck's next card comes back, in the interface language. */
function nextDueLabel(locale: string, cards: DeckRow[], now = Date.now()): string | null {
  let next = Number.POSITIVE_INFINITY;
  for (const { state } of cards) {
    const at = state ? new Date(state.due).getTime() : Number.NaN;
    if (at > now && at < next) next = at;
  }
  if (!Number.isFinite(next)) return null;
  const days = Math.round((next - now) / DAY);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (days < 1) return rtf.format(Math.max(1, Math.round((next - now) / 3_600_000)), "hour");
  if (days < 30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/**
 * Two stacked plates. Review's is the one with an action: the cards due now, where today's goal
 * stands, and Review, or with nothing due, when the next card is back and Add card. The deck's is
 * its total and split between New, Learning and Known, which never read as zero on a quiet day.
 */
function DeckPlates({
  deck,
  cards,
  streak,
  onReview,
  onAdd,
  section,
}: {
  deck: DeckSummary;
  cards: DeckRow[];
  streak?: StreakSummary | undefined;
  onReview?: (() => void) | undefined;
  onAdd?: (() => void) | undefined;
  /** The row about sections under Today's, when the deck opens them in order. */
  section?: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const summary = useTodayStatus(streak);
  // A summary fetched before these cards arrived would say nothing is due beside a count that is not zero.
  const status = deck.due > 0 && streak?.today.outcome === "nothing_due" ? "" : summary;
  const due = deck.due;
  const next = due === 0 ? nextDueLabel(i18n.locale, cards) : null;
  const total = cards.length;
  const counts = { new: 0, learning: 0, known: 0 };
  for (const row of cards) counts[rowState(row)]++;

  return (
    // A container query styles only what is inside the container, so the plates sit one level in.
    <div className="@container/plates">
      <div className="grid gap-3">
        <section aria-label={t`Today`} className="edge grid rounded-xl bg-plate">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-4 p-5 @md/plates:ps-6">
            <p className="text-4xl font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {i18n.number(due)}
            </p>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p className="text-md text-text">
                <Plural value={due} one="card to review now" other="cards to review now" />
              </p>
              {next ? (
                <p className="text-sm text-muted">{t`Next card due ${next}.`}</p>
              ) : (
                status && <p className="text-sm text-muted">{status}</p>
              )}
            </div>
            {due > 0 ? (
              <Button
                variant="primary"
                onClick={onReview}
                aria-disabled={!onReview}
                className="w-full @md/plates:w-auto @md/plates:px-8"
              >
                <Trans>Review</Trans>
              </Button>
            ) : (
              onAdd && (
                <Button onClick={onAdd} kbd="N" className="w-full @md/plates:w-auto">
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  <Trans>Add card</Trans>
                </Button>
              )
            )}
          </div>
          {section}
        </section>
        {/* A narrow plate cannot fit four counts in the hundreds, so the total takes its own row there. */}
        <dl className="edge grid grid-cols-3 items-center rounded-xl bg-plate py-4 @md/plates:grid-cols-4">
          <div className="col-span-3 grid justify-items-center gap-0.5 border-b border-edge px-2 pb-3 @md/plates:col-span-1 @md/plates:border-b-0 @md/plates:pb-0">
            <dt className="order-last text-sm text-muted">
              <Trans context="cards in this deck">Total</Trans>
            </dt>
            <dd className="text-xl font-semibold proportional-nums">{i18n.number(total)}</dd>
          </div>
          {(["new", "learning", "known"] as const).map((key) => (
            <div
              key={key}
              className={clsx(
                "grid justify-items-center gap-0.5 border-edge px-2 pt-3 @md/plates:border-s @md/plates:pt-0",
                key !== "new" && "border-s",
              )}
            >
              <dt className="order-last text-sm text-muted">
                {i18n._(stateMarks[key].groupLabel)}
              </dt>
              <dd
                className={clsx(
                  "flex items-center gap-1.5 text-xl font-semibold proportional-nums",
                  counts[key] === 0 && "text-muted",
                )}
              >
                <StateIcon state={key} className="size-[18px]" />
                {i18n.number(counts[key])}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** A filter that is on, with the press that turns it off. */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const { t } = useLingui();
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={t`Remove filter: ${label}`}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-plate-2 ps-3 pe-2 text-sm font-medium text-text-2 transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text"
    >
      {label}
      <X className="size-3.5 text-muted" aria-hidden="true" />
    </button>
  );
}

function ListTools({
  sections,
  filters,
  setFilters,
  sort,
  setSort,
  query,
  setQuery,
  searchRef,
}: {
  sections: Section[];
  filters: DeckFilters;
  setFilters: (next: DeckFilters) => void;
  sort: DeckSort;
  setSort: (next: DeckSort) => void;
  query: string;
  setQuery: (next: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const { t, i18n } = useLingui();
  const sectionName = (id: string) =>
    id ? (sections.find((s) => s.id === id)?.name ?? "") : t`No section`;
  const dueName = { today: t`Due today`, week: t`Due this week` };
  const sortName: Record<DeckSort, string> = {
    section: t`Section`,
    due: t`Due date`,
    added: t`Recently added`,
    az: t`A–Z`,
  };
  const toggle = <T,>(list: T[], item: T, on: boolean) =>
    on ? [...list, item] : list.filter((x) => x !== item);

  const chips = [
    ...filters.states.map((state) => ({
      key: `state:${state}`,
      label: i18n._(stateMarks[state].groupLabel),
      remove: () => setFilters({ ...filters, states: toggle(filters.states, state, false) }),
    })),
    ...(filters.due
      ? [
          {
            key: "due",
            label: dueName[filters.due],
            remove: () => setFilters({ ...filters, due: null }),
          },
        ]
      : []),
    ...filters.sections.map((id) => ({
      key: `section:${id}`,
      label: sectionName(id),
      remove: () => setFilters({ ...filters, sections: toggle(filters.sections, id, false) }),
    })),
  ];

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm">
                <ListFilter data-icon="inline-start" aria-hidden="true" />
                <Trans>Filter</Trans>
              </Button>
            }
          />
          <DropdownMenuContent
            aria-label={t`Filter`}
            className="max-w-[min(20rem,var(--available-width))]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <Trans>State</Trans>
              </DropdownMenuLabel>
              {(["new", "learning", "known"] as const).map((state) => (
                <DropdownMenuCheckboxItem
                  key={state}
                  checked={filters.states.includes(state)}
                  onCheckedChange={(on) =>
                    setFilters({ ...filters, states: toggle(filters.states, state, on) })
                  }
                >
                  <StateIcon state={state} className={menuMarkColour[state]} />
                  {i18n._(stateMarks[state].groupLabel)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <Trans>Due</Trans>
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.due ?? "any"}
                onValueChange={(v) =>
                  setFilters({ ...filters, due: v === "any" ? null : (v as "today" | "week") })
                }
              >
                <DropdownMenuRadioItem value="any" closeOnClick={false}>
                  <Trans>Any time</Trans>
                </DropdownMenuRadioItem>
                {(["today", "week"] as const).map((due) => (
                  <DropdownMenuRadioItem key={due} value={due} closeOnClick={false}>
                    {dueName[due]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            {sections.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <Trans>Section</Trans>
                  </DropdownMenuLabel>
                  {[...sections.map((s) => s.id), ""].map((id) => (
                    <DropdownMenuCheckboxItem
                      key={id || "none"}
                      checked={filters.sections.includes(id)}
                      onCheckedChange={(on) =>
                        setFilters({ ...filters, sections: toggle(filters.sections, id, on) })
                      }
                    >
                      <span className="truncate">{sectionName(id)}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost" aria-label={t`Sort: ${sortName[sort]}`}>
                <ArrowUpDown data-icon="inline-start" aria-hidden="true" />
                {sortName[sort]}
              </Button>
            }
          />
          <DropdownMenuContent aria-label={t`Sort`}>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as DeckSort)}>
              {(sections.length > 0
                ? (["section", "due", "added", "az"] as const)
                : (["added", "due", "az"] as const)
              ).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {sortName[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Desktop keeps search beside the tools, where "/" lands; the phone has it up top. */}
        <div className="relative ms-auto hidden w-56 min-w-0 @3xl/shell:block">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            ref={searchRef}
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t`Search this deck`}
            aria-label={t`Search this deck`}
            autoComplete="off"
            inputSize="sm"
            className="ps-9"
          />
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <FilterChip key={chip.key} label={chip.label} onRemove={chip.remove} />
          ))}
          {chips.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => setFilters(noFilters)}>
              <Trans>Clear filters</Trans>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * While cards are being chosen, this takes the place of Filter and Sort and sticks to the top of
 * the page, so the count and the action stay where the eye already is and cover nothing.
 */
function SelectionToolbar({
  count,
  total,
  onAll,
  onClear,
  onMove,
  onDone,
}: {
  count: number;
  total: number;
  onAll: () => void;
  onClear: () => void;
  onMove: () => void;
  onDone: () => void;
}) {
  const { t } = useLingui();
  const all = count > 0 && count === total;
  return (
    <section
      aria-label={t`Selected cards`}
      className="@container/tools edge-2 flex h-11 items-center gap-1 rounded-lg bg-plate ps-1 pe-1.5"
    >
      <IconButton size="sm" label={t`Stop selecting`} onClick={onDone}>
        <X />
      </IconButton>
      <p
        className="me-auto min-w-0 truncate ps-1 text-base font-medium tabular-nums"
        aria-live="polite"
      >
        <Plural value={count} _0="Select cards" one="# selected" other="# selected" />
      </p>
      <Button size="sm" variant="ghost" onClick={all ? onClear : onAll}>
        {all ? <Trans>Clear</Trans> : <Trans>Select all</Trans>}
      </Button>
      <Button
        size="sm"
        variant="primary"
        aria-disabled={count === 0}
        aria-label={t`Move to section…`}
        onClick={() => count > 0 && onMove()}
      >
        <span className="@md/tools:hidden">
          <Trans>Move…</Trans>
        </span>
        <span className="hidden @md/tools:inline">
          <Trans>Move to section…</Trans>
        </span>
      </Button>
    </section>
  );
}

/**
 * One deck: two plates, then its words as a glossary under a filter, a sort and search. A card
 * opens beside the list when both fit, and otherwise as a sheet over the page on a
 * desktop or a drawer on touch. The deck page is for reading; writing a card happens in capture,
 * an integration or the open card.
 */
export function DeckDetailView({
  deck,
  cards,
  streak,
  onReview,
  onSettings,
  owner,
  member,
  seriesName,
  openCardId,
  onOpen,
  history,
  onPlayAudio,
  decks,
  sections = [],
  progress,
  onStartSection,
  onReviewSection,
  startSectionPending,
  failure,
  onRetry,
  retryPending,
  cardBeside,
  connectUrl,
  connected,
  static: st,
}: DeckDetailProps) {
  const { t, i18n } = useLingui();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  const [chosenSort, setSort] = useState<DeckSort | null>(null);
  // A deck with sections opens on them; one without has nothing to group that way.
  const sort: DeckSort =
    chosenSort === "section" || chosenSort === null
      ? sections.length > 0
        ? "section"
        : "added"
      : chosenSort;
  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const anchor = useRef<string | null>(null);
  const [localOpen, setLocalOpen] = useState<string | null>(null);
  const openId = openCardId === undefined ? localOpen : openCardId;
  const setOpen = useCallback(
    (id: string | null) => {
      setLocalOpen(id);
      onOpen?.(id);
    },
    [onOpen],
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = () => {
    setQ("");
    setSearchOpen(false);
  };
  const clearAll = () => {
    setQ("");
    setFilters(noFilters);
  };

  // "/" puts the caret in the deck's own search, the shortcut PRODUCT.md promises.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      // The desktop field is not drawn in a narrow container, so open the top bar's instead.
      if (searchRef.current?.offsetParent) searchRef.current.focus();
      else setSearchOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The list's clock, refreshed with the cards rather than every render, so headings hold still.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cards are the reason to look again
  const now = useMemo(() => Date.now(), [cards]);
  const shown = useMemo(
    () => (cards ? filterRows(cards, filters, q, now, sections) : undefined),
    [cards, filters, q, now, sections],
  );
  const everything = q.trim() === "" && activeFilterCount(filters) === 0;
  // The owner sees every section, empty ones too, so there is always somewhere to drop a card.
  const arranging = !!owner && sort === "section" && everything;
  const groups = useMemo(
    () => (shown ? groupRows(shown, sort, now, i18n.locale, sections, arranging) : []),
    [shown, sort, now, i18n.locale, sections, arranging],
  );
  const ordered = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  const toggleSelected = (id: string, range: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      const from = anchor.current ? ordered.findIndex((r) => r.card.id === anchor.current) : -1;
      const to = ordered.findIndex((r) => r.card.id === id);
      if (range && from >= 0 && to >= 0) {
        const on = !next.has(id);
        for (const row of ordered.slice(Math.min(from, to), Math.max(from, to) + 1)) {
          if (on) next.add(row.card.id);
          else next.delete(row.card.id);
        }
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      anchor.current = id;
      return next;
    });
  };
  const stopSelecting = useCallback(() => {
    setSelected(null);
    anchor.current = null;
  }, []);

  // Escape leaves selection, unless something above the list has it.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      // A menu or dialog open over the list takes this Escape for itself.
      const overlay = document.querySelector("[role='menu'], [role='dialog']");
      if (e.key === "Escape" && !e.defaultPrevented && !overlay) stopSelecting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, stopSelecting]);

  const goToSection = (sectionId: string) => {
    if (chosenSort !== null && chosenSort !== "section") setSort("section");
    setFilters(noFilters);
    setQ("");
    requestAnimationFrame(() => {
      const heading = document.getElementById(sectionAnchor(sectionId));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heading?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    });
  };

  const openIndex = ordered.findIndex((r) => r.card.id === openId);
  const open = openIndex >= 0 ? ordered[openIndex] : cards?.find((r) => r.card.id === openId);

  const rootRef = useRef<HTMLDivElement>(null);
  const width = useWidth(rootRef);
  const fits = cardBeside || width >= LIST_PX + CARD_PX;
  // A resize moves an open card between beside and sheet, but waits while an edit or the Move sheet is open.
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState<boolean | null>(null);
  if (busy && held === null) setHeld(fits);
  if (!busy && held !== null) setHeld(null);
  const beside = held ?? fits;
  const measuring = !!open && !cardBeside && width === 0;

  // The sheet keeps drawing the last word while it slides away.
  const lastOpen = useRef(open);
  if (open) lastOpen.current = open;
  const shownWord = open ?? lastOpen.current;

  // Walking the list with a word open, the way a mail client does.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // The sheet closes itself on Escape; beside the list, the page does.
      if (e.key === "Escape" && beside) setOpen(null);
      const step = e.key === "j" ? 1 : e.key === "k" ? -1 : 0;
      const next = step && openIndex >= 0 ? ordered[openIndex + step] : undefined;
      if (next) setOpen(next.card.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, ordered, openIndex, beside, setOpen]);

  const titleId = useId();
  const word = shownWord && deck && (
    <WordView
      key={shownWord.card.id}
      card={shownWord.card}
      state={shownWord.state}
      deckName={deck.name}
      modes={shownWord.card.reviewModes ?? deck.reviewModes}
      history={history}
      onPlayAudio={onPlayAudio ? () => onPlayAudio(shownWord.card) : undefined}
      hasPrev={openIndex > 0}
      hasNext={openIndex >= 0 && openIndex < ordered.length - 1}
      onPrev={() => {
        const prev = ordered[openIndex - 1];
        if (prev) setOpen(prev.card.id);
      }}
      onNext={() => {
        const next = ordered[openIndex + 1];
        if (next) setOpen(next.card.id);
      }}
      onClose={() => {
        const id = shownWord.card.id;
        setOpen(null);
        // Beside the list nothing hands focus back, so the row that opened the card takes it.
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>(`[data-card-row="${CSS.escape(id)}"]`)?.focus(),
        );
      }}
      owner={
        owner && {
          onEdit: () => owner.onEditCard(shownWord.card),
          onEnrich: () => owner.onEnrichCard(shownWord.card),
          onArchive: () => {
            setOpen(null);
            owner.onArchiveCard(shownWord.card.id);
          },
          onMove: (deckId) => owner.onMoveCard(shownWord.card.id, deckId),
          onMoveToSection: () => owner.sections.onPickSection([shownWord.card.id], () => {}),
        }
      }
      decks={decks}
      titleId={titleId}
      onBusyChange={setBusy}
    />
  );

  const addButton = owner && (
    <IconButton label={t`Add card`} onClick={owner.onAddCard}>
      <Plus />
    </IconButton>
  );

  const deckMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t`Deck options`}>
            <MoreHorizontal />
          </IconButton>
        }
      />
      <DropdownMenuContent aria-label={t`Deck options`} align="end">
        <DropdownMenuItem onClick={onSettings} disabled={!onSettings}>
          <Settings2 />
          {deck && deck.role !== "owner" ? <Trans>About this deck</Trans> : <Trans>Settings</Trans>}
        </DropdownMenuItem>
        {owner && (
          <>
            <DropdownMenuItem onClick={owner.onMoveToSeries}>
              <Layers />
              <Trans>Move to series</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={owner.sections.onCreate}>
              <Signpost />
              <Trans>New section</Trans>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSelected(new Set())}
              disabled={!cards?.length || !!selected}
            >
              <SquareCheck />
              <Trans>Select cards</Trans>
            </DropdownMenuItem>
          </>
        )}
        {owner && (
          <DropdownMenuItem onClick={owner.onExport} disabled={!deck}>
            <Download />
            <Trans>Export</Trans>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {member ? (
          <DropdownMenuItem variant="destructive" onClick={member.onLeave}>
            <LogOut />
            <Trans>Leave deck</Trans>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant="destructive" onClick={owner?.onArchiveDeck} disabled={!owner}>
            <Archive />
            <Trans>Archive</Trans>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // The design page renders the screen without a router, so every way back is a plain anchor there.
  const toLibrary = (className: string, content: ReactNode) =>
    st ? (
      <a href="/library" onClick={(e) => e.preventDefault()} className={className}>
        {content}
      </a>
    ) : (
      <Link to="/library" className={className}>
        {content}
      </Link>
    );
  const backToLibrary = { label: t`Library`, to: "/library" };

  // A deck that could not be loaded takes the whole screen, so no skeleton is left waiting under it.
  if (failure) {
    return (
      <Screen back={backToLibrary} ownTitle>
        {failure === "gone" ? (
          <ErrorState
            title={t`This deck is no longer here`}
            body={t`It may have been archived, or you were removed from it.`}
            action={toLibrary(buttonClass("primary"), t`Open Library`)}
          />
        ) : (
          <ErrorState
            title={t`Couldn’t load this deck`}
            onRetry={onRetry}
            retrying={retryPending}
          />
        )}
      </Screen>
    );
  }

  const query = q.trim();
  const filtered = query !== "" || activeFilterCount(filters) > 0;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1">
      <Screen
        title={deck?.name}
        back={backToLibrary}
        sub={
          deck
            ? subline(
                deck.role !== "owner" && <OwnerLine deck={deck} />,
                seriesName && (
                  // Marked, so a series named after the deck's language never reads as the language twice.
                  <>
                    <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only">{t`Series`}</span>
                    <span>{seriesName}</span>
                  </>
                ),
                deck.defaultLanguage ? languageName(deck.defaultLanguage) : null,
                deck.directions !== "recognition" ? directionLabel(deck.directions) : null,
              )
            : undefined
        }
        actions={
          <>
            {/* Desktop keeps search beside the list tools, where "/" lands. */}
            {cards && cards.length > 0 && (
              <IconButton
                label={t`Search this deck`}
                onClick={() => setSearchOpen(true)}
                className="@3xl/shell:hidden"
              >
                <Search />
              </IconButton>
            )}
            {addButton}
            {deckMenu}
          </>
        }
        bar={
          searchOpen ? (
            <ScreenBar>
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  autoFocus
                  enterKeyHint="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeSearch();
                  }}
                  placeholder={t`Search this deck`}
                  aria-label={t`Search this deck`}
                  autoComplete="off"
                  className="w-full ps-9"
                />
              </div>
              <Button variant="ghost" onClick={closeSearch}>
                <Trans>Cancel</Trans>
              </Button>
            </ScreenBar>
          ) : undefined
        }
      >
        {/* While the phone searches, the list is the answer, so the plates step aside. */}
        <div className={clsx(searchOpen && "hidden @3xl/shell:block")}>
          {deck === undefined || cards === undefined ? (
            <div className="grid gap-3">
              <Skeleton className="h-[84px] rounded-xl" />
              <Skeleton className="h-[84px] rounded-xl" />
            </div>
          ) : cards.length > 0 ? (
            <DeckPlates
              deck={deck}
              cards={cards}
              streak={streak}
              onReview={onReview}
              onAdd={owner?.onAddCard}
              section={
                progress &&
                onStartSection && (
                  <SectionProgress
                    sections={sections}
                    progress={progress}
                    due={deck.due}
                    onGoTo={goToSection}
                    onStart={onStartSection}
                    starting={startSectionPending}
                  />
                )
              }
            />
          ) : !owner ? (
            <StartPanel
              title={<Trans>No cards in {deck.name} yet</Trans>}
              body={<OwnerAddsCards owner={deck.owner.name} />}
            />
          ) : (
            <StartPanel
              title={<Trans>No cards in {deck.name} yet</Trans>}
              body={<Trans>Add cards from your last lesson, then review them here.</Trans>}
              action={
                <Button
                  variant="primary"
                  className="justify-self-start"
                  onClick={owner.onAddCard}
                  kbd="N"
                >
                  <Trans>Add a card</Trans>
                </Button>
              }
            >
              <StartPanelSection>
                <NextSteps label={t`Other ways to add cards`}>
                  {connected === false && connectUrl && (
                    <NextStep
                      icon={<Plug />}
                      title={<Trans>Send a lesson from Claude or ChatGPT</Trans>}
                      detail={<Trans>Connect Lymi, paste the lesson, and ask for the cards</Trans>}
                      href={connectUrl}
                      static={st}
                    />
                  )}
                  <NextStep
                    icon={<KeyRound />}
                    title={<Trans>Add cards with the API</Trans>}
                    detail={<Trans>Create a key in Settings</Trans>}
                    to="/settings"
                    hash="api-keys"
                    static={st}
                  />
                </NextSteps>
              </StartPanelSection>
            </StartPanel>
          )}
        </div>

        {cards && cards.length > 0 && (
          <div
            className={clsx(
              searchOpen ? "mt-2 @3xl/shell:mt-6" : "mt-6",
              // Pinned over a strip of the page's own ground, so rows never show beside it.
              selected &&
                "sticky top-0 z-20 -mx-5 bg-canvas px-5 py-2 @3xl/shell:-mx-8 @3xl/shell:px-8",
            )}
          >
            {selected && owner ? (
              <SelectionToolbar
                count={selected.size}
                total={ordered.length}
                onAll={() => setSelected(new Set(ordered.map((r) => r.card.id)))}
                onClear={() => setSelected(new Set())}
                onMove={() => owner.sections.onPickSection([...selected], stopSelecting)}
                onDone={stopSelecting}
              />
            ) : (
              <ListTools
                sections={sections}
                filters={filters}
                setFilters={setFilters}
                sort={sort}
                setSort={setSort}
                query={q}
                setQuery={setQ}
                searchRef={searchRef}
              />
            )}
          </div>
        )}

        {cards === undefined && (
          <div className="grid gap-2 pt-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}

        {groups.length > 0 && (
          <div className={clsx(sort === "az" && "pt-4")}>
            <Glossary
              groups={groups}
              sort={sort}
              openId={openId}
              onOpen={setOpen}
              now={now}
              progress={progress}
              onStart={onStartSection}
              onReview={onReviewSection}
              editing={owner && { ...owner.sections, onDropCards: owner.sections.onMoveCards }}
              movable={arranging && !st}
              selection={selected ? { ids: selected, onToggle: toggleSelected } : undefined}
            />
          </div>
        )}

        {/* The search and the filter stay in view, so no match is a line, not a screen. */}
        {shown && shown.length === 0 && cards && cards.length > 0 && (
          <NoResults
            title={query ? t`No cards match “${query}”` : t`No cards match these filters`}
            detail={query ? <Trans>Search looks at the term and the meaning.</Trans> : undefined}
            action={
              filtered ? (
                <Button size="sm" onClick={clearAll}>
                  {query ? <Trans>Clear search</Trans> : <Trans>Show all</Trans>}
                </Button>
              ) : undefined
            }
          />
        )}
      </Screen>

      {/* Beside the list: sticky, with its own scroll, so J and K walk the list while the page follows. */}
      {open && beside && (
        <aside className="sticky top-0 max-h-dvh w-[400px] shrink-0 overflow-y-auto border-s border-edge bg-plate px-7 pt-6 pb-10">
          {word}
        </aside>
      )}
      {!beside && !st && (
        <Dialog
          kind="place"
          open={!!open && !measuring}
          onOpenChange={(next) => {
            if (next) return;
            // A field being edited saves on blur, which removing the sheet would skip.
            (document.activeElement as HTMLElement | null)?.blur();
            setOpen(null);
          }}
        >
          <DialogContent
            placement="end"
            aria-labelledby={titleId}
            initialFocus={() => document.getElementById(titleId)}
            className="px-7 pt-6 pb-10"
          >
            {word}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
