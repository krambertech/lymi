import type { InsightsOut } from "@lymi/core";
import type { PublicDeckOut, PublicDeckSummary } from "@lymi/core/catalog";
import type { StreakSummary } from "../components/streak";
import type {
  ActivityEntry,
  Card,
  CardState,
  DeckSummary,
  QueueItem,
  Review,
  Section,
  Series,
} from "../lib/api";
import type { WordEvent } from "../views/word-view";

const now = Date.now();
const day = 86_400_000;

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

export const quietDecks: DeckSummary[] = decks.map((d) => ({ ...d, due: 0 }));

/** Two of the learner's decks gathered into one series, reviewed together. */
export const series: Series[] = [
  {
    id: "s1",
    name: "Romance languages",
    position: 0,
    deckIds: ["d2", "d1"],
    total: 105,
    due: 11,
    archivedDecks: 0,
    archivedAt: null,
    createdAt: new Date(now - 9 * day).toISOString(),
    updatedAt: new Date(now - 2 * day).toISOString(),
  },
];

export const decksInSeries: DeckSummary[] = decks.map((d) =>
  d.id === "d1" || d.id === "d2" ? { ...d, seriesId: "s1" } : d,
);

/** Today's rounds on a morning with cards due. */
export const rounds = { forgotten: 3, new: 12, slipping: 5 };

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

const section = (id: string, name: string, position: number, over: Partial<Section>): Section => ({
  id,
  deckId: "d1",
  name,
  position,
  total: 0,
  known: 0,
  notStarted: 0,
  knownNeeded: 0,
  status: "open",
  archivedCards: 0,
  archivedAt: null,
  createdAt: new Date(now - (10 - position) * day).toISOString(),
  updatedAt: new Date(now - day).toISOString(),
  ...over,
});

/** A deck of three lessons: the first known, the learner on the second, the third still locked. */
export const sections: Section[] = [
  section("s1", "Lezione 11", 0, { total: 3, known: 3, knownNeeded: 3 }),
  section("s2", "Lezione 12", 1, { total: 2, known: 0, knownNeeded: 2 }),
  section("s3", "Lezione 13", 2, { total: 2, notStarted: 2, knownNeeded: 2, status: "locked" }),
];
export const sectionProgress = { currentId: "s2", nextId: "s3", ready: false };

/** The same deck once the second lesson is known well enough to go on. */
export const readySections: Section[] = sections.map((s) =>
  s.id === "s2" ? { ...s, known: 2 } : s.id === "s3" ? { ...s, status: "ready" } : s,
);
export const readyProgress = { ...sectionProgress, ready: true };

const sectionOfCard: Record<string, string> = {
  c3: "s1",
  c5: "s1",
  c7: "s1",
  c1: "s2",
  c6: "s2",
  c2: "s3",
  c4: "s3",
};
export const deckCardsInSections = deckCards.map((row) => ({
  ...row,
  card: { ...row.card, sectionId: sectionOfCard[row.card.id] ?? null },
}));

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
    mode: { cue: "term", target: "meaning" },
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
    id: "e3",
    at: new Date(now - 4 * day),
    kind: "edited",
    text: "Meaning changed to “to take it personally”",
    actor: "by you",
  },
  {
    id: "e2",
    at: new Date(now - 9 * day),
    kind: "enriched",
    text: "Enriched the example and the pronunciation",
    actor: "by the AI",
  },
  {
    id: "e1",
    at: new Date(now - 9 * day),
    kind: "added",
    text: "Card added, meaning from the lesson",
    actor: "by Claude",
  },
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

/** Ninety quiet days: nothing reviewed, for the first-run screen. */
export const noHistory: number[] = Array(90).fill(0);

/** Today still open, yesterday reviewed: the streak holds. */
export const streakDaysOpen: number[] = [...streakDays.slice(0, -1), 0];

export const me = { id: "u1", name: "Kateryna", email: "kateryna@example.com" };

