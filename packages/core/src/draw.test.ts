import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import {
  CARRY_OVER_EVERY,
  type DayWindow,
  type DrawCard,
  type DrawLogEntry,
  type DrawMode,
  dayWindow,
  draw,
  drawableCount,
  drawOrder,
  forgottenToday,
  localDate,
  missed,
  NEW_CARD_SLOT_EVERY,
  OLDEST_UNSEEN_SLOT_EVERY,
  RETURN_GAPS,
  RETURN_JITTER,
  returnGap,
  roundOrder,
  SLIPPING_RETURN_GAP,
  startOfLocalDay,
} from "./draw";
import type { Rating } from "./types";

const DAY = 86_400_000;
const day: DayWindow = {
  date: "2026-09-13",
  start: new Date("2026-09-13T00:00:00Z"),
  end: new Date("2026-09-14T00:00:00Z"),
};
const noon = new Date("2026-09-13T12:00:00Z");
const daysAgo = (n: number) => new Date(day.start.getTime() - n * DAY);

function mode(partial: Partial<DrawMode> & { mode: string }): DrawMode {
  return {
    state: State.Review,
    due: daysAgo(1),
    retrievability: 0.9,
    added: daysAgo(30),
    hasCue: true,
    ...partial,
  };
}

/** A card asked meaning → term first, then term → meaning, as the default order says. */
function card(
  cardId: string,
  modes: (Partial<DrawMode> & { mode: string })[],
  deckId = "deck-a",
): DrawCard {
  return { cardId, deckId, modes: modes.map(mode) };
}

const review = (id: string, retrievability = 0.9, deckId?: string) =>
  card(id, [{ mode: "meaning_to_term", retrievability }], deckId);
const unseen = (id: string, added = daysAgo(1), deckId?: string) =>
  card(id, [{ mode: "meaning_to_term", state: State.New, added, due: added }], deckId);

function grade(
  cardId: string,
  rating: Rating,
  stateBefore: State = State.Review,
  mode = "meaning_to_term",
): DrawLogEntry {
  return { cardId, mode, rating, stateBefore, at: noon };
}

/** Grade what `draw` gives, `n` times, and return the log with what each attempt was. */
function play(
  cards: DrawCard[],
  n: number,
  ratingOf: (cardId: string, attempt: number) => Rating = () => 3,
  log: DrawLogEntry[] = [],
) {
  const states = new Map(cards.flatMap((c) => c.modes.map((m) => [`${c.cardId} ${m.mode}`, m])));
  const played: { cardId: string; kind: string }[] = [];
  for (let i = 0; i < n; i++) {
    const next = draw(cards, log, day);
    if (!next) break;
    played.push({ cardId: next.cardId, kind: next.kind });
    const before = log.some((e) => e.cardId === next.cardId && e.mode === next.mode)
      ? State.Learning
      : (states.get(`${next.cardId} ${next.mode}`)?.state ?? State.Review);
    log.push(grade(next.cardId, ratingOf(next.cardId, i), before, next.mode));
  }
  return { played, log };
}

describe("missed", () => {
  it("is Forgot anywhere, or Hard outside Review", () => {
    expect(missed(1, State.Review)).toBe(true);
    expect(missed(2, State.New)).toBe(true);
    expect(missed(2, State.Learning)).toBe(true);
    expect(missed(2, State.Relearning)).toBe(true);
    expect(missed(2, State.Review)).toBe(false);
    expect(missed(3, State.New)).toBe(false);
    expect(missed(4, State.Learning)).toBe(false);
  });
});

