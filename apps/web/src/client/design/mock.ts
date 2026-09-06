import type { Card, CardState } from "@lymi/core/schema";
import type { DeckSummary, QueueItem } from "../lib/api";

const now = Date.now();
const day = 86_400_000;

export const decks: DeckSummary[] = [
  {
    id: "d1",
    name: "Lesson 14",
    description: null,
    defaultLanguage: "it",
    directions: "recognition",
    position: 0,
    total: 24,
    due: 8,
  },
  {
    id: "d2",
    name: "Portuguese",
    description: null,
    defaultLanguage: "pt-BR",
    directions: "recognition",
    position: 1,
    total: 41,
    due: 3,
  },
  {
    id: "d3",
    name: "Українська для Марко",
    description: null,
    defaultLanguage: "uk",
    directions: "both",
    position: 2,
    total: 12,
    due: 0,
  },
];

export const quietDecks: DeckSummary[] = decks.map((d) => ({ ...d, due: 0 }));

export const history = [4, 12, 0, 9, 15, 7, 11];

/**
 * Ninety days, oldest first, as Today asks for them. Twelve days running up to today, a gap
 * before that, so the streak and the best run differ.
 */
export const streakDays: number[] = Array.from({ length: 90 }, (_, i) => {
  const fromEnd = 89 - i;
  if (fromEnd < 12) return 6 + ((i * 5) % 11);
  if (fromEnd === 12 || fromEnd === 13) return 0;
  return (i * 7) % 5 === 0 ? 0 : 4 + ((i * 3) % 9);
});
export const historyNothingToday = [4, 12, 0, 9, 15, 7, 0];

function card(p: Partial<Card> & Pick<Card, "id" | "term">): Card {
  return {
    userId: "u1",
    deckId: "d1",
    normalizedTerm: p.term.toLowerCase(),
    meaning: null,
    pronunciation: null,
    example: null,
    notes: null,
    language: "it",
    tags: [],
    source: "Lesson 14",
    directions: null,
    meaningSource: "lesson",
    exampleSource: null,
    audioKey: null,
    createdBy: "user",
    archivedAt: null,
    createdAt: new Date(now - 3 * day),
    updatedAt: new Date(now - day),
    ...p,
  };
}

export const cards: Card[] = [
  card({
    id: "c1",
    term: "sbrigarsi",
    meaning: "to hurry up, to get a move on",
    pronunciation: "/zbriˈɡarsi/",
    example: "Non c’è fretta, ma sbrigati se vuoi prendere il treno.",
    exampleSource: "ai",
  }),
  card({
    id: "c2",
    term: "la ringhiera",
    meaning: "the railing",
    pronunciation: "/rinˈɡjɛːra/",
    meaningSource: "ai",
    example: "Si è appoggiata alla ringhiera del balcone.",
    exampleSource: "ai",
  }),
  card({
    id: "c3",
    term: "magari",
    meaning: "maybe; if only",
    example: "Magari potessi venire anch’io!",
    exampleSource: "lesson",
  }),
  card({ id: "c4", term: "il cassetto", meaning: "the drawer", meaningSource: "ai" }),
  card({
    id: "c5",
    term: "rimandare",
    meaning: "to postpone",
    example: "Non rimandare a domani quello che puoi fare oggi.",
    exampleSource: "lesson",
  }),
  card({
    id: "c6",
    term: "prendersela",
    meaning: "to take it personally",
    meaningSource: "manual",
  }),
  card({ id: "c7", term: "la sveglia", meaning: "the alarm clock", meaningSource: "manual" }),
];

const byId = (id: string): Card => {
  const c = cards.find((x) => x.id === id);
  if (!c) throw new Error(`no mock card ${id}`);
  return c;
};

function state(cardId: string, s: number, dueIn: number): CardState {
  return {
    id: `s-${cardId}`,
    cardId,
    userId: "u1",
    direction: "recognition",
    due: new Date(now + dueIn),
    state: s,
    fsrs: "{}",
    lastReview: s === 0 ? null : new Date(now - day),
    createdAt: new Date(now - 3 * day),
    updatedAt: new Date(now - day),
  };
}

export const deckCards: { card: Card; state: CardState | null }[] = [
  { card: byId("c1"), state: state("c1", 1, 0) },
  { card: byId("c2"), state: state("c2", 0, 0) },
  { card: byId("c3"), state: state("c3", 2, 6 * day) },
  { card: byId("c4"), state: state("c4", 0, 0) },
  { card: byId("c5"), state: state("c5", 2, 21 * day) },
  { card: byId("c6"), state: state("c6", 3, 0) },
  { card: byId("c7"), state: state("c7", 2, 64 * day) },
];

export const queueItem: QueueItem = {
  card: byId("c1"),
  direction: "recognition",
  stateId: "s-c1",
  fsrsState: 0,
  next: {
    1: new Date(now + 60_000).toISOString(),
    2: new Date(now + 6 * 60_000).toISOString(),
    3: new Date(now + 4 * day).toISOString(),
    4: new Date(now + 12 * day).toISOString(),
  },
};

export const queueItemProduce: QueueItem = {
  ...queueItem,
  card: byId("c3"),
  direction: "production",
  fsrsState: 2,
};

/** Ninety quiet days: nothing reviewed, for the first-run screen. */
export const noHistory: number[] = Array(90).fill(0);

/** Today still open, yesterday reviewed: the streak holds. */
export const streakDaysOpen: number[] = [...streakDays.slice(0, -1), 0];

/** What Claude added since the last review, as Today groups it. */
export const arrivals = [
  { deckId: "d1", deckName: "Lesson 14", count: 12, actor: "Claude", when: "Tuesday" },
  { deckId: "d2", deckName: "Portuguese", count: 3, actor: "You", when: "today" },
];

export const me = { id: "u1", name: "Kateryna", email: "kateryna@example.com", image: null };
