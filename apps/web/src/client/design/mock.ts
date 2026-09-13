import type { InsightsOut } from "@lymi/core";
import type { Card, CardState, Review } from "@lymi/core/schema";
import type { StreakSummary } from "../components/Streak";
import type { DeckSummary, QueueItem } from "../lib/api";
import type { WordEvent } from "../views/WordView";

const now = Date.now();
const day = 86_400_000;

const mine = { role: "owner" as const, owner: { id: "u1", name: "Kateryna" } };

export const decks: DeckSummary[] = [
  {
    id: "d1",
    name: "Italian with Giulia",
    description: null,
    defaultLanguage: "it",
    directions: "recognition",
    position: 0,
    total: 64,
    due: 8,
    ...mine,
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
    ...mine,
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
    ...mine,
  },
  {
    id: "d4",
    name: "Eesti keel, A1",
    description: null,
    defaultLanguage: "et",
    directions: "recognition",
    position: 3,
    total: 38,
    due: 5,
    role: "learner",
    owner: { id: "u2", name: "Liis" },
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
    source: "Lesson 13",
  }),
  card({ id: "c4", term: "il cassetto", meaning: "the drawer", meaningSource: "ai" }),
  card({
    id: "c5",
    term: "rimandare",
    meaning: "to postpone",
    example: "Non rimandare a domani quello che puoi fare oggi.",
    exampleSource: "lesson",
    source: "Lesson 13",
  }),
  card({
    id: "c6",
    term: "prendersela",
    meaning: "to take it personally",
    pronunciation: "/prenˈdersela/",
    example: "Non prendertela, non era rivolto a te.",
    exampleSource: "ai",
    meaningSource: "lesson",
    createdBy: "mcp",
    createdAt: new Date(now - 9 * day),
  }),
  card({
    id: "c7",
    term: "la sveglia",
    meaning: "the alarm clock",
    meaningSource: "manual",
    source: "Lesson 13",
  }),
];

const byId = (id: string): Card => {
  const c = cards.find((x) => x.id === id);
  if (!c) throw new Error(`no mock card ${id}`);
  return c;
};

function state(cardId: string, s: number, dueIn: number, reps = 0, lapses = 0): CardState {
  const stability = s === 2 ? Math.max(2, dueIn / day) : s === 0 ? 0 : 4;
  return {
    id: `s-${cardId}`,
    cardId,
    userId: "u1",
    direction: "recognition",
    due: new Date(now + dueIn),
    state: s,
    fsrs: JSON.stringify({
      due: new Date(now + dueIn).toISOString(),
      stability,
      difficulty: s === 0 ? 0 : 6.1,
      elapsed_days: s === 0 ? 0 : 2,
      scheduled_days: Math.max(0, Math.round(dueIn / day)),
      reps,
      lapses,
      state: s,
      ...(s === 0 ? {} : { last_review: new Date(now - 2 * day).toISOString() }),
    }),
    lastReview: s === 0 ? null : new Date(now - day),
    createdAt: new Date(now - 3 * day),
    updatedAt: new Date(now - day),
  };
}

export const deckCards: { card: Card; state: CardState | null }[] = [
  { card: byId("c1"), state: state("c1", 1, 0, 2) },
  { card: byId("c2"), state: state("c2", 0, 0) },
  { card: byId("c6"), state: state("c6", 3, 0, 4, 1) },
  { card: byId("c4"), state: state("c4", 0, 0) },
  { card: byId("c3"), state: state("c3", 2, 6 * day, 5) },
  { card: byId("c5"), state: state("c5", 2, 21 * day, 6) },
  { card: byId("c7"), state: state("c7", 2, 64 * day, 8) },
];

/** How the sample decks split, for the stripe on each card. */
export const known: Record<string, number> = { d1: 31, d2: 26, d3: 4, d4: 12 };
export const learning: Record<string, number> = { d1: 14, d2: 9, d3: 2, d4: 9 };

function review(
  id: string,
  daysAgo: number,
  rating: number,
  state: number,
  elapsedDays: number,
  scheduledDays: number,
): Review {
  return {
    id,
    userId: "u1",
    cardId: "c6",
    cardStateId: "s-c6",
    direction: "recognition",
    rating,
    state,
    elapsedDays,
    scheduledDays,
    stabilityAfter: 4,
    difficultyAfter: 6.1,
    reviewDayId: null,
    stateBefore: null,
    reviewedAt: new Date(now - daysAgo * day),
    source: "web",
  };
}

/** One word's life: four reviews, newest first, and how it arrived. */
export const wordReviews: Review[] = [
  review("r4", 0, 3, 3, 2, 4),
  review("r3", 2, 2, 1, 1, 2),
  review("r2", 3, 1, 2, 3, 0),
  review("r1", 6, 3, 0, 0, 3),
];
export const wordEvents: WordEvent[] = [
  {
    at: new Date(now - 9 * day),
    label: "Enriched",
    detail: "the AI wrote the example and the pronunciation",
  },
  {
    at: new Date(now - 9 * day),
    label: "Added",
    detail: "by Claude, from your lesson notes · meaning from the lesson",
  },
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
  { deckId: "d1", deckName: "Italian with Giulia", count: 12, actor: "Claude", when: "Tuesday" },
  { deckId: "d2", deckName: "Portuguese", count: 3, actor: "You", when: "today" },
];

export const me = { id: "u1", name: "Kateryna", email: "kateryna@example.com" };