describe("eligibility", () => {
  it("takes a mode due before the end of the day, whatever the time", () => {
    const cards = [
      card("late", [{ mode: "meaning_to_term", due: new Date(day.end.getTime() - 1) }]),
      card("tomorrow", [{ mode: "meaning_to_term", due: day.end }]),
    ];
    expect(drawOrder(cards, [], day).map((d) => d.cardId)).toEqual(["late"]);
  });

  it("introduces modes one at a time, in order, once the previous one reaches Review", () => {
    const fresh = card("fresh", [
      { mode: "meaning_to_term", state: State.New, due: daysAgo(1) },
      { mode: "term_to_meaning", state: State.New, due: daysAgo(1) },
    ]);
    expect(drawOrder([fresh], [], day)).toEqual([
      { cardId: "fresh", mode: "meaning_to_term", kind: "unseen" },
    ]);

    const learning = card("learning", [
      { mode: "meaning_to_term", state: State.Learning, due: daysAgo(1) },
      { mode: "term_to_meaning", state: State.New, due: daysAgo(1) },
    ]);
    expect(drawOrder([learning], [], day).map((d) => d.mode)).toEqual(["meaning_to_term"]);

    const known = card("known", [
      { mode: "meaning_to_term", state: State.Review, due: new Date(day.end.getTime() + DAY) },
      { mode: "term_to_meaning", state: State.New, due: daysAgo(1) },
    ]);
    expect(drawOrder([known], [], day)).toEqual([
      { cardId: "known", mode: "term_to_meaning", kind: "unseen" },
    ]);

    // Relearning counts as having reached Review, so a lapse does not hold the next mode back.
    const relearning = card("relearning", [
      { mode: "meaning_to_term", state: State.Relearning, due: day.end },
      { mode: "term_to_meaning", state: State.New, due: daysAgo(1) },
    ]);
    expect(drawOrder([relearning], [], day).map((d) => d.mode)).toEqual(["term_to_meaning"]);
  });

  it("skips a mode without a cue, in the order too", () => {
    const noMeaning = card("bare", [
      { mode: "meaning_to_term", state: State.New, due: daysAgo(1), hasCue: false },
      { mode: "term_to_meaning", state: State.New, due: daysAgo(1) },
    ]);
    expect(drawOrder([noMeaning], [], day)).toEqual([
      { cardId: "bare", mode: "term_to_meaning", kind: "unseen" },
    ]);
  });

  it("keeps two modes of one card off the same day", () => {
    const both = card("both", [
      { mode: "meaning_to_term", state: State.Review, due: daysAgo(1) },
      { mode: "term_to_meaning", state: State.Review, due: daysAgo(1) },
    ]);
    const order = drawOrder([both, review("other")], [], day);
    expect(order.filter((d) => d.cardId === "both")).toHaveLength(1);
    const log = [grade("both", 3, State.Review, "meaning_to_term")];
    expect(drawOrder([both], log, day)).toEqual([]);
    expect(drawableCount([both], log, day)).toBe(0);
  });

  it("brings a card back after Undo removes its grade from the log", () => {
    const cards = [review("a")];
    expect(drawableCount(cards, [grade("a", 3)], day)).toBe(0);
    expect(drawableCount(cards, [], day)).toBe(1);
  });
});

describe("scope and determinism", () => {
  const cards = [
    ...Array.from({ length: 12 }, (_, i) =>
      review(`r${i}`, 0.5 + i / 30, i % 2 ? "deck-a" : "deck-b"),
    ),
    ...Array.from({ length: 6 }, (_, i) =>
      unseen(`n${i}`, daysAgo(i), i % 2 ? "deck-a" : "deck-b"),
    ),
  ];

  it("gives the same order for the same inputs", () => {
    expect(drawOrder(cards, [], day)).toEqual(drawOrder(cards, [], day));
  });

  it("orders a deck's reviews as the all-decks review order filtered", () => {
    // Keys hash the date, card and mode, so a group's order is the same in every scope. The
    // interleave with new cards is not: slots count the log, and the oldest-card slot picks
    // the oldest in scope.
    const all = drawOrder(cards, [], day);
    const deck = drawOrder(cards, [], day, { deckId: "deck-a" });
    const deckIds = new Set(cards.filter((c) => c.deckId === "deck-a").map((c) => c.cardId));
    const reviews = (list: typeof all) =>
      list.filter((d) => d.kind === "review" && deckIds.has(d.cardId)).map((d) => d.cardId);
    expect(reviews(deck)).toEqual(reviews(all));
    expect(deck.every((d) => deckIds.has(d.cardId))).toBe(true);
    expect(drawableCount(cards, [], day, { deckId: "deck-a" })).toBe(deckIds.size);
  });

  it("changes the order on another day", () => {
    const other = { ...day, date: "2026-09-14" };
    expect(drawOrder(cards, [], other)).not.toEqual(drawOrder(cards, [], day));
  });

  it("counts what the full order holds", () => {
    expect(drawableCount(cards, [], day)).toBe(drawOrder(cards, [], day).length);
  });
});