/**
 * Month totals the way the server builds them: the denominator is the calendar month's
 * elapsed days, so a fixture can never show a shape the product cannot produce.
 */
function monthsFrom(days: { date: string; lit: boolean }[]) {
  const today = new Date(now).toISOString().slice(0, 10);
  const out: { month: string; lit: number; days: number }[] = [];
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const last = out.at(-1);
    if (last?.month === month) {
      if (d.lit) last.lit++;
      continue;
    }
    const [y, m] = month.split("-").map(Number);
    const elapsed =
      month === today.slice(0, 7)
        ? Number(today.slice(8, 10))
        : new Date(Date.UTC(y ?? 1970, m ?? 1, 0)).getUTCDate();
    out.push({ month, lit: d.lit ? 1 : 0, days: elapsed });
  }
  return out;
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
  months: monthsFrom(insightDays),
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
  months: monthsFrom(thinDays.slice(-5)),
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

const entry = (over: Partial<ActivityEntry> & Pick<ActivityEntry, "id" | "kind" | "at">) =>
  ({
    group: over.id,
    day: over.at.slice(0, 10),
    actor: "mcp",
    app: null,
    count: 1,
    deck: null,
    person: null,
    cards: [],
    import: null,
    export: null,
    ...over,
  }) satisfies ActivityEntry;

const italian = { id: "d1", name: "Italian with Giulia", archived: false };
const estonian = { id: "d3", name: "Estonian A2", archived: false };

/** A card as an Activity row lists it: where it is now, and whether that deck can be opened. */
const wrote = (id: string, term: string, meaning: string, deck = italian) => ({
  id,
  term,
  meaning,
  archived: false,
  deckId: deck.id,
  deckArchived: deck.archived,
});

/** The learner-local day the sample week is read on, so its newest rows say Today. */
export const activityToday = new Date(now).toISOString().slice(0, 10);

/** A week of Activity: an app, the AI, an import, a key and the people of a shared deck. */
export const activity: ActivityEntry[] = [
  entry({
    id: "a1",
    kind: "cards_added",
    at: new Date(now - 2 * 3_600_000).toISOString(),
    app: "Claude",
    count: 6,
    deck: italian,
    cards: [
      wrote("c1", "affrettarsi", "to hurry"),
      wrote("c2", "il pendolare", "commuter"),
      wrote("c3", "sbrigarsi", "to get a move on"),
    ],
  }),
  entry({
    id: "a2",
    kind: "cards_enriched",
    at: new Date(now - 4 * 3_600_000).toISOString(),
    actor: "ai",
    count: 12,
    deck: italian,
    cards: [wrote("c4", "la bolletta", "the bill"), wrote("c5", "il vicolo", "the alley")],
  }),
  entry({
    id: "a3",
    kind: "member_joined",
    at: new Date(now - 7 * 3_600_000).toISOString(),
    actor: "user",
    deck: estonian,
    person: "Maryna",
  }),
  entry({
    id: "a4",
    kind: "import",
    at: new Date(now - day).toISOString(),
    actor: "user",
    import: {
      id: "i1",
      source: "anki",
      fileName: "italian-deck.apkg",
      byteSize: 4_200_000,
      status: "done",
      failure: null,
      summary: null,
      choices: null,
      counts: {
        added: 214,
        existing: 0,
        duplicates: 0,
        duplicateExamples: [],
        skipped: 12,
        archived: 0,
        shortened: 0,
        reviews: 1_900,
        pictures: 8,
        picturesSkipped: 0,
        decks: 3,
      },
      progress: { written: 3, chunks: 3 },
      upload: { partBytes: 4_000_000, parts: 2, received: 2 },
      createdBy: "user",
      createdAt: new Date(now - day).toISOString(),
      updatedAt: new Date(now - day).toISOString(),
      finishedAt: new Date(now - day).toISOString(),
      archivedAt: null,
    },
  }),
  entry({
    id: "a5",
    kind: "cards_archived",
    at: new Date(now - day - 3_600_000).toISOString(),
    actor: "api",
    app: "Lesson notes script",
    count: 2,
    deck: italian,
    cards: [{ ...wrote("c6", "la spesa", "the shopping"), archived: true }],
  }),
  entry({
    id: "a5b",
    kind: "export",
    at: new Date(now - 2 * day).toISOString(),
    actor: "user",
    export: {
      id: "e1",
      format: "lymi",
      deckId: null,
      fileName: "lymi-library-2026-09-14.zip",
      status: "done",
      failure: null,
      byteSize: 2_400_000,
      counts: { cards: 431, decks: 4, reviews: 3_180, pictures: 12, sounds: 0 },
      downloadUrl: "/api/exports/e1/file",
      createdBy: "user",
      createdAt: new Date(now - 2 * day).toISOString(),
      finishedAt: new Date(now - 2 * day).toISOString(),
      expiresAt: new Date(now - day).toISOString(),
    },
  }),
  entry({
    id: "a6",
    kind: "link_on",
    at: new Date(now - 3 * day).toISOString(),
    actor: "user",
    deck: estonian,
  }),
  entry({
    id: "a7",
    kind: "deck_added",
    at: new Date(now - 5 * day).toISOString(),
    app: "Claude",
    deck: { id: "d4", name: "Phrases from the news", archived: false },
  }),
];

