import { describe, expect, it } from "vitest";
import { State } from "./fsrs";
import { arrivesKnown, replayProgress } from "./import-replay";
import { guessLanguage } from "./languages";
import type { Rating } from "./types";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n, 15));
const now = day(40);

describe("replayProgress", () => {
  it("keeps the lower grade of two recalls at the same moment, whatever their order", () => {
    const now = day(20);
    const replay = (ratings: [Rating, Rating]) =>
      replayProgress(
        {
          mode: "term_to_meaning",
          reviews: ratings.map((rating) => ({ at: day(10), rating })),
        },
        now,
      ).reviews.map((review) => review.rating);
    expect(replay([3, 1])).toEqual([1]);
    expect(replay([1, 3])).toEqual([1]);
  });

  it("runs every grade through Lymi's scheduler and keeps the source's due date", () => {
    const due = day(30);
    const { state, reviews } = replayProgress(
      {
        mode: "term_to_meaning",
        reviews: [
          { at: day(10), rating: 3 },
          { at: day(11), rating: 3 },
          { at: day(15), rating: 1 },
          { at: day(16), rating: 4 },
        ],
        due,
      },
      now,
    );
    expect(reviews.map((r) => r.rating)).toEqual([3, 3, 1, 4]);
    expect(reviews[0]?.state).toBe(State.New);
    expect(reviews.every((r) => r.stability > 0 && r.difficulty > 0)).toBe(true);
    expect(state.due).toEqual(due);
    expect(state.last_review).toEqual(day(16));
    expect(state.state).toBe(State.Review);
    expect(state.lapses).toBe(1);
  });

  it("uses the source's memory only for a mode with a schedule and no log", () => {
    const { state, reviews } = replayProgress(
      {
        mode: "term_to_meaning",
        reviews: [],
        due: day(60),
        memory: { stability: 30, difficulty: 3.5, lastReview: day(30) },
      },
      now,
    );
    expect(reviews).toEqual([]);
    expect(state).toMatchObject({
      state: State.Review,
      stability: 30,
      difficulty: 3.5,
      due: day(60),
    });
    expect(state.scheduled_days).toBe(30);
  });

  it("leaves the source's memory alone once the mode has a log", () => {
    const progress = {
      mode: "term_to_meaning" as const,
      reviews: [{ at: day(10), rating: 3 as Rating }],
      due: day(60),
    };
    const memory = { stability: 30, difficulty: 3.5, lastReview: day(30) };
    const { state } = replayProgress({ ...progress, memory }, now);
    expect(state).toEqual(replayProgress(progress, now).state);
    expect(state.last_review).toEqual(day(10));
  });

  it("leaves a mode the source reset as new, with its log kept as history", () => {
    const { state, reviews } = replayProgress(
      { mode: "meaning_to_term", reviews: [{ at: day(5), rating: 3 }], unstarted: true },
      now,
    );
    expect(reviews).toHaveLength(1);
    expect(state.state).toBe(State.New);
  });
});

describe("guessLanguage", () => {
  it("reads a language from English or native names in a deck path", () => {
    expect(guessLanguage("Italian::Lesson 1")).toBe("it");
    expect(guessLanguage("Deutsch A1")).toBe("de");
    expect(guessLanguage("日本語 N5")).toBe("ja");
    expect(guessLanguage("Українська лексика")).toBe("uk");
    expect(guessLanguage("Spanish for English speakers")).toBe("es");
    expect(guessLanguage("English for Spanish speakers")).toBe("en");
  });
  it("matches a name as a whole word", () => {
    expect(guessLanguage("Polishing nouns")).toBeNull();
  });
  it("says nothing when the name names no language", () => {
    expect(guessLanguage("Lesson 1")).toBeNull();
    expect(guessLanguage("Default")).toBeNull();
  });
});

describe("arrivesKnown", () => {
  const learned = {
    mode: "term_to_meaning" as const,
    reviews: [
      { at: day(10), rating: 3 as const },
      { at: day(14), rating: 3 as const },
    ],
  };
  const fresh = { mode: "meaning_to_term" as const, reviews: [] };

  const both = {
    modes: ["term_to_meaning", "meaning_to_term"] as ("term_to_meaning" | "meaning_to_term")[],
    archived: false,
    fields: { term: "kass", meaning: "cat" },
  };

  it("follows the mode a two-way card is taught first, meaning to term", () => {
    const produced = { ...learned, mode: "meaning_to_term" as const };
    const recognised = { ...fresh, mode: "term_to_meaning" as const };
    expect(arrivesKnown({ ...both, progress: [recognised, produced] }, now)).toBe(true);
    expect(arrivesKnown({ ...both, progress: [fresh, learned] }, now)).toBe(false);
  });

  it("follows term to meaning when the card has no meaning to show", () => {
    const { fields: _, ...noMeaning } = both;
    expect(arrivesKnown({ ...noMeaning, progress: [fresh, learned] }, now)).toBe(true);
  });

  it("keeps a picture card's own order", () => {
    const picture = { mode: "image_to_term" as const, reviews: learned.reviews };
    expect(
      arrivesKnown(
        { ...both, modes: ["image_to_term", "meaning_to_term"], progress: [fresh, picture] },
        now,
      ),
    ).toBe(true);
  });

  it("follows a picture card's text mode while its own list puts that first", () => {
    const picture = { mode: "image_to_term" as const, reviews: learned.reviews };
    expect(
      arrivesKnown(
        { ...both, modes: ["meaning_to_term", "image_to_term"], progress: [fresh, picture] },
        now,
      ),
    ).toBe(false);
  });

  it("is not Known when the card arrives archived", () => {
    expect(
      arrivesKnown({ modes: ["term_to_meaning"], archived: true, progress: [learned] }, now),
    ).toBe(false);
  });

  it("ignores progress for a mode the card isn't asked in", () => {
    expect(
      arrivesKnown({ modes: ["meaning_to_term"], archived: false, progress: [learned] }, now),
    ).toBe(false);
  });
});