describe("ordinary draws", () => {
  it("makes every fifth ordinary draw a new card while both groups are drawable", () => {
    const cards = [
      ...Array.from({ length: 20 }, (_, i) => review(`r${i}`)),
      ...Array.from({ length: 5 }, (_, i) => unseen(`n${i}`)),
    ];
    const kinds = drawOrder(cards, [], day).map((d) => d.kind);
    expect(kinds.slice(0, 10)).toEqual([
      "review",
      "review",
      "review",
      "review",
      "unseen",
      "review",
      "review",
      "review",
      "review",
      "unseen",
    ]);
    expect(kinds).toHaveLength(25);
  });

  it("fills the goal from one group when the other runs out", () => {
    const onlyNew = Array.from({ length: 7 }, (_, i) => unseen(`n${i}`));
    expect(drawOrder(onlyNew, [], day).every((d) => d.kind === "unseen")).toBe(true);
    const onlyReviews = Array.from({ length: 7 }, (_, i) => review(`r${i}`));
    expect(drawOrder(onlyReviews, [], day).every((d) => d.kind === "review")).toBe(true);
  });

  it("serves an unseen card added months ago within four new-card slots", () => {
    const cards = [
      ...Array.from({ length: 40 }, (_, i) => unseen(`fresh${i}`, daysAgo(1))),
      unseen("old", daysAgo(200)),
    ];
    const order = drawOrder(cards, [], day).map((d) => d.cardId);
    expect(order.indexOf("old")).toBeLessThan(OLDEST_UNSEEN_SLOT_EVERY);
  });

  it("favours the reviews best remembered, over many days", () => {
    const cards = [review("strong", 0.97), review("weak", 0.4)];
    let strongFirst = 0;
    for (let i = 0; i < 200; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      const first = drawOrder(cards, [], { ...day, date })[0];
      if (first?.cardId === "strong") strongFirst++;
    }
    expect(strongFirst).toBeGreaterThan(150);
  });

  it("favours recently added cards in three new-card slots of four", () => {
    const cards = [unseen("recent", daysAgo(1)), unseen("stale", daysAgo(60))];
    let recentFirst = 0;
    for (let i = 0; i < 200; i++) {
      const date = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      const first = drawOrder(cards, [], { ...day, date })[0];
      if (first?.cardId === "recent") recentFirst++;
    }
    expect(recentFirst).toBeGreaterThan(180);
  });
});

