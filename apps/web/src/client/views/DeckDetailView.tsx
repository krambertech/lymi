import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { deserializeState } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Archive,
  CircleCheck,
  Clock,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  SquarePlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { directionLabel, languageName } from "../components/DeckFields";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Field";
import { Segmented } from "../components/Segmented";
import { Skeleton } from "../components/Skeleton";
import { StateStripe, stateDot } from "../components/StateStripe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import type { Card, CardState, DeckSummary, Review } from "../lib/api";
import { intervalLabel } from "../lib/i18n";
import { BackButton, Page, PageHeader, type StaticNav, TopBar } from "./Shell";
import { type WordEvent, type WordPatch, WordView } from "./WordView";

type Row = { card: Card; state: CardState | null };

export interface DeckDetailProps {
  deck: DeckSummary | undefined;
  cards: Row[] | undefined;
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
  onPlayAudio?: ((card: Card) => void) | undefined;
  onSaveCard?: ((id: string, patch: WordPatch) => void) | undefined;
  /** Every deck, so a word can be moved out of this one. */
  decks?: { id: string; name: string }[] | undefined;
  onMove?: ((id: string, deckId: string) => void) | undefined;
  static?: StaticNav;
}

/** Word, meaning, status and next review as a CSV file the browser saves. */
export function exportCsv(deckName: string, rows: Row[]) {
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

/** Whole days until the card is due; 0 when it is due now or later today. */
function daysUntil(due: Date, now = Date.now()): number {
  if (due.getTime() <= now) return 0;
  return Math.max(0, Math.round((due.getTime() - now) / 86_400_000));
}

/** FSRS state as a filter bucket: 0 new, 1 and 3 learning, 2 known. */
const bucket = (s: number | null | undefined): 0 | 1 | 2 =>
  s === 2 ? 2 : s === 0 || s == null ? 0 : 1;

function reps(state: CardState | null): number {
  if (!state) return 0;
  try {
    const r = deserializeState(state.fsrs).reps;
    return typeof r === "number" ? r : 0;
  } catch {
    return 0;
  }
}

type Filter = "all" | "0" | "1" | "2";

/** "tomorrow", "in 3 days": when the deck's next card comes back, in the interface language. */
function nextDueLabel(locale: string, cards: Row[], now = Date.now()): string | null {
  let next = Number.POSITIVE_INFINITY;
  for (const { state } of cards) {
    const at = state ? new Date(state.due).getTime() : Number.NaN;
    if (at > now && at < next) next = at;
  }
  if (!Number.isFinite(next)) return null;
  const days = Math.round((next - now) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (days < 1) return rtf.format(Math.max(1, Math.round((next - now) / 3_600_000)), "hour");
  if (days < 30) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

/**
 * The deck at a glance and the button that starts its review: how many cards are due today, how
 * the whole deck splits between new, learning and known, and Review. With nothing due the plate
 * keeps its shape at zero, says when the next card is back, and offers capture where Review was.
 */
function DuePlate({
  deck,
  cards,
  counts,
  onReview,
  onAdd,
}: {
  deck: DeckSummary;
  cards: Row[];
  /** The whole deck by state: new, learning, known. */
  counts: Record<0 | 1 | 2, number>;
  onReview?: (() => void) | undefined;
  onAdd: () => void;
}) {
  const { t, i18n } = useLingui();
  const due = deck.due;
  const next = due === 0 ? nextDueLabel(i18n.locale, cards) : null;

  const split = [
    { key: "new", n: counts[0], label: t`New`, Icon: SquarePlus, tint: "text-state-new" },
    {
      key: "learning",
      n: counts[1],
      label: t`Learning`,
      Icon: Clock,
      tint: "text-state-learning",
    },
    {
      key: "known",
      n: counts[2],
      label: t`Known`,
      Icon: CircleCheck,
      tint: "text-state-known",
    },
  ];

  return (
    <section className="edge grid rounded-2xl bg-plate px-5 pt-7 pb-5 text-center @3xl:grid-cols-[auto_minmax(0,1fr)_auto] @3xl:items-center @3xl:gap-8 @3xl:px-8 @3xl:py-7 @3xl:text-start">
      <h2 className="grid justify-items-center gap-1.5 @3xl:justify-items-start">
        <span className="text-5xl font-semibold tracking-[-0.03em] tabular-nums">
          {i18n.number(due)}
        </span>
        <span className="text-md text-text-2">
          <Plural value={due} one="card due now" other="cards due now" />
        </span>
        {next && <span className="text-sm text-muted">{t`The next card is back ${next}.`}</span>}
      </h2>
      <dl className="mx-auto mt-6 grid w-full max-w-md grid-cols-3 divide-x divide-edge @3xl:mt-0">
        {split.map(({ key, n, label, Icon, tint }) => (
          <div key={key} className="grid justify-items-center gap-0.5 px-2">
            <dt className="order-last text-sm text-muted">{label}</dt>
            <dd
              className={clsx(
                "flex items-center gap-1.5 text-xl font-semibold tabular-nums",
                n === 0 && "text-muted",
              )}
            >
              <Icon className={clsx("size-[18px]", tint)} strokeWidth={2.25} aria-hidden="true" />
              {i18n.number(n)}
            </dd>
          </div>
        ))}
      </dl>
      {due > 0 ? (
        <Button
          variant="primary"
          size="lg"
          onClick={onReview}
          aria-disabled={!onReview}
          className="mt-7 w-full @3xl:mt-0 @3xl:w-auto @3xl:px-10"
        >
          <Trans>Review</Trans>
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={onAdd}
          kbd="N"
          className="mt-7 w-full @3xl:mt-0 @3xl:w-auto @3xl:px-8"
        >
          <Plus aria-hidden="true" />
          <Trans>Add card</Trans>
        </Button>
      )}
    </section>
  );
}

/**
 * One deck: today's review in a plate, the whole deck as a stripe, then its cards. The list is
 * plain: the term, its meaning under it, and on the right when it comes back and how often it
 * has been asked. State is the filter above the list, never a pill on the row. A card opens
 * beside the list on desktop and as its own screen on the phone.
 */
export function DeckDetailView({
  deck,
  cards,
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
  static: st,
}: DeckDetailProps) {
  const { t, i18n } = useLingui();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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

  const counts = useMemo(() => {
    const c = { 0: 0, 1: 0, 2: 0 };
    for (const r of cards ?? []) c[bucket(r.state?.state)]++;
    return c;
  }, [cards]);

  const shown = useMemo(() => {
    if (!cards) return cards;
    const needle = q.trim().toLowerCase();
    let rows = cards;
    if (needle) {
      rows = rows.filter(
        ({ card }) =>
          card.term.toLowerCase().includes(needle) || card.meaning?.toLowerCase().includes(needle),
      );
    }
    if (filter !== "all") rows = rows.filter((r) => bucket(r.state?.state) === Number(filter));
    return rows;
  }, [cards, q, filter]);

  // Words keep the lesson they came from. When a deck holds more than one, the list says so.
  const groups = useMemo(() => {
    if (!shown) return [];
    const order: string[] = [];
    const by = new Map<string, Row[]>();
    for (const r of shown) {
      const k = r.card.source ?? "";
      if (!by.has(k)) {
        by.set(k, []);
        order.push(k);
      }
      by.get(k)?.push(r);
    }
    return order.map((k) => ({ key: k, rows: by.get(k) ?? [] }));
  }, [shown]);
  const grouped = groups.length > 1;

  const openIndex = shown?.findIndex((r) => r.card.id === openId) ?? -1;
  const open = openIndex >= 0 ? shown?.[openIndex] : undefined;

  // Walking the list with a word open, the way a mail client does.
  useEffect(() => {
    if (!open || !shown) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") setOpen(null);
      const step = e.key === "j" ? 1 : e.key === "k" ? -1 : 0;
      const next = step ? shown[openIndex + step] : undefined;
      if (next) setOpen(next.card.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shown, openIndex, setOpen]);

  const word = open && deck && (
    <WordView
      key={open.card.id}
      card={open.card}
      state={open.state}
      deckName={deck.name}
      states={states}
      reviews={reviews}
      events={events}
      onPlayAudio={onPlayAudio ? () => onPlayAudio(open.card) : undefined}
      hasPrev={openIndex > 0}
      hasNext={!!shown && openIndex < shown.length - 1}
      onPrev={() => {
        const prev = shown?.[openIndex - 1];
        if (prev) setOpen(prev.card.id);
      }}
      onNext={() => {
        const next = shown?.[openIndex + 1];
        if (next) setOpen(next.card.id);
      }}
      onBack={() => setOpen(null)}
      onClose={() => setOpen(null)}
      onSave={onSaveCard ? (patch) => onSaveCard(open.card.id, patch) : undefined}
      onArchive={() => {
        setOpen(null);
        onArchive(open.card.id);
      }}
      decks={decks}
      onMove={onMove ? (deckId) => onMove(open.card.id, deckId) : undefined}
      variant="panel"
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
          <Trans>Deck settings</Trans>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => deck && cards && exportCsv(deck.name, cards)}
          disabled={!deck || !cards?.length}
        >
          <Download />
          <Trans>Export as CSV</Trans>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onArchiveDeck} disabled={!onArchiveDeck}>
          <Archive />
          <Trans>Archive deck</Trans>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // The plate above carries the counts, so the filter is names and dots.
  const filterLabel = (label: string, dot?: string) => (
    <span className="inline-flex items-center gap-1.5">
      {dot && <i className={clsx("size-1.5 rounded-full", dot)} aria-hidden="true" />}
      {label}
    </span>
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* On the phone the open card replaces the list, so it is a screen with a back link. */}
      {open && deck ? (
        <div className="mx-auto w-full max-w-(--column) @3xl:hidden">
          <WordView
            key={`page-${open.card.id}`}
            card={open.card}
            state={open.state}
            deckName={deck.name}
            states={states}
            reviews={reviews}
            events={events}
            onPlayAudio={onPlayAudio ? () => onPlayAudio(open.card) : undefined}
            hasPrev={openIndex > 0}
            hasNext={!!shown && openIndex < shown.length - 1}
            onPrev={() => {
              const prev = shown?.[openIndex - 1];
              if (prev) setOpen(prev.card.id);
            }}
            onNext={() => {
              const next = shown?.[openIndex + 1];
              if (next) setOpen(next.card.id);
            }}
            onBack={() => setOpen(null)}
            onSave={onSaveCard ? (patch) => onSaveCard(open.card.id, patch) : undefined}
            onArchive={() => {
              setOpen(null);
              onArchive(open.card.id);
            }}
            decks={decks}
            onMove={onMove ? (deckId) => onMove(open.card.id, deckId) : undefined}
            variant="page"
          />
        </div>
      ) : null}

      <Page className={clsx(open && "hidden @3xl:flex", open && "@3xl:me-0 @3xl:max-w-none")}>
        {/* Search opens in place of the bar on the phone; desktop keeps it beside the filter. */}
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

        {/* While the phone searches, the list is the answer, so the plate and stripe step aside. */}
        <div className={clsx(searchOpen && "hidden @3xl/shell:block")}>
          {deck === undefined || cards === undefined ? (
            <Skeleton className="h-[260px] rounded-2xl" />
          ) : cards.length > 0 ? (
            <DuePlate deck={deck} cards={cards} counts={counts} onReview={onReview} onAdd={onAdd} />
          ) : null}

          {cards && cards.length > 0 && (
            <StateStripe
              known={counts[2]}
              learning={counts[1]}
              total={cards.length}
              legend={false}
              className="mt-8 @3xl:mt-10"
            />
          )}
        </div>

        {cards && cards.length > 0 && (
          <div
            className={clsx(
              "mb-2 flex flex-wrap items-center gap-x-3 gap-y-2",
              searchOpen ? "mt-2 @3xl/shell:mt-4" : "mt-4",
            )}
          >
            <Segmented
              size="sm"
              label={t`Show`}
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: filterLabel(t`All`) },
                { value: "0", label: filterLabel(t`New`, stateDot.new) },
                { value: "1", label: filterLabel(t`Learning`, stateDot.learning) },
                { value: "2", label: filterLabel(t`Known`, stateDot.known) },
              ]}
            />
            {/* Desktop keeps search beside the filter, where "/" lands; the phone has it up top. */}
            <div className="relative ms-auto hidden w-52 min-w-0 @3xl/shell:block">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <Input
                ref={searchRef}
                enterKeyHint="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t`Search this deck`}
                aria-label={t`Search this deck`}
                autoComplete="off"
                className="ps-9"
              />
            </div>
          </div>
        )}

        {cards === undefined && (
          <div className="grid gap-2 pt-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}

        {cards && cards.length === 0 && (
          <EmptyState
            lantern="none"
            title={t`Empty deck`}
            body={t`Add the first card from your lesson. The lantern lights when one is due.`}
            action={
              <Button variant="primary" onClick={onAdd}>
                <Trans>Add card</Trans>
              </Button>
            }
            className="py-6"
          />
        )}

        {shown && shown.length > 0 && (
          <div className="grid">
            {groups.map((g) => (
              <section key={g.key} className="grid">
                {grouped && (
                  <h2 className="px-1 pb-1.5 pt-5 text-xs font-medium uppercase tracking-[0.06em] text-muted first:pt-2">
                    {g.key || t`No lesson`}
                  </h2>
                )}
                <ul className="grid gap-px">
                  {g.rows.map(({ card, state }) => {
                    const isOpen = card.id === openId;
                    const days = state ? daysUntil(new Date(state.due)) : null;
                    const dueNow = days !== null && days < 1;
                    const n = reps(state);
                    return (
                      <li key={card.id}>
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : card.id)}
                          aria-current={isOpen || undefined}
                          className={clsx(
                            "-mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 rounded-md px-3 py-2.5 text-start transition-[background-color,box-shadow] duration-150",
                            isOpen
                              ? "edge-2 bg-plate"
                              : "hoverable:hover:edge hoverable:hover:bg-plate",
                          )}
                        >
                          <span className="min-w-0 text-lg font-medium leading-[1.3] tracking-[-0.01em]">
                            <span lang={card.language ?? undefined}>{card.term}</span>
                          </span>
                          <span
                            className={clsx(
                              "row-span-2 self-start text-end text-sm tabular-nums",
                              dueNow ? "font-semibold text-amber-text" : "text-muted",
                            )}
                          >
                            {days === null
                              ? t`new`
                              : dueNow
                                ? t`today`
                                : intervalLabel(i18n, new Date(0), new Date(days * 86_400_000))}
                            {n > 0 && (
                              <span className="block text-2xs font-normal text-muted">
                                <Plural value={n} one="# review" other="# reviews" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 truncate text-base text-text-2">
                            {card.meaning ?? (
                              <span className="text-faint">
                                <Trans>No meaning yet</Trans>
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {shown && shown.length === 0 && cards && cards.length > 0 && (
          <EmptyState
            lantern="none"
            title={q ? t`Nothing matches “${q}”` : t`Nothing here`}
            body={
              q
                ? t`Search looks at the term and its meaning.`
                : t`Every card in this deck is somewhere else in the schedule.`
            }
            action={
              <Button
                onClick={() => {
                  setQ("");
                  setFilter("all");
                }}
              >
                <Trans>Clear</Trans>
              </Button>
            }
            className="py-6"
          />
        )}
      </Page>

      {/* Desktop: the card beside the list. Sticky, with its own scroll, so J and K walk the
          list while the page follows. */}
      {word && (
        <aside className="sticky top-0 hidden max-h-dvh w-[400px] shrink-0 overflow-y-auto border-s border-edge bg-canvas px-7 pb-10 pt-6 @3xl:block">
          {word}
        </aside>
      )}
    </div>
  );
}
