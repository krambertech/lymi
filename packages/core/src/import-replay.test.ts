import { describe, expect, it } from "vitest";
import { State } from "./fsrs";
import { replayProgress } from "./import-replay";
import { guessLanguage } from "./languages";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n, 15));
const now = day(40);

describe("replayProgress", () => {
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

  it("orders the log, drops repeats and grades from the future", () => {
    const { reviews } = replayProgress(
      {
        mode: "term_to_meaning",
        reviews: [
          { at: day(12), rating: 3 },
          { at: day(10), rating: 3 },
          { at: day(10), rating: 4 },
          { at: day(50), rating: 3 },
        ],
      },
      now,
    );
    expect(reviews.map((r) => r.reviewedAt)).toEqual([day(10), day(12)]);
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

  it("leaves a mode the source reset as new, with its log kept as history", () => {
    const { state, reviews } = replayProgress(
      { mode: "meaning_to_term", reviews: [{ at: day(5), rating: 3 }], unstarted: true },
      now,
    );
    expect(reviews).toHaveLength(1);
    expect(state.state).toBe(State.New);
  });

  it("starts a mode with nothing to replay as new", () => {
    expect(replayProgress({ mode: "term_to_meaning", reviews: [] }, now).state.state).toBe(
      State.New,
    );
  });
});

describe("guessLanguage", () => {
  it("reads a language from English or native names in a deck path", () => {
    expect(guessLanguage("Italian::Lesson 1")).toBe("it");
    expect(guessLanguage("Deutsch A1")).toBe("de");
    expect(guessLanguage("日本語 N5")).toBe("ja");
    expect(guessLanguage("Українська лексика")).toBe("uk");
    expect(guessLanguage("Spanish for English speakers")).toBe("es");
  });
  it("says nothing when the name names no language", () => {
    expect(guessLanguage("Lesson 1")).toBeNull();
    expect(guessLanguage("Default")).toBeNull();
  });
});