describe("returns", () => {
  it("brings a forgotten mode back after 5, 10 and 20 attempts, then waits for tomorrow", () => {
    const cards = Array.from({ length: 60 }, (_, i) => review(`r${i}`));
    const first = drawOrder(cards, [], day)[0]?.cardId as string;
    const log: DrawLogEntry[] = [];
    const { played } = play(cards, 45, (id) => (id === first ? 1 : 3), log);
    const appearances = played.flatMap((p, i) => (p.cardId === first ? [i] : []));
    expect(appearances).toHaveLength(4);
    const gaps = appearances.slice(1).map((at, i) => at - (appearances[i] as number) - 1);
    gaps.forEach((gap, i) => {
      expect(gap).toBe(returnGap(day.date, first, "meaning_to_term", i + 1));
      expect(Math.abs(gap - (RETURN_GAPS[i] as number))).toBeLessThanOrEqual(RETURN_JITTER);
    });
    expect(played.filter((p) => p.cardId === first).map((p) => p.kind)).toEqual([
      "review",
      "return",
      "return",
      "return",
    ]);
    // The forgotten card is past its cap, 41 others were reviewed once, 18 are left.
    expect(drawableCount(cards, log, day)).toBe(18);
  });

  it("brings an often-forgotten mode back once, about ten attempts later", () => {
    const cards = Array.from({ length: 30 }, (_, i) => review(`r${i}`));
    const first = drawOrder(cards, [], day)[0]?.cardId as string;
    const slipping = cards.map((c) => (c.cardId === first ? { ...c, slipping: true } : c));
    const { played } = play(slipping, 30, (id) => (id === first ? 1 : 3));
    const appearances = played.flatMap((p, i) => (p.cardId === first ? [i] : []));
    expect(appearances).toHaveLength(2);
    const gap = (appearances[1] as number) - (appearances[0] as number) - 1;
    expect(gap).toBe(returnGap(day.date, first, "meaning_to_term", 1, true));
    expect(Math.abs(gap - SLIPPING_RETURN_GAP)).toBeLessThanOrEqual(RETURN_JITTER);
  });

  it("stops drawing a mode past three returns, and a day of only those is exhausted", () => {
    const log = [
      grade("a", 1, State.Review),
      grade("a", 1, State.Relearning),
      grade("a", 1, State.Relearning),
      grade("a", 1, State.Relearning),
    ];
    const cards = [
      card("a", [{ mode: "meaning_to_term", state: State.Relearning }]),
      review("b"),
    ];
    const between = grade("b", 3);
    expect(drawableCount(cards, [...log, between], day)).toBe(0);
    expect(draw(cards, [...log, between], day)).toBeNull();
    expect(drawableCount(cards, [...log.slice(0, 3), between], day)).toBe(1);
  });

  it("returns Hard while learning, not Hard in Review", () => {
    const learning = [card("l", [{ mode: "meaning_to_term", state: State.Learning }]), review("x")];
    const log = [grade("l", 2, State.Learning), grade("x", 3)];
    expect(draw(learning, log, day)?.kind).toBe("return");
    const reviewed = [review("r"), review("x")];
    expect(draw(reviewed, [grade("r", 2, State.Review), grade("x", 3)], day)).toBeNull();
  });

  it("serves a due return before a new-card slot without spending the slot", () => {
    const cards = [
      ...Array.from({ length: 12 }, (_, i) => review(`r${i}`)),
      ...Array.from({ length: 4 }, (_, i) => unseen(`n${i}`)),
    ];
    const first = draw(cards, [], day) as { cardId: string };
    const { played } = play(cards, 12, (id, i) => (i === 0 && id === first.cardId ? 1 : 3));
    const back = played.findIndex((p, i) => i > 0 && p.cardId === first.cardId);
    expect(played[back]?.kind).toBe("return");
    const ordinary = played.filter((p) => p.kind !== "return");
    expect(ordinary[NEW_CARD_SLOT_EVERY - 1]?.kind).toBe("unseen");
    expect(ordinary.slice(0, NEW_CARD_SLOT_EVERY - 1).every((p) => p.kind === "review")).toBe(true);
  });

  it("serves the earliest pending return at once when nothing else is drawable", () => {
    const cards = [review("a"), review("b")];
    const log = [grade("b", 1), grade("a", 1)];
    expect(draw(cards, log, day)).toEqual({ cardId: "b", mode: "meaning_to_term", kind: "return" });
  });

  it("never serves a return straight after the same card, and a lone one ends the day", () => {
    const cards = [review("a"), review("b")];
    const log = [grade("a", 1), grade("b", 1)];
    expect(draw(cards, log, day)).toEqual({ cardId: "a", mode: "meaning_to_term", kind: "return" });
    const alone = [grade("a", 1), grade("b", 3)].concat(grade("a", 1, State.Relearning));
    expect(draw(cards, alone, day)).toBeNull();
    expect(drawableCount(cards, alone, day)).toBe(0);
  });

  it("ignores the clock: a return missed late at night is still due today", () => {
    const cards = [
      card("a", [{ mode: "meaning_to_term", state: State.Relearning, due: day.end }]),
      review("x"),
    ];
    expect(draw(cards, [grade("a", 1), grade("x", 3)], day)?.kind).toBe("return");
  });

  it("lists the modes whose latest grade today is Forgot", () => {
    const log = [grade("a", 1), grade("b", 1), grade("b", 3), grade("c", 3), grade("c", 1)];
    expect(forgottenToday(log)).toEqual([
      { cardId: "a", mode: "meaning_to_term" },
      { cardId: "c", mode: "meaning_to_term" },
    ]);
  });
});

