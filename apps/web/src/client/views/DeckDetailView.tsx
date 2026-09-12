import { deserializeState, retrievability } from "@lymi/core";
import type { Card, CardState, Review } from "@lymi/core/schema";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  Archive,
  ChevronLeft,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { directionLabel, languageName } from "../components/DeckFields";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Field";
import { Menu, MenuItem, MenuList, MenuSeparator, MenuTrigger } from "../components/Menu";
import { Segmented } from "../components/Segmented";
import { Skeleton } from "../components/Skeleton";
import { StateStripe } from "../components/StateStripe";
import type { DeckSummary } from "../lib/api";
import { Page, PageHeader, type StaticNav } from "./Shell";
import { type WordEvent, type WordPatch, WordView } from "./WordView";

type Row = { card: Card; state: CardState | null };

export interface DeckDetailProps {
  deck: DeckSummary | undefined;
  cards: Row[] | undefined;
  onAdd: () => void;
  onArchive: (id: string) => void;
  onReview?: (() => void) | undefined;
  /** Rename the deck. Absent on the design page, where the menu is for show. */
  onRename?: ((name: string) => Promise<unknown> | undefined) | undefined;
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

export function nextLabel(due: Date, now = Date.now()): string {
  if (due.getTime() <= now) return "today";
  const days = Math.round((due.getTime() - now) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days} d`;
  return `${Math.round(days / 30)} mo`;
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

function recallOf(state: CardState | null): number {
  if (!state) return 0;
  try {
    const c = deserializeState(state.fsrs);
    return typeof c.stability === "number" ? retrievability(c) : 0;
  } catch {
    return 0;
  }
}

type Filter = "all" | "0" | "1" | "2";

/**
 * One deck: what it is, how it stands, and its words. The header is three lines with one job
 * each. The list is plain: the word, its meaning under it, and on the right when it comes
 * back and how often it has been asked. State is the filter above the list, never a pill on
 * the row. A word opens beside the list on desktop and as its own screen on the phone.
 */
export function DeckDetailView({
  deck,
  cards,
  onAdd,
  onArchive,
  onReview,
  onRename,
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
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);

  // "/" puts the caret in the deck's own search, the shortcut PRODUCT.md promises.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const startRename = () => {
    if (!deck) return;
    setDraft(deck.name);
    setRenaming(true);
  };
  const commitRename = async () => {
    const name = draft.trim();
    setRenaming(false);
    if (deck && name && name !== deck.name) await onRename?.(name);
  };

  const counts = useMemo(() => {
    const c = { 0: 0, 1: 0, 2: 0 };
    for (const r of cards ?? []) c[bucket(r.state?.state)]++;
    return c;
  }, [cards]);
  const recall = useMemo(() => {
    if (!cards?.length) return undefined;
    return cards.reduce((n, r) => n + recallOf(r.state), 0) / cards.length;
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

  const total = cards?.length ?? deck?.total ?? 0;
  const backCls =
    "inline-flex min-h-10 items-center gap-0.5 text-sm text-muted hoverable:hover:text-text @3xl:hidden";

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

  const filterLabel = (label: string, n: number) => (
    <span className="inline-flex items-baseline gap-1.5">
      {label}
      <span className="text-2xs text-muted tabular-nums">{n}</span>
    </span>
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* On the phone the open word replaces the list, so it is a screen with a back link. */}
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

      <Page className={clsx(open && "hidden @3xl:flex", open && "@3xl:mr-0 @3xl:max-w-none")}>
        <PageHeader
          eyebrow={
            st ? (
              <a href="/library" onClick={(e) => e.preventDefault()} className={backCls}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Library
              </a>
            ) : (
              <Link to="/library" className={backCls}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Library
              </Link>
            )
          }
          title={
            deck && renaming ? (
              <Input
                ref={renameRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                aria-label="Deck name"
                className="h-10 w-72 max-w-full text-2xl font-medium"
              />
            ) : deck ? (
              deck.name
            ) : (
              <Skeleton className="h-8 w-40" />
            )
          }
          sub={
            deck
              ? [
                  deck.defaultLanguage ? languageName(deck.defaultLanguage) : null,
                  `${total} ${total === 1 ? "card" : "cards"}`,
                  deck.directions !== "recognition" ? directionLabel(deck.directions) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : undefined
          }
          actions={
            <Menu>
              <MenuTrigger>
                {(p) => (
                  <IconButton label="Deck options" {...p}>
                    <MoreHorizontal />
                  </IconButton>
                )}
              </MenuTrigger>
              <MenuList>
                <MenuItem icon={<Settings2 />} onSelect={onSettings} disabled={!onSettings}>
                  Deck settings
                </MenuItem>
                <MenuItem icon={<Pencil />} onSelect={startRename} disabled={!deck || !onRename}>
                  Rename
                </MenuItem>
                <MenuItem
                  icon={<Download />}
                  onSelect={() => deck && cards && exportCsv(deck.name, cards)}
                  disabled={!deck || !cards?.length}
                >
                  Export as CSV
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  icon={<Archive />}
                  tone="danger"
                  onSelect={onArchiveDeck}
                  disabled={!onArchiveDeck}
                >
                  Archive deck
                </MenuItem>
              </MenuList>
            </Menu>
          }
        >
          {cards && cards.length > 0 ? (
            <StateStripe
              known={counts[2]}
              learning={counts[1]}
              total={cards.length}
              recall={recall}
              className="mt-4 max-w-[560px]"
            />
          ) : cards === undefined ? (
            <Skeleton className="mt-4 h-9 w-72" />
          ) : null}
          <div className="mt-5 flex gap-2">
            {deck && deck.due > 0 && (
              <Button variant="primary" onClick={onReview} aria-disabled={!onReview}>
                Review {deck.due} due
              </Button>
            )}
            <Button onClick={onAdd} kbd="N">
              <Plus aria-hidden="true" />
              Add word
            </Button>
          </div>
        </PageHeader>

        {cards && cards.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Segmented
              size="sm"
              label="Show"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: filterLabel("All", cards.length) },
                { value: "0", label: filterLabel("New", counts[0]) },
                { value: "1", label: filterLabel("Learning", counts[1]) },
                { value: "2", label: filterLabel("Known", counts[2]) },
              ]}
            />
            <div className="relative min-w-0 basis-full @md:ml-auto @md:basis-44">
              <Search
                className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search this deck"
                aria-label="Search this deck"
                autoComplete="off"
                className="h-9 w-full bg-transparent pl-6 text-[16px] text-text outline-none placeholder:text-muted md:text-sm"
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
            title="Empty deck"
            body="Add the first word from your lesson. The lantern lights when a card is due."
            action={
              <Button variant="primary" onClick={onAdd}>
                Add word
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
                    {g.key || "No lesson"}
                  </h2>
                )}
                <ul className="grid gap-px">
                  {g.rows.map(({ card, state }) => {
                    const isOpen = card.id === openId;
                    const due = state ? nextLabel(new Date(state.due)) : null;
                    const n = reps(state);
                    return (
                      <li key={card.id}>
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : card.id)}
                          aria-current={isOpen || undefined}
                          className={clsx(
                            "-mx-3 grid w-[calc(100%+1.5rem)] grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 rounded-md px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-150",
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
                              "row-span-2 self-start text-right text-sm tabular-nums",
                              due === "today" ? "font-semibold text-amber-text" : "text-muted",
                            )}
                          >
                            {due ?? "new"}
                            {n > 0 && (
                              <span className="block text-2xs font-normal text-muted">
                                {n} {n === 1 ? "review" : "reviews"}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 truncate text-base text-text-2">
                            {card.meaning ?? <span className="text-faint">No meaning yet</span>}
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
            title={q ? `Nothing matches “${q}”` : "Nothing here"}
            body={
              q
                ? "Search looks at the word and its meaning."
                : "Every word in this deck is somewhere else in the schedule."
            }
            action={
              <Button
                onClick={() => {
                  setQ("");
                  setFilter("all");
                }}
              >
                Clear
              </Button>
            }
            className="py-6"
          />
        )}
      </Page>

      {/* Desktop: the word beside the list. Sticky, with its own scroll, so J and K walk the
          list while the page follows. */}
      {word && (
        <aside className="sticky top-0 hidden max-h-dvh w-[400px] shrink-0 overflow-y-auto border-l border-edge bg-canvas px-7 pb-10 pt-6 @3xl:block">
          {word}
        </aside>
      )}
    </div>
  );
}
