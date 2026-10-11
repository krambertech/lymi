import {
  type AddCardOutcomeOut,
  type CardInput,
  type CardOut,
  type CardWithStateOut,
  type DeckSummaryOut,
  emptyState,
  type FsrsCard,
  newId,
  normaliseTerm,
  type QueueItemOut,
  type QueueOut,
  type Rating,
  type ReviewDayOutcome,
  type ReviewMode,
  type Round,
  type RoundsOut,
  type StreakOut,
  schedule,
  serializeState,
} from "@lymi/core";
import { CARDS, DAILY_GOAL, DECKS, type DemoCard, PAST_WEEK, STREAK_BEFORE_TODAY } from "./demo";

// Stands in for the Worker until the phone signs in (#503, #504): it answers in the API's own
// response shapes, so the hooks swap this for the shared client without the screens changing.

const MODE: ReviewMode = { cue: "term", target: "meaning" };
const OWNER = { id: "demo", name: "Kateryna", avatarUrl: null };
const NEW = 0;
const LEARNING = 1;
const REVIEW = 2;
const RELEARNING = 3;

interface Held {
  card: CardOut;
  fsrs: FsrsCard;
  /** 0 New, 1 Learning, 2 Review, 3 Relearning, as the API counts them. */
  state: number;
  due: boolean;
  slipping: boolean;
}

interface Graded {
  cardId: string;
  rating: Rating;
  at: string;
}

const STANDING = { new: NEW, learning: LEARNING, known: REVIEW } as const;

function cardOut(c: Pick<DemoCard, "id" | "deck" | "term" | "meaning" | "example" | "section">) {
  const at = new Date().toISOString();
  const card: CardOut = {
    id: c.id,
    userId: OWNER.id,
    deckId: c.deck,
    term: c.term,
    normalizedTerm: normaliseTerm(c.term),
    meaning: c.meaning || null,
    pronunciation: null,
    example: c.example ?? null,
    notes: null,
    hook: null,
    language: DECKS.find((d) => d.id === c.deck)?.language ?? null,
    tags: [],
    source: null,
    sectionId: c.section ? sectionId(c.deck, c.section) : null,
    directions: null,
    reviewModes: null,
    image: null,
    imageVersion: null,
    meaningSource: c.meaning ? "manual" : null,
    exampleSource: c.example ? "manual" : null,
    pronunciationSource: null,
    hookSource: null,
    enrichmentStatus: null,
    audioKey: null,
    createdBy: "user",
    importId: null,
    archivedAt: null,
    createdAt: at,
    updatedAt: at,
  };
  return card;
}

const SECTIONS = new Map<string, string>();

function sectionId(deck: string, name: string) {
  const id = `${deck}:${name}`;
  SECTIONS.set(id, name);
  return id;
}

/** A section's name, which the real app reads from the deck's sections. */
export function sectionName(id: string | null): string | null {
  return id ? (SECTIONS.get(id) ?? null) : null;
}

const seed = (): Held[] =>
  CARDS.map((c) => ({
    card: cardOut(c),
    fsrs: emptyState(),
    state: STANDING[c.state],
    due: c.due,
    slipping: c.slipping ?? false,
  }));

let cards = seed();
let log: Graded[] = [];

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

/** The latest grade of each card today. */
function latest(): Map<string, Rating> {
  return new Map(log.map((g) => [g.cardId, g.rating]));
}

function outcome(): ReviewDayOutcome {
  if (log.length >= DAILY_GOAL) return "goal_met";
  if (log.length > 0 && !cards.some((c) => c.due)) return "exhausted";
  return "open";
}