describe("carry-over", () => {
  it("brings a mode left learning yesterday back first, then spaced", () => {
    const cards = [
      ...Array.from({ length: 12 }, (_, i) => review(`r${i}`)),
      card("l1", [{ mode: "meaning_to_term", state: State.Learning, due: daysAgo(1) }]),
      card("l2", [{ mode: "meaning_to_term", state: State.Relearning, due: daysAgo(2) }]),
    ];
    const { played } = play(cards, 8);
    expect(played[0]).toEqual({ cardId: "l2", kind: "carry" });
    expect(played[CARRY_OVER_EVERY]).toEqual({ cardId: "l1", kind: "carry" });
    expect(played.filter((p) => p.kind === "carry")).toHaveLength(2);
  });

  it("serves the carry-overs that are left when nothing else is drawable", () => {
    const cards = [1, 2, 3].map((i) =>
      card(`l${i}`, [{ mode: "meaning_to_term", state: State.Learning, due: daysAgo(1) }]),
    );
    const { played, log } = play(cards, 5);
    expect(played.map((p) => p.kind)).toEqual(["carry", "carry", "carry"]);
    expect(draw(cards, log, day)).toBeNull();
    expect(drawableCount(cards, log, day)).toBe(0);
    expect(drawOrder(cards, [], day)).toHaveLength(3);
  });

  it("lets a due return go before a carry-over", () => {
    const cards = [
      ...Array.from({ length: 12 }, (_, i) => review(`r${i}`)),
      card("l", [{ mode: "meaning_to_term", state: State.Learning, due: daysAgo(1) }]),
    ];
    const { played } = play(cards, 8, (id, i) => (i === 0 && id === "l" ? 1 : 3));
    expect(played[0]).toEqual({ cardId: "l", kind: "carry" });
    const gap = returnGap(day.date, "l", "meaning_to_term", 1);
    expect(played[gap + 1]).toEqual({ cardId: "l", kind: "return" });
  });
});

describe("the learner-local day", () => {
  it("runs from local midnight to the next", () => {
    const window = dayWindow(new Date("2026-09-13T21:30:00Z"), "Europe/Tallinn");
    expect(window).toEqual({
      date: "2026-09-14",
      start: new Date("2026-09-13T21:00:00Z"),
      end: new Date("2026-09-14T21:00:00Z"),
    });
  });

  it("keeps a day that changes clocks at 23 or 25 hours", () => {
    const fallBack = dayWindow(new Date("2026-10-25T12:00:00Z"), "Europe/Tallinn");
    expect(fallBack.end.getTime() - fallBack.start.getTime()).toBe(25 * 3_600_000);
    const springForward = dayWindow(new Date("2026-03-29T12:00:00Z"), "Europe/Tallinn");
    expect(springForward.end.getTime() - springForward.start.getTime()).toBe(23 * 3_600_000);
  });

  it("finds the day start in a zone whose clocks jump at midnight", () => {
    // Santiago springs forward at 00:00 on 6 September 2026, so that day has no midnight.
    const zone = "America/Santiago";
    const start = startOfLocalDay("2026-09-06", zone);
    expect(start).toEqual(new Date("2026-09-06T04:00:00Z"));
    expect(localDate(start, zone)).toBe("2026-09-06");
    expect(localDate(new Date(start.getTime() - 1), zone)).toBe("2026-09-05");
    const window = dayWindow(new Date("2026-09-06T03:30:00Z"), zone);
    expect(window).toEqual({
      date: "2026-09-05",
      start: new Date("2026-09-05T04:00:00Z"),
      end: start,
    });
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(startOfLocalDay("2026-09-13", "Nowhere/Nowhere")).toEqual(
      new Date("2026-09-13T00:00:00Z"),
    );
  });
});