/** Insights, at the point where there is enough history for every block to say something. */
const insightDays = (() => {
  const off = new Set([
    3, 12, 19, 27, 33, 40, 41, 42, 43, 44, 45, 55, 62, 70, 76, 96, 97, 98, 108, 112, 118,
  ]);
  const start = now - 125 * day;
  return Array.from({ length: 126 }, (_, i) => ({
    date: new Date(start + i * day).toISOString().slice(0, 10),
    lit: !off.has(i),
  }));
})();

export const insights: InsightsOut = {
  period: 30,
  recall: {
    passed: 910,
    failed: 89,
    rate: 910 / 999,
    series: [
      { at: "2026-07-06", passed: 74, failed: 12, rate: 74 / 86 },
      { at: "2026-07-13", passed: 81, failed: 9, rate: 81 / 90 },
      // Two weeks away. The line spaces this by date, so the gap reads as elapsed time.
      { at: "2026-07-27", passed: 92, failed: 7, rate: 92 / 99 },
      { at: "2026-08-03", passed: 77, failed: 10, rate: 77 / 87 },
      { at: "2026-08-10", passed: 88, failed: 6, rate: 88 / 94 },
      { at: "2026-08-17", passed: 71, failed: 9, rate: 71 / 80 },
      { at: "2026-08-24", passed: 95, failed: 5, rate: 95 / 100 },
      { at: "2026-08-31", passed: 84, failed: 6, rate: 84 / 90 },
    ],
  },
  consistency: {
    days: insightDays.slice(-30),
    lit: insightDays.slice(-30).filter((d) => d.lit).length,
    longestRun: 19,
    litAllTime: insightDays.filter((d) => d.lit).length,
    daysAllTime: insightDays.length,
  },
  months: [
    { month: "2026-05", lit: 24, days: 28 },
    { month: "2026-06", lit: 22, days: 30 },
    { month: "2026-07", lit: 28, days: 31 },
    { month: "2026-08", lit: 25, days: 31 },
    { month: "2026-09", lit: 6, days: 6 },
  ],
  cards: { total: 340, new: 62, learning: 41, known: 237 },
  forecast: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(now + i * day).toISOString().slice(0, 10),
    count: [42, 88, 51, 34, 19, 63, 25][i] ?? 0,
  })),
  leeches: {
    lapses: 4,
    reviews: 6,
    cards: [
      {
        id: "c1",
        deckId: "d1",
        term: "sitkeä",
        meaning: "persistent, tough",
        language: "fi",
        lapses: 7,
        reviews: 12,
      },
      {
        id: "c2",
        deckId: "d1",
        term: "vaikuttaa",
        meaning: "to affect; to seem",
        language: "fi",
        lapses: 6,
        reviews: 11,
      },
      {
        id: "c3",
        deckId: "d2",
        term: "kuitenkin",
        meaning: "however, nevertheless",
        language: "fi",
        lapses: 5,
        reviews: 9,
      },
      {
        id: "c4",
        deckId: "d1",
        term: "edellyttää",
        meaning: "to require, presuppose",
        language: "fi",
        lapses: 5,
        reviews: 14,
      },
      {
        id: "c5",
        deckId: "d2",
        term: "toisaalta",
        meaning: "on the other hand",
        language: "fi",
        lapses: 4,
        reviews: 8,
      },
    ],
  },
};

/** The first week. Every block has to say something true with almost nothing behind it. */
export const thinInsights: InsightsOut = {
  period: 30,
  recall: {
    passed: 6,
    failed: 1,
    rate: 6 / 7,
    series: [{ at: "2026-08-31", passed: 6, failed: 1, rate: 6 / 7 }],
  },
  consistency: {
    days: Array.from({ length: 5 }, (_, i) => ({
      date: new Date(now - (4 - i) * day).toISOString().slice(0, 10),
      lit: i !== 1,
    })),
    lit: 4,
    longestRun: 3,
    litAllTime: 4,
    daysAllTime: 5,
  },
  months: [{ month: "2026-09", lit: 4, days: 5 }],
  cards: { total: 18, new: 11, learning: 7, known: 0 },
  forecast: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(now + i * day).toISOString().slice(0, 10),
    count: [5, 3, 7, 2, 0, 4, 1][i] ?? 0,
  })),
  leeches: { lapses: 4, reviews: 6, cards: [] },
};

/**
 * A streak built from counts per day, oldest first, today last, the way the server would report
 * it for a goal of 10: a day with ten or more attempts counts, and runs are counted from them.
 */
export function streakFrom(counts: number[], goal = 10): StreakSummary {
  const back = (n: number) => new Date(Date.UTC(2026, 8, 13 - n)).toISOString().slice(0, 10);
  const all = counts.map((attempts, i) => ({
    date: back(counts.length - 1 - i),
    attempts,
    goal,
    satisfied: attempts >= goal,
    nothingDue: false,
  }));
  const todayCount = counts.at(-1) ?? 0;
  let current = 0;
  for (let i = all.length - (todayCount >= goal ? 1 : 2); i >= 0 && all[i]?.satisfied; i--)
    current++;
  let longest = 0;
  let run = 0;
  for (const d of all) {
    run = d.satisfied ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const days = all.filter((d) => d.attempts > 0);
  return {
    today: {
      date: back(0),
      attempts: todayCount,
      goal,
      outcome: todayCount >= goal ? "goal_met" : "open",
    },
    goal,
    current,
    longest,
    reviewedDays: days.length,
    days,
  };
}

/** The streak panel's data: a run up to today with a gap before it. */
export const streak = streakFrom(streakDays.map((n) => n * 2));
