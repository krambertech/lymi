import type { Card, CardState } from "@lymi/core/schema";
import { Link } from "@tanstack/react-router";
import { Archive, ChevronLeft, Download, MoreHorizontal, Pencil, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { SourceChip, StateChip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { Input } from "../components/Field";
import { Menu, MenuItem, MenuList, MenuSeparator, MenuTrigger } from "../components/Menu";
import { Skeleton } from "../components/Skeleton";
import { Table, Td, Th } from "../components/Table";
import type { DeckSummary } from "../lib/api";
import { Page, PageHeader, type StaticNav } from "./Shell";

export interface DeckDetailProps {
  deck: DeckSummary | undefined;
  cards: { card: Card; state: CardState | null }[] | undefined;
  onAdd: () => void;
  onArchive: (id: string) => void;
  onReview?: (() => void) | undefined;
  /** Rename the deck. Absent on the design page, where the menu is for show. */
  onRename?: ((name: string) => Promise<unknown> | undefined) | undefined;
  onArchiveDeck?: (() => void) | undefined;
  static?: StaticNav;
}

/** Word, meaning, status and next review as a CSV file the browser saves. */
export function exportCsv(deckName: string, rows: { card: Card; state: CardState | null }[]) {
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
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
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

export function DeckDetailView({
  deck,
  cards,
  onAdd,
  onArchive,
  onReview,
  onRename,
  onArchiveDeck,
  static: st,
}: DeckDetailProps) {
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (renaming) renameRef.current?.select();
  }, [renaming]);
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
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !cards) return cards;
    return cards.filter(
      ({ card }) =>
        card.term.toLowerCase().includes(needle) || card.meaning?.toLowerCase().includes(needle),
    );
  }, [cards, q]);

  const backCls =
    "inline-flex min-h-10 items-center gap-0.5 text-sm text-muted hoverable:hover:text-text @3xl:hidden";
  const back = (
    <>
      <ChevronLeft className="size-4" aria-hidden="true" />
      Library
    </>
  );

  return (
    <Page>
      <PageHeader
        eyebrow={
          st ? (
            <a href="/library" onClick={(e) => e.preventDefault()} className={backCls}>
              {back}
            </a>
          ) : (
            <Link to="/library" className={backCls}>
              {back}
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
            <span className="flex items-baseline gap-2.5">
              {deck.name}
              {deck.defaultLanguage && (
                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
                  {deck.defaultLanguage}
                </span>
              )}
            </span>
          ) : (
            <Skeleton className="h-8 w-40" />
          )
        }
        actions={
          <>
            <Button size="sm" kbd="N" onClick={onAdd}>
              Add word
            </Button>
            {deck && deck.due > 0 && (
              <Button variant="primary" size="sm" onClick={onReview}>
                Review {deck.due} due
              </Button>
            )}
            <Menu>
              <MenuTrigger>
                {(p) => (
                  <IconButton label="Deck options" size="sm" {...p}>
                    <MoreHorizontal />
                  </IconButton>
                )}
              </MenuTrigger>
              <MenuList>
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
          </>
        }
      >
        {deck && (
          <p className="text-sm text-muted tabular-nums">
            {deck.due > 0 && (
              <b className="mr-3 font-semibold text-amber-text">{deck.due} due today</b>
            )}
            {deck.total} {deck.total === 1 ? "card" : "cards"}
          </p>
        )}
      </PageHeader>

      {cards && cards.length > 0 && (
        <div className="relative mb-3 max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search this deck"
            aria-label="Search this deck"
            className="pl-9"
          />
        </div>
      )}

      {cards === undefined && (
        <div className="grid gap-2 pt-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
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
        <Table>
          <thead>
            <tr>
              <Th>Word</Th>
              <Th>Meaning</Th>
              <Th className="hidden @2xl:table-cell">Status</Th>
              <Th align="right" className="hidden @2xl:table-cell">
                Next
              </Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {shown.map(({ card, state }) => (
              <tr key={card.id} className="group transition-colors hoverable:hover:bg-plate">
                <Td className="whitespace-nowrap text-md font-medium">
                  <span lang={card.language ?? undefined}>{card.term}</span>
                </Td>
                <Td className="w-full text-text-2 @2xl:min-w-44">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {card.meaning ?? <span className="text-faint">—</span>}
                    {card.meaningSource === "ai" && <SourceChip source="ai" field="meaning" />}
                  </span>
                </Td>
                <Td className="hidden @2xl:table-cell">
                  <StateChip state={state?.state} />
                </Td>
                <Td align="right" className="hidden whitespace-nowrap text-muted @2xl:table-cell">
                  {state ? nextLabel(new Date(state.due)) : "—"}
                </Td>
                <Td className="py-1.5">
                  <IconButton
                    label={`Archive ${card.term}`}
                    size="sm"
                    onClick={() => onArchive(card.id)}
                    className="transition-opacity focus-visible:opacity-100 hoverable:opacity-0 hoverable:group-hover:opacity-100"
                  >
                    <Archive />
                  </IconButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {shown && shown.length === 0 && cards && cards.length > 0 && (
        <p className="py-8 text-center text-base text-muted">Nothing matches “{q}”.</p>
      )}
    </Page>
  );
}
