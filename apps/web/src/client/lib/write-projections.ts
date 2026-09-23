import {
  type CardPatch,
  directionsFromModes,
  modeKey,
  modeOf,
  modesFromDirections,
  normaliseTerm,
} from "@lymi/core";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Card, CardHit, CardState, DeckSummary, Me } from "./api";
import type { DeckPatch, QueuedWrite, Write } from "./writes";

/**
 * How a write still on the device shows in the lists the query cache holds: once when it is made,
 * and again on top of every fetch until the server has it, so a refetch never hides it.
 */
type DeckRow = { card: Card; state: CardState | null };

/** Finds a card or deck in whatever the cache holds, for writes that name only an id. */
export interface Lookup {
  card: (id: string) => Card | undefined;
  deck: (id: string) => DeckSummary | undefined;
  me: Me | undefined;
}

/** Read once, before any list changes, so a write moving an item between lists still finds it. */
export function cacheLookup(qc: QueryClient): Lookup {
  const cards = new Map<string, Card>();
  for (const card of qc.getQueryData<CardHit[]>(["cards", "archived"]) ?? [])
    cards.set(card.id, card);
  for (const [key, rows] of qc.getQueriesData<DeckRow[]>({ queryKey: ["decks"] })) {
    if (shapeOf(key)?.shape !== "deckCards" || !Array.isArray(rows)) continue;
    for (const row of rows) cards.set(row.card.id, row.card);
  }
  const decks = new Map<string, DeckSummary>();
  for (const key of [["decks", "archived"], ["decks"]]) {
    for (const deck of qc.getQueryData<DeckSummary[]>(key) ?? []) decks.set(deck.id, deck);
  }
  return {
    card: (id) => cards.get(id),
    deck: (id) => decks.get(id),
    me: qc.getQueryData<Me>(["me"]),
  };
}

type Shape = "decks" | "archivedDecks" | "deckCards" | "archivedCards";

function shapeOf(key: QueryKey): { shape: Shape; deckId?: string } | null {
  if (key[0] === "decks" && key.length === 1) return { shape: "decks" };
  if (key[0] === "decks" && key[1] === "archived" && key.length === 2) {
    return { shape: "archivedDecks" };
  }
  if (key[0] === "decks" && key[2] === "cards" && key.length === 3) {
    return { shape: "deckCards", deckId: String(key[1]) };
  }
  if (key[0] === "cards" && key[1] === "archived" && key.length === 2) {
    return { shape: "archivedCards" };
  }
  return null;
}

/** A card as the server will present it, from the add that makes it. */
export function localCard(w: Extract<Write, { kind: "card.add" }>, lookup: Lookup): Card {
  const { input } = w;
  const now = new Date();
  const deck = lookup.deck(input.deckId);
  return {
    id: input.id,
    userId: lookup.me?.id ?? "",
    deckId: input.deckId,
    term: input.term,
    normalizedTerm: normaliseTerm(input.term),
    meaning: input.meaning ?? null,
    pronunciation: input.pronunciation ?? null,
    example: input.example ?? null,
    notes: input.notes ?? null,
    language: input.language === undefined ? (deck?.defaultLanguage ?? null) : input.language,
    tags: input.tags ?? [],
    source: input.source ?? null,
    directions: null,
    reviewModes: input.reviewModes ?? null,
    imageVersion: null,
    importId: null,
    externalId: null,
    sectionId: input.sectionId ?? null,
    meaningSource: input.meaningSource ?? (input.meaning ? "manual" : null),
    exampleSource: input.exampleSource ?? (input.example ? "manual" : null),
    pronunciationSource: input.pronunciationSource ?? (input.pronunciation ? "manual" : null),
    enrichmentStatus: null,
    audioKey: null,
    createdBy: "user",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    image: null,
  };
}

/** A deck as Library will list it, from the create that makes it. */
export function localDeck(w: Extract<Write, { kind: "deck.create" }>, lookup: Lookup): DeckSummary {
  const { input } = w;
  const directions =
    input.directions ??
    (input.reviewModes ? directionsFromModes(input.reviewModes.map(modeKey)) : "recognition");
  return {
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    defaultLanguage: input.defaultLanguage ?? null,
    directions,
    position: 0,
    seriesId: input.seriesId ?? null,
    sectionProgression: input.sectionProgression ?? "automatic",
    reviewModes: modesFromDirections(directions).map(modeOf),
    total: 0,
    due: 0,
    archivedAt: null,
    role: "owner",
    owner: { id: lookup.me?.id ?? "", name: lookup.me?.name ?? "", avatarUrl: null },
    published: false,
  };
}

export function patchCard(card: Card, patch: CardPatch): Card {
  const { directions: _legacy, reviewModes, ...fields } = patch;
  const next: Card = { ...card };
  for (const [field, value] of Object.entries(fields)) {
    if (value !== undefined) (next as Record<string, unknown>)[field] = value;
  }
  if (reviewModes !== undefined) next.reviewModes = reviewModes;
  if (patch.term !== undefined) next.normalizedTerm = normaliseTerm(patch.term);
  // A section belongs to one deck, so a move without a section leaves it, as the server does.
  if (patch.deckId && patch.deckId !== card.deckId && patch.sectionId === undefined) {
    next.sectionId = null;
  }
  return next;
}

export function patchDeck(deck: DeckSummary, patch: DeckPatch): DeckSummary {
  const next: DeckSummary = { ...deck };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.defaultLanguage !== undefined) next.defaultLanguage = patch.defaultLanguage;
  if (patch.sectionProgression !== undefined) next.sectionProgression = patch.sectionProgression;
  if (patch.seriesId !== undefined) next.seriesId = patch.seriesId;
  const directions =
    patch.directions ??
    (patch.reviewModes ? directionsFromModes(patch.reviewModes.map(modeKey)) : undefined);
  if (directions) {
    next.directions = directions;
    next.reviewModes = modesFromDirections(directions).map(modeOf);
  }
  return next;
}

