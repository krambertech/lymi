import type { Review, Section } from "../../lib/api";
import type { WordEvent } from "../../views/word-view";
import { day, deckCards, now } from "../mock";

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
