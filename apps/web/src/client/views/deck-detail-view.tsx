import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Archive,
  ArrowUpDown,
  Download,
  KeyRound,
  ListFilter,
  MoreHorizontal,
  Plug,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "../components/button";
import { Chip } from "../components/chip";
import { directionLabel, languageName } from "../components/deck-fields";
import { NoResults } from "../components/empty-state";
import { NextStep, NextSteps } from "../components/next-steps";
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
import type { CardState, DeckSummary, Review } from "../lib/api";
import {
  activeFilterCount,
  type DeckFilters,
  type DeckGroup,
  type DeckRow,
  type DeckSort,
  dueBucket,
  filterRows,
  groupRows,
  lessonsOf,
  noFilters,
  rowState,
  splitForms,
} from "../lib/deck-list";
import { BackButton, Page, PageHeader, type StaticNav, TopBar } from "./shell";
import { type WordEvent, type WordPatch, WordView } from "./word-view";

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

export interface DeckDetailProps {
  deck: DeckSummary | undefined;
  cards: DeckRow[] | undefined;
  /** Where today's goal stands, for the line under the due count. */
  streak?: StreakSummary | undefined;
  onAdd: () => void;
  onArchive: (id: string) => void;
  onReview?: (() => void) | undefined;
  onSettings?: (() => void) | undefined;
  onArchiveDeck?: (() => void) | undefined;
  /** The word that is open, if one is. The view owns it when the route does not. */
  openCardId?: string | null | undefined;
  onOpen?: ((id: string | null) => void) | undefined;
  /** The open word's history and every direction's state, when the route has fetched them. */
  states?: CardState[] | undefined;
  reviews?: Review[] | undefined;
  events?: WordEvent[] | undefined;
  /** Play the word's pronunciation. Absent, the Say button is not drawn. */
  onPlayAudio?: ((card: DeckRow["card"]) => void) | undefined;
  onSaveCard?: ((id: string, patch: WordPatch) => void) | undefined;
  /** Every deck, so a word can be moved out of this one. */
  decks?: { id: string; name: string }[] | undefined;
  onMove?: ((id: string, deckId: string) => void) | undefined;
  /** How to connect an assistant, offered while the deck has no cards. */
  connectUrl?: string | undefined;
  /** Whether an assistant is connected; undefined while unknown, so its row does not flash. */
  connected?: boolean | undefined;
  /** Draw an open card beside the list at any width, for the design system's narrower frames. */
  cardBeside?: boolean | undefined;
  static?: StaticNav;
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

const startOfDay = (at: number) => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

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

/** When one card is back, by calendar day: "later today", "tomorrow", "in 12 days". */
function backLabel(locale: string, due: number, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (days < 30) return rtf.format(Math.max(days, 0), "day");
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
}: {
  deck: DeckSummary;
  cards: DeckRow[];
  streak?: StreakSummary | undefined;
  onReview?: (() => void) | undefined;
  onAdd: () => void;
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
        <section
          aria-label={t`Today`}
          className="edge flex flex-wrap items-center gap-x-4 gap-y-4 rounded-xl bg-plate p-5 @md/plates:ps-6"
        >
          <p className="text-4xl font-semibold leading-none tracking-[-0.03em] tabular-nums">
            {i18n.number(due)}
          </p>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="text-md text-text">
              <Plural value={due} one="card to review now" other="cards to review now" />
            </p>
            {next ? (
              <p className="text-sm text-muted">{t`The next card is back ${next}.`}</p>
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
            <Button onClick={onAdd} kbd="N" className="w-full @md/plates:w-auto">
              <Plus aria-hidden="true" />
              <Trans>Add card</Trans>
            </Button>
          )}
        </section>
        {/* Four columns hold a count in the hundreds only on a wide plate; a narrow one stacks the total over chips. */}
        <div className="edge grid gap-3 rounded-xl bg-plate p-5 @md/plates:hidden">
          <p className="text-xl font-semibold proportional-nums">
            <Plural value={total} one="# card" other="# cards" />
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip className={clsx("proportional-nums!", counts.new === 0 && "text-muted")}>
              <StateIcon state="new" className="size-3" />
              <Trans>{counts.new} new</Trans>
            </Chip>
            <Chip className={clsx("proportional-nums!", counts.learning === 0 && "text-muted")}>
              <StateIcon state="learning" className="size-3" />
              <Trans>{counts.learning} learning</Trans>
            </Chip>
            <Chip className={clsx("proportional-nums!", counts.known === 0 && "text-muted")}>
              <StateIcon state="known" className="size-3" />
              <Trans>{counts.known} known</Trans>
            </Chip>
          </div>
        </div>
        <dl className="edge hidden grid-cols-4 items-center rounded-xl bg-plate py-4 divide-x divide-edge @md/plates:grid">
          <div className="grid justify-items-center gap-0.5 px-2">
            <dt className="order-last text-sm text-muted">
              <Trans context="cards in this deck">Total</Trans>
            </dt>
            <dd className="text-xl font-semibold proportional-nums">{i18n.number(total)}</dd>
          </div>
          {(["new", "learning", "known"] as const).map((key) => (
            <div key={key} className="grid justify-items-center gap-0.5 px-2">
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
  cards,
  filters,
  setFilters,
  sort,
  setSort,
  query,
  setQuery,
  searchRef,
}: {
  cards: DeckRow[];
  filters: DeckFilters;
  setFilters: (next: DeckFilters) => void;
  sort: DeckSort;
  setSort: (next: DeckSort) => void;
  query: string;
  setQuery: (next: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const { t, i18n } = useLingui();
  const lessons = useMemo(() => lessonsOf(cards), [cards]);
  const lessonName = (lesson: string) => lesson || t`No lesson`;
  const dueName = { today: t`Due today`, week: t`Due this week` };
  const sortName: Record<DeckSort, string> = {
    lesson: t`Lesson`,
    due: t`When it’s back`,
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
    ...filters.lessons.map((lesson) => ({
      key: `lesson:${lesson}`,
      label: lessonName(lesson),
      remove: () => setFilters({ ...filters, lessons: toggle(filters.lessons, lesson, false) }),
    })),
  ];

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm">
                <ListFilter aria-hidden="true" />
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
            {lessons.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <Trans>Lesson</Trans>
                  </DropdownMenuLabel>
                  {lessons.map((lesson) => (
                    <DropdownMenuCheckboxItem
                      key={lesson || "none"}
                      checked={filters.lessons.includes(lesson)}
                      onCheckedChange={(on) =>
                        setFilters({ ...filters, lessons: toggle(filters.lessons, lesson, on) })
                      }
                    >
                      <span className="truncate">{lessonName(lesson)}</span>
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
                <ArrowUpDown aria-hidden="true" />
                {sortName[sort]}
              </Button>
            }
          />
          <DropdownMenuContent aria-label={t`Sort`}>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as DeckSort)}>
              {(["lesson", "due", "added", "az"] as const).map((key) => (
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
 * The words as a glossary: each row the state's mark, the term with its other forms lighter, and
 * the meaning, which drops under the term when the list is narrow. Text wraps and is never cut,
 * because it is the content. A date shows only under the When it's back sort.
 */
function Glossary({
  groups,
  sort,
  openId,
  onOpen,
  now,
}: {
  groups: DeckGroup[];
  sort: DeckSort;
  openId: string | null;
  onOpen: (id: string | null) => void;
  now: number;
}) {
  const { t, i18n } = useLingui();
  const heading = (group: DeckGroup): string | null => {
    switch (group.kind) {
      case "all":
        return null;
      case "lesson":
        return group.lesson || t`No lesson`;
      case "due":
        return {
          now: t`Due now`,
          week: t`This week`,
          later: t`Later`,
          new: t`Not started`,
        }[group.bucket];
      case "day": {
        const days = Math.round((startOfDay(now) - group.day.getTime()) / DAY);
        if (days === 0) return t`Today`;
        if (days === 1) return t`Yesterday`;
        const sameYear = group.day.getFullYear() === new Date(now).getFullYear();
        return i18n.date(group.day, {
          day: "numeric",
          month: "long",
          ...(sameYear ? {} : { year: "numeric" }),
        });
      }
    }
  };

  return (
    <div className="@container/list grid">
      {groups.map((group) => {
        const label = heading(group);
        return (
          <section key={group.key} className="grid" aria-label={label ?? undefined}>
            {label && (
              <h2 className="px-1 pt-7 pb-2.5 text-md font-medium text-balance text-text">
                {label}
                {/* Read as "Lesson 14, 4" rather than "Lesson 144". */}
                <span className="sr-only">, </span>
                <span className="ms-2 text-sm font-normal text-muted">
                  {i18n.number(group.rows.length)}
                </span>
              </h2>
            )}
            <ul className="edge divide-y divide-edge overflow-hidden rounded-lg bg-plate">
              {group.rows.map((row) => {
                const { card, state } = row;
                const { word, forms } = splitForms(card.term);
                const bucket = sort === "due" ? dueBucket(row, now) : null;
                const date =
                  state && (bucket === "week" || bucket === "later")
                    ? backLabel(i18n.locale, new Date(state.due).getTime(), now)
                    : null;
                const key = rowState(row);
                const isOpen = card.id === openId;
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      data-card-row={card.id}
                      onClick={() => onOpen(isOpen ? null : card.id)}
                      aria-current={isOpen || undefined}
                      className={clsx(
                        "grid w-full items-start gap-x-3 gap-y-0.5 px-4 py-3 text-start transition-colors duration-150 focus-visible:outline-offset-[-2px] @xl/list:items-baseline @xl/list:gap-x-5 @xl/list:px-5",
                        // Every row under this sort keeps the date's column, so meanings line up across groups.
                        sort === "due"
                          ? "grid-cols-[15px_minmax(0,1fr)_auto] @xl/list:grid-cols-[15px_minmax(0,1fr)_minmax(0,1.15fr)_8rem]"
                          : "grid-cols-[15px_minmax(0,1fr)] @xl/list:grid-cols-[15px_minmax(0,1fr)_minmax(0,1.15fr)]",
                        isOpen ? "bg-hover" : "hoverable:hover:bg-plate-2",
                      )}
                    >
                      <span className="row-span-2 mt-[3px] self-start @xl/list:row-span-1">
                        <StateIcon state={key} className="size-[15px]" />
                        <span className="sr-only">{i18n._(stateMarks[key].label)}</span>
                      </span>
                      <span
                        className="col-start-2 row-start-1 text-lg font-medium leading-snug text-text [overflow-wrap:anywhere]"
                        lang={card.language ?? undefined}
                      >
                        {word}
                        {forms && (
                          <span className="font-normal text-text-2">
                            {" · "}
                            {forms}
                          </span>
                        )}
                      </span>
                      <span
                        className={clsx(
                          "col-start-2 row-start-2 text-md leading-snug [overflow-wrap:anywhere] @xl/list:col-start-3 @xl/list:row-start-1",
                          card.meaning ? "text-text-2" : "text-faint",
                        )}
                      >
                        {card.meaning ?? <Trans>No meaning yet</Trans>}
                      </span>
                      {date && (
                        <span className="col-start-3 row-start-1 whitespace-nowrap text-end text-sm text-muted @xl/list:col-start-4">
                          {date}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
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
  onAdd,
  onArchive,
  onReview,
  onSettings,
  onArchiveDeck,
  openCardId,
  onOpen,
  states,
  reviews,
  events,
  onPlayAudio,
  onSaveCard,
  decks,
  onMove,
  cardBeside,
  connectUrl,
  connected,
  static: st,
}: DeckDetailProps) {
  const { t, i18n } = useLingui();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<DeckFilters>(noFilters);
  const [sort, setSort] = useState<DeckSort>("lesson");
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
    () => (cards ? filterRows(cards, filters, q, now) : undefined),
    [cards, filters, q, now],
  );
  const groups = useMemo(
    () => (shown ? groupRows(shown, sort, now, i18n.locale) : []),
    [shown, sort, now, i18n.locale],
  );
  const ordered = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

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
      states={states}
      reviews={reviews}
      events={events}
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
      onSave={onSaveCard ? (patch) => onSaveCard(shownWord.card.id, patch) : undefined}
      onArchive={() => {
        setOpen(null);
        onArchive(shownWord.card.id);
      }}
      decks={decks}
      onMove={onMove ? (deckId) => onMove(shownWord.card.id, deckId) : undefined}
      titleId={titleId}
      onBusyChange={setBusy}
    />
  );

  const addButton = (
    <IconButton label={t`Add card`} onClick={onAdd}>
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
          <Trans>Settings</Trans>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => deck && cards && exportCsv(deck.name, cards)}
          disabled={!deck || !cards?.length}
        >
          <Download />
          {cards?.some((row) => row.card.image) ? (
            <Trans>Export as CSV without pictures</Trans>
          ) : (
            <Trans>Export as CSV</Trans>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onArchiveDeck} disabled={!onArchiveDeck}>
          <Archive />
          <Trans>Archive</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const query = q.trim();
  const filtered = query !== "" || activeFilterCount(filters) > 0;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1">
      <Page>
        {/* Search opens in place of the bar on the phone; desktop keeps it beside the tools. */}
        {searchOpen ? (
          <header className="-mt-2 mb-2 flex h-14 items-center gap-2 @3xl/shell:hidden">
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
          </header>
        ) : (
          <TopBar
            back={
              <BackButton label={t`Library`}>
                {(className, content) =>
                  st ? (
                    <a href="/library" onClick={(e) => e.preventDefault()} className={className}>
                      {content}
                    </a>
                  ) : (
                    <Link to="/library" className={className}>
                      {content}
                    </Link>
                  )
                }
              </BackButton>
            }
            actions={
              <>
                {cards && cards.length > 0 && (
                  <IconButton label={t`Search this deck`} onClick={() => setSearchOpen(true)}>
                    <Search />
                  </IconButton>
                )}
                {addButton}
                {deckMenu}
              </>
            }
          />
        )}
        <PageHeader
          title={deck ? deck.name : <Skeleton className="h-8 w-40" />}
          sub={
            deck
              ? [
                  deck.defaultLanguage ? languageName(deck.defaultLanguage) : null,
                  deck.directions !== "recognition" ? directionLabel(deck.directions) : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              : undefined
          }
          actions={
            <span className="hidden items-center gap-1.5 @3xl/shell:flex">
              {addButton}
              {deckMenu}
            </span>
          }
        />

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
              onAdd={onAdd}
            />
          ) : (
            <StartPanel
              title={<Trans>No cards in {deck.name} yet</Trans>}
              body={<Trans>Add cards from your last lesson, then review them here.</Trans>}
              action={
                <Button variant="primary" className="justify-self-start" onClick={onAdd} kbd="N">
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
          <div className={clsx(searchOpen ? "mt-2 @3xl/shell:mt-6" : "mt-6")}>
            <ListTools
              cards={cards}
              filters={filters}
              setFilters={setFilters}
              sort={sort}
              setSort={setSort}
              query={q}
              setQuery={setQ}
              searchRef={searchRef}
            />
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
            <Glossary groups={groups} sort={sort} openId={openId} onOpen={setOpen} now={now} />
          </div>
        )}

        {/* The search and the filter stay in view, so no match is a line, not a screen. */}
        {shown && shown.length === 0 && cards && cards.length > 0 && (
          <NoResults
            title={query ? t`Nothing matches “${query}”` : t`No cards match these filters`}
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
      </Page>

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
