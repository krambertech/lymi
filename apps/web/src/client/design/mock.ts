import type { InsightsOut } from "@lymi/core";
import { identifyApp } from "../components/app-mark";
import type { StreakSummary } from "../components/streak";
import type { Card, CardState, DeckSummary, QueueItem, Series } from "../lib/api";

export const now = Date.now();
export const day = 86_400_000;

const mine = {
  role: "owner" as const,
  owner: { id: "u1", name: "Kateryna", avatarUrl: null },
  published: false,
};

export const decks: DeckSummary[] = [
  {
    id: "d1",
    name: "Italian with Giulia",
    description: null,
    defaultLanguage: "it",
    directions: "recognition",
    reviewModes: [{ cue: "term", target: "meaning" }],
    position: 0,
    seriesId: null,
    sectionProgression: "automatic",
    total: 64,
    due: 8,
    archivedAt: null,
    ...mine,
  },
  {
    id: "d2",
    name: "Portuguese",
    description: null,
    defaultLanguage: "pt-BR",
    directions: "recognition",
    reviewModes: [{ cue: "term", target: "meaning" }],
    position: 1,
    seriesId: null,
    sectionProgression: "automatic",
    total: 41,
    due: 3,
    archivedAt: null,
    ...mine,
  },
  {
    id: "d3",
    name: "Українська для Марко",
    description: null,
    defaultLanguage: "uk",
    directions: "both",
    reviewModes: [
      { cue: "term", target: "meaning" },
      { cue: "meaning", target: "term" },
    ],
    position: 2,
    seriesId: null,
    sectionProgression: "automatic",
    total: 12,
    due: 0,
    archivedAt: null,
    ...mine,
  },
  {
    id: "d4",
    name: "Eesti keel, A1",
    description: null,
    defaultLanguage: "et",
    directions: "recognition",
    reviewModes: [{ cue: "term", target: "meaning" }],
    position: 3,
    seriesId: null,
    sectionProgression: "automatic",
    total: 38,
    due: 5,
    archivedAt: null,
    role: "learner",
    owner: { id: "u2", name: "Liis", avatarUrl: null },
    published: false,
  },
];

/** Two of the learner's decks gathered into one series, reviewed together. */
export const series: Series[] = [
  {
    id: "s1",
    name: "Romance languages",
    position: 0,
    deckIds: ["d2", "d1"],
    total: 105,
    due: 11,
    createdAt: new Date(now - 9 * day).toISOString(),
    updatedAt: new Date(now - 2 * day).toISOString(),
  },
];

export const decksInSeries: DeckSummary[] = decks.map((d) =>
  d.id === "d1" || d.id === "d2" ? { ...d, seriesId: "s1" } : d,
);

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
    sectionId: null,
    directions: null,
    reviewModes: null,
    image: null,
    imageVersion: null,
    importId: null,
    externalId: null,
    meaningSource: "lesson",
    exampleSource: null,
    pronunciationSource: null,
    enrichmentStatus: null,
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
    tags: ["verbs", "reflexive"],
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
    mode: { cue: "term", target: "meaning" },
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

export const queueItem: QueueItem = {
  card: byId("c1"),
  mode: { cue: "term", target: "meaning" },
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
  mode: { cue: "meaning", target: "term" },
  direction: "production",
  fsrsState: 2,
};

/** A yield sign, drawn here so the design page needs no network or storage. */
const yieldSign = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560"><path d="M160 90h480L400 500z" fill="#fff" stroke="#c8102e" stroke-width="54" stroke-linejoin="round"/></svg>',
)}`;

const { direction: _textOnly, ...pictureBase } = queueItem;

export const queueItemPicture: QueueItem = {
  ...pictureBase,
  card: card({
    id: "c-sign",
    term: "Anna teed",
    meaning: "Give way",
    language: "et",
    source: "Driving theory",
    reviewModes: [{ cue: "image", target: "meaning" }],
    image: {
      id: "img-sign",
      url: yieldSign,
      contentType: "image/webp",
      width: 800,
      height: 560,
      byteSize: 21_400,
      description: "A white triangle pointing down, with a thick red border",
      source: "url",
      sourceHost: "upload.wikimedia.org",
      createdBy: "mcp",
      createdAt: new Date(now - day).toISOString(),
      updatedAt: new Date(now - day).toISOString(),
    },
  }),
  mode: { cue: "image", target: "meaning" },
  fsrsState: 1,
};

/** Today still open, yesterday reviewed: the streak holds. */
export const streakDaysOpen: number[] = [...streakDays.slice(0, -1), 0];

export const me = { id: "u1", name: "Kateryna", email: "kateryna@example.com" };

/** The deck `queueItem` and its siblings belong to. */
export const reviewDeck = { name: "Italian with Giulia", language: "it" };

/** An MCP client Lymi recognises, for the sign-in and consent screens. */
export const claude = identifyApp("https://claude.ai/oauth/client", "Claude");

/**
 * The day grid the way the server builds it: sparse, with an attempt count against the goal
 * the day was measured by, so a fixture can never show a shape the product cannot produce.
 */
function activityFrom(days: { date: string; lit: boolean }[], goal: number) {
  const today = new Date(now).toISOString().slice(0, 10);
  const counts = [58, 12, 91, 50, 31, 74, 25, 63, 44, 105];
  return {
    today,
    goal,
    firstDay: days.find((d) => d.lit)?.date ?? null,
    days: days
      .filter((d) => d.lit && d.date <= today)
      .map((d, i) => {
        const attempts = counts[i % counts.length] ?? goal;
        const satisfied = attempts >= goal;
        return {
          date: d.date,
          attempts,
          goal,
          satisfied,
          outcome: (satisfied ? "goal_met" : "open") as "goal_met" | "open",
        };
      }),
  };
}

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
  activity: activityFrom(insightDays, 50),
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
/** The first week: five days of history inside the same thirty-day frame. */
const thinDays = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(now - (29 - i) * day).toISOString().slice(0, 10),
  lit: i >= 25 && i !== 26,
}));

export const thinInsights: InsightsOut = {
  period: 30,
  recall: {
    passed: 6,
    failed: 1,
    rate: 6 / 7,
    series: [{ at: "2026-08-31", passed: 6, failed: 1, rate: 6 / 7 }],
  },
  consistency: {
    /* Thirty days like any other account: five days of history, the other twenty-five
       unlit because the learner was not here yet. */
    days: thinDays,
    lit: 4,
    longestRun: 3,
    litAllTime: 4,
    daysAllTime: 5,
  },
  /* Built the way the server builds it, so the frame follows today rather than drifting. */
  activity: activityFrom(thinDays.slice(-5), 50),
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
    outcome: attempts >= goal ? ("goal_met" as const) : ("open" as const),
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