/**
 * Explore's catalogue: one deck per shelf plus two on the first, so the gallery shows a shelf
 * with more than one deck, a deck already added, and a slug from each end of the eight hues.
 */
export const catalogue: PublicDeckSummary[] = [
  {
    slug: "everyday-estonian",
    name: "Everyday Estonian",
    summary: "Words and phrases for your first weeks in Estonia.",
    level: "A1",
    category: "languages",
    language: "et",
    meaningLanguage: "en",
    cardCount: 99,
    sectionCount: 8,
    card: { term: "paremale", meaning: "to the right", section: "Getting around" },
  },
  {
    slug: "everyday-finnish",
    name: "Everyday Finnish",
    summary: "Home, work and the shop, in the words people use.",
    level: "A1",
    category: "languages",
    language: "fi",
    meaningLanguage: "en",
    cardCount: 64,
    sectionCount: 5,
    card: { term: "maito", meaning: "milk", section: "Kaupassa" },
  },
  {
    slug: "driving-theory-estonia",
    name: "Driving theory, Estonia",
    summary: "Signs, right of way and the questions the test repeats.",
    level: null,
    category: "driving",
    language: "et",
    meaningLanguage: "en",
    cardCount: 42,
    sectionCount: 3,
    card: { term: "ülekäigurada", meaning: "pedestrian crossing", section: "Märgid" },
  },
];

export const catalogueAdded: Record<string, string> = { "everyday-finnish": "d2" };

/** One published deck in the app's chrome, with a section that has no name at the end. */
export const publicDeck: PublicDeckOut = {
  slug: "everyday-estonian",
  name: "Everyday Estonian",
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  language: "et",
  meaningLanguage: "en",
  originalMeaningLanguage: "en",
  editions: ["en", "uk"],
  publisher: "Lymi",
  publisherAvatar: null,
  sources: [{ title: "EKI A1 word list", url: "https://www.eki.ee/" }],
  reviewedAt: null,
  revision: 3,
  publishedAt: "2026-09-01T09:00:00.000Z",
  cardCount: 99,
  sections: [
    {
      name: "Greetings",
      cards: [
        { term: "tere", meaning: "hello" },
        { term: "aitäh", meaning: "thank you" },
        { term: "head aega", meaning: "goodbye" },
      ],
    },
    {
      name: "In the shop",
      cards: [
        { term: "leib", meaning: "bread" },
        { term: "piim", meaning: "milk" },
      ],
    },
    { name: null, cards: [{ term: "buss", meaning: "bus" }] },
  ],
};