describe("rounds", () => {
  it("brings each card forgotten today once, in the mode it was forgotten in", () => {
    const cards = [
      card("a", [{ mode: "meaning_to_term", state: State.Relearning, due: noon }]),
      card("b", [{ mode: "meaning_to_term", state: State.Review, due: noon }]),
      card("c", [{ mode: "term_to_meaning", state: State.Relearning, due: noon }]),
    ];
    const log = [
      grade("a", 1),
      grade("b", 1),
      grade("b", 3, State.Relearning),
      grade("c", 1, State.Review, "term_to_meaning"),
      grade("a", 1, State.Relearning),
    ];
    expect(roundOrder(cards, log, day, { round: "forgotten" })).toEqual([
      { cardId: "a", mode: "meaning_to_term", kind: "return" },
      { cardId: "c", mode: "term_to_meaning", kind: "return" },
    ]);
  });

  it("keeps forgotten cards to the deck in scope", () => {
    const cards = [review("a", 0.5, "deck-a"), review("b", 0.5, "deck-b")];
    const log = [grade("a", 1), grade("b", 1)];
    const order = roundOrder(cards, log, day, { round: "forgotten", deckId: "deck-b" });
    expect(order.map((d) => d.cardId)).toEqual(["b"]);
  });

  it("starts new cards oldest first and skips cards reviewed today", () => {
    const cards = [
      unseen("young", daysAgo(1)),
      unseen("old", daysAgo(9)),
      unseen("mid", daysAgo(4)),
    ];
    const log = [grade("mid", 3, State.New)];
    const order = roundOrder(cards, log, day, { round: "new" });
    expect(order).toEqual([
      { cardId: "old", mode: "meaning_to_term", kind: "unseen" },
      { cardId: "young", mode: "meaning_to_term", kind: "unseen" },
    ]);
  });

  it("takes slipping cards in their weakest known mode, due or not, weakest first", () => {
    const later = new Date(day.end.getTime() + 5 * DAY);
    const cards = [
      card("strong", [{ mode: "meaning_to_term", retrievability: 0.8, due: later }]),
      card("weak", [
        { mode: "meaning_to_term", retrievability: 0.7, due: later },
        { mode: "term_to_meaning", retrievability: 0.3, due: later },
      ]),
      card("ignored", [{ mode: "meaning_to_term", retrievability: 0.1 }]),
      card("fresh", [{ mode: "meaning_to_term", state: State.New }]),
    ];
    const slipping = new Set(["strong", "weak", "fresh"]);
    expect(roundOrder(cards, [], day, { round: "slipping", slipping })).toEqual([
      { cardId: "weak", mode: "term_to_meaning", kind: "review" },
      { cardId: "strong", mode: "meaning_to_term", kind: "review" },
    ]);
  });

  it("keeps a slipping card that never reached Review", () => {
    const cards = [
      card("learning", [{ mode: "meaning_to_term", state: State.Relearning, retrievability: 0.2 }]),
      card("unseen", [{ mode: "meaning_to_term", state: State.New }]),
    ];
    const slipping = new Set(["learning", "unseen"]);
    expect(roundOrder(cards, [], day, { round: "slipping", slipping })).toEqual([
      { cardId: "learning", mode: "meaning_to_term", kind: "review" },
    ]);
  });

  it("counts a card as new only when no mode of it was reviewed", () => {
    const cards = [
      unseen("fresh", daysAgo(2)),
      card("half-known", [
        { mode: "meaning_to_term", state: State.Review },
        { mode: "term_to_meaning", state: State.New, due: daysAgo(1), added: daysAgo(3) },
      ]),
    ];
    expect(roundOrder(cards, [], day, { round: "new" }).map((d) => d.cardId)).toEqual(["fresh"]);
  });

  it("leaves a slipping card out once it is reviewed today", () => {
    const cards = [review("a", 0.4), review("b", 0.5)];
    const order = roundOrder(cards, [grade("a", 1)], day, {
      round: "slipping",
      slipping: new Set(["a", "b"]),
    });
    expect(order.map((d) => d.cardId)).toEqual(["b"]);
  });

  it("stops at the limit", () => {
    const cards = Array.from({ length: 5 }, (_, i) => unseen(`n${i}`, daysAgo(i + 1)));
    expect(roundOrder(cards, [], day, { round: "new" }, 2)).toHaveLength(2);
  });
});