export const demoServer = {
  decks(): DeckSummaryOut[] {
    return DECKS.map((d, position) => {
      const mine = cards.filter((c) => c.card.deckId === d.id);
      return {
        id: d.id,
        name: d.name,
        description: null,
        defaultLanguage: d.language,
        directions: "recognition",
        reviewModes: [MODE],
        position,
        seriesId: null,
        sectionProgression: "open",
        meaningLanguage: null,
        total: mine.length,
        due: mine.filter((c) => c.due).length,
        archivedAt: null,
        role: "owner",
        owner: OWNER,
        published: false,
      };
    });
  },

  deckCards(deckId: string): CardWithStateOut[] {
    return cards
      .filter((c) => c.card.deckId === deckId)
      .map((c) => ({
        card: c.card,
        state: {
          id: `${c.card.id}:${MODE.cue}`,
          cardId: c.card.id,
          userId: OWNER.id,
          mode: MODE,
          direction: "recognition",
          due: c.fsrs.due.toISOString(),
          state: c.state,
          fsrs: serializeState(c.fsrs),
          lastReview: c.fsrs.last_review?.toISOString() ?? null,
          createdAt: c.card.createdAt,
          updatedAt: c.card.updatedAt,
        },
      }));
  },

  streak(): StreakOut {
    const attempts = log.length;
    const today = { date: daysAgo(0), attempts, goal: DAILY_GOAL, outcome: outcome() };
    const satisfied = today.outcome !== "open";
    const past = PAST_WEEK.map((n, i) => {
      const goalMet = n >= DAILY_GOAL;
      return {
        date: daysAgo(PAST_WEEK.length - i),
        attempts: n,
        goal: DAILY_GOAL,
        satisfied: goalMet,
        outcome: goalMet ? ("goal_met" as const) : ("open" as const),
      };
    });
    const current = STREAK_BEFORE_TODAY + (satisfied ? 1 : 0);
    return {
      today,
      goal: DAILY_GOAL,
      current,
      longest: current,
      reviewedDays: past.filter((d) => d.attempts > 0).length + (attempts > 0 ? 1 : 0),
      restDays: [],
      days: [
        ...past,
        { date: today.date, attempts, goal: DAILY_GOAL, satisfied, outcome: today.outcome },
      ],
    };
  },

  rounds(): RoundsOut {
    const last = latest();
    return {
      forgotten: [...last.values()].filter((r) => r === 1).length,
      new: cards.filter((c) => c.state === NEW).length,
      slipping: cards.filter((c) => c.slipping && !last.has(c.card.id)).length,
    };
  },

  queue(scope: { deck?: string | undefined }, round?: Round): QueueOut {
    const last = latest();
    const chosen = cards.filter((c) => {
      if (round === "forgotten") return last.get(c.card.id) === 1;
      if (round === "new") return c.state === NEW;
      if (round === "slipping") return c.slipping && !last.has(c.card.id);
      return c.due && (!scope.deck || c.card.deckId === scope.deck);
    });
    const items = chosen.map(
      (c): QueueItemOut => ({
        card: c.card,
        mode: MODE,
        direction: "recognition",
        stateId: `${c.card.id}:${MODE.cue}`,
        fsrsState: c.state,
        next: {
          1: schedule(c.fsrs, 1).card.due.toISOString(),
          2: schedule(c.fsrs, 2).card.due.toISOString(),
          3: schedule(c.fsrs, 3).card.due.toISOString(),
          4: schedule(c.fsrs, 4).card.due.toISOString(),
        },
        slipping: c.slipping,
      }),
    );
    return { total: items.length, items };
  },

  grade(cardId: string, rating: Rating) {
    cards = cards.map((c) => {
      if (c.card.id !== cardId) return c;
      const missed = rating === 1;
      const state = missed
        ? c.state === NEW || c.state === LEARNING
          ? LEARNING
          : RELEARNING
        : rating >= 3
          ? REVIEW
          : Math.max(c.state, LEARNING);
      // A forgotten card comes back later in the review, so it stays due until it is known.
      return { ...c, fsrs: schedule(c.fsrs, rating).card, state, due: missed };
    });
    log = [...log, { cardId, rating, at: new Date().toISOString() }];
  },

  addCard(input: CardInput): AddCardOutcomeOut {
    const key = normaliseTerm(input.term);
    const existing = cards.find((c) => c.card.normalizedTerm === key);
    if (existing) {
      const deckName = DECKS.find((d) => d.id === existing.card.deckId)?.name ?? "";
      return {
        id: existing.card.id,
        status: "skipped",
        term: input.term,
        existing: existing.card,
        deckName,
      };
    }
    const card = cardOut({
      id: input.id ?? newId(),
      deck: input.deckId,
      term: input.term,
      meaning: input.meaning ?? "",
    });
    cards = [{ card, fsrs: emptyState(), state: NEW, due: false, slipping: false }, ...cards];
    return { id: card.id, status: "added", card };
  },

  reset() {
    cards = seed();
    log = [];
  },
};