const retotal = (decks: DeckSummary[], deckId: string | undefined, by: number) =>
  deckId
    ? decks.map((d) => (d.id === deckId ? { ...d, total: Math.max(0, d.total + by) } : d))
    : decks;

function onDecks(decks: DeckSummary[], w: Write, lookup: Lookup): DeckSummary[] {
  switch (w.kind) {
    case "deck.create":
      return decks.some((d) => d.id === w.input.id) ? decks : [...decks, localDeck(w, lookup)];
    case "deck.update":
      return decks.map((d) => (d.id === w.id ? patchDeck(d, w.patch) : d));
    case "deck.archive":
      return decks.filter((d) => d.id !== w.id);
    case "deck.restore": {
      const deck = lookup.deck(w.id);
      if (!deck || decks.some((d) => d.id === w.id)) return decks;
      return [...decks, { ...deck, archivedAt: null }];
    }
    case "card.add":
      return retotal(decks, w.input.deckId, 1);
    case "card.archive":
      return retotal(decks, lookup.card(w.id)?.deckId, -1);
    case "card.restore":
      return retotal(decks, lookup.card(w.id)?.deckId, 1);
    default:
      return decks;
  }
}

function onArchivedDecks(decks: DeckSummary[], w: Write, lookup: Lookup): DeckSummary[] {
  switch (w.kind) {
    case "deck.archive": {
      const deck = lookup.deck(w.id);
      if (!deck || decks.some((d) => d.id === w.id)) return decks;
      return [{ ...deck, archivedAt: new Date().toISOString() }, ...decks];
    }
    case "deck.restore":
      return decks.filter((d) => d.id !== w.id);
    case "deck.update":
      return decks.map((d) => (d.id === w.id ? patchDeck(d, w.patch) : d));
    default:
      return decks;
  }
}

function onDeckCards(rows: DeckRow[], deckId: string, w: Write, lookup: Lookup): DeckRow[] {
  switch (w.kind) {
    case "card.add":
      if (w.input.deckId !== deckId || rows.some((row) => row.card.id === w.input.id)) return rows;
      return [{ card: localCard(w, lookup), state: null }, ...rows];
    case "card.update": {
      const row = rows.find((r) => r.card.id === w.id);
      if (row) {
        const card = patchCard(row.card, w.patch);
        return card.deckId === deckId
          ? rows.map((r) => (r === row ? { ...r, card } : r))
          : rows.filter((r) => r !== row);
      }
      const moved = w.patch.deckId === deckId ? lookup.card(w.id) : undefined;
      return moved ? [{ card: patchCard(moved, w.patch), state: null }, ...rows] : rows;
    }
    case "card.archive":
      return rows.filter((row) => row.card.id !== w.id);
    case "card.restore": {
      const card = lookup.card(w.id);
      if (!card || card.deckId !== deckId || rows.some((row) => row.card.id === w.id)) return rows;
      return [{ card: { ...card, archivedAt: null }, state: null }, ...rows];
    }
    default:
      return rows;
  }
}

function onArchivedCards(cards: CardHit[], w: Write, lookup: Lookup): CardHit[] {
  switch (w.kind) {
    case "card.archive": {
      const card = lookup.card(w.id);
      if (!card || cards.some((c) => c.id === w.id)) return cards;
      const deckName = lookup.deck(card.deckId)?.name ?? "";
      return [{ ...card, archivedAt: new Date(), deckName }, ...cards];
    }
    case "card.restore":
      return cards.filter((c) => c.id !== w.id);
    case "card.update":
      return cards.map((c) => (c.id === w.id ? { ...c, ...patchCard(c, w.patch) } : c));
    default:
      return cards;
  }
}

/** One write's effect on one query's data, or the data untouched when the write does not show there. */
export function applyWrite<T>(key: QueryKey, data: T, w: Write, lookup: Lookup): T {
  const target = shapeOf(key);
  if (!target || !Array.isArray(data)) return data;
  switch (target.shape) {
    case "decks":
      return onDecks(data as DeckSummary[], w, lookup) as T;
    case "archivedDecks":
      return onArchivedDecks(data as DeckSummary[], w, lookup) as T;
    case "deckCards":
      return onDeckCards(data as DeckRow[], target.deckId ?? "", w, lookup) as T;
    case "archivedCards":
      return onArchivedCards(data as CardHit[], w, lookup) as T;
  }
}

/** Fetched data with every write still waiting laid over it, oldest first. */
export function rebase<T>(key: QueryKey, data: T, pending: QueuedWrite[], lookup: Lookup): T {
  return pending.reduce((current, entry) => applyWrite(key, current, entry.write, lookup), data);
}

/** Shows a write in every cached list at once, before the server has it. */
export function showWrite(qc: QueryClient, w: Write) {
  const lookup = cacheLookup(qc);
  for (const query of qc.getQueryCache().getAll()) {
    if (!shapeOf(query.queryKey) || query.state.data === undefined) continue;
    const next = applyWrite(query.queryKey, query.state.data, w, lookup);
    if (next !== query.state.data) qc.setQueryData(query.queryKey, next);
  }
  // A deck made here has nothing on the server to fetch yet, so its screen opens empty.
  if (w.kind === "deck.create") {
    const id = w.input.id;
    if (qc.getQueryData(["decks", id, "cards"]) === undefined) {
      qc.setQueryData<DeckRow[]>(["decks", id, "cards"], []);
    }
    if (qc.getQueryData(["decks", id, "sections"]) === undefined) {
      qc.setQueryData(["decks", id, "sections"], { sections: [], progress: null });
    }
  }
}
