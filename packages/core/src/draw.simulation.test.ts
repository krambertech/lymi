import { State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { collection, rng, type SimMode, toDrawCards } from "../simulation/learner";
import {
  type DayWindow,
  type DrawCard,
  type DrawLogEntry,
  type Drawn,
  draw,
  drawableCount,
  drawOrder,
  missed,
  RETURN_GAPS,
  returnGap,
  UNSEEN_HALF_LIFE_DAYS,
} from "./draw";
import { emptyState, type FsrsCard, schedule } from "./fsrs";
import type { Rating } from "./types";

/**
 * The draw over generated days, graded through the real scheduler. Each run checks every
 * rule ADR 0019 states as an invariant of the whole day rather than one arranged example.
 */

const DAY = 86_400_000;

interface Attempt extends Drawn {
  rating: Rating;
  stateBefore: State;
  stateAfter: State;
}

/**
 * Play one day: draw, grade through FSRS with a seeded rating, log it, repeat until the
 * draw says the day is exhausted or `cap` attempts have landed. Missing is common so
 * returns are exercised hard.
 */
function playDay(
  modes: SimMode[],
  day: DayWindow,
  seed: number,
  cap = 400,
  scope: { deckId?: string } = {},
) {
  const random = rng(seed * 7 + 1);
  const cards = toDrawCards(modes, day);
  const log: DrawLogEntry[] = [];
  const attempts: Attempt[] = [];
  const byKey = new Map(modes.map((m) => [`${m.cardId} ${m.mode}`, m]));
  let clock = day.start.getTime() + 9 * 3_600_000;
  while (attempts.length < cap) {
    const next = draw(cards, log, day, scope);
    if (!next) break;
    const sim = byKey.get(`${next.cardId} ${next.mode}`);
    if (!sim) throw new Error(`drew unknown mode ${next.cardId} ${next.mode}`);
    const roll = random();
    const rating = (roll < 0.3 ? 1 : roll < 0.45 ? 2 : roll < 0.9 ? 3 : 4) as Rating;
    const before = sim.card.state;
    clock += 20_000;
    sim.card = schedule(sim.card, rating, new Date(clock)).card;
    log.push({
      cardId: next.cardId,
      mode: next.mode,
      rating,
      stateBefore: before,
      at: new Date(clock),
    });
    attempts.push({ ...next, rating, stateBefore: before, stateAfter: sim.card.state });
  }
  return { cards, log, attempts, exhausted: draw(cards, log, day, scope) === null };
}

const day: DayWindow = {
  date: "2026-09-13",
  start: new Date("2026-09-13T00:00:00Z"),
  end: new Date("2026-09-14T00:00:00Z"),
};

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34];

describe("the miss rule is the scheduler's", () => {
  it("says a grade leaves learning exactly when FSRS does, from every state", () => {
    const now = new Date("2026-09-13T10:00:00Z");
    const fresh = emptyState(now);
    const learning = schedule(fresh, 1, now).card;
    const review = schedule(fresh, 3, now).card;
    const relearning = schedule(review, 1, review.due).card;
    const cases: [State, FsrsCard, Date][] = [
      [State.New, fresh, now],
      [State.Learning, learning, new Date(now.getTime() + 60_000)],
      [State.Review, review, review.due],
      [State.Relearning, relearning, new Date(relearning.due.getTime() + 60_000)],
    ];
    for (const [state, card, at] of cases) {
      expect(card.state).toBe(state);
      for (const rating of [1, 2, 3, 4] as const) {
        const after = schedule(card, rating, at).card.state;
        const inLearning = after === State.Learning || after === State.Relearning;
        expect(missed(rating, state), `rating ${rating} from ${State[state]}`).toBe(inLearning);
      }
    }
  });
});

describe("a generated day holds every rule", () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: sibling, cap, gap, precedence and exhaustion hold at every attempt`, () => {
      const modes = collection(seed, day, 120);
      const { cards, log, attempts, exhausted } = playDay(modes, day, seed);
      expect(attempts.length).toBeGreaterThan(30);

      const seen = new Map<string, number[]>();
      attempts.forEach((a, i) => {
        const k = `${a.cardId} ${a.mode}`;
        const before = log.slice(0, i);

        // One mode of a card per day: a card seen already is only ever drawn as a return.
        const cardBefore = before.filter((e) => e.cardId === a.cardId);
        if (cardBefore.length > 0) {
          expect(a.kind, `attempt ${i}`).toBe("return");
          expect(
            cardBefore.every((e) => e.mode === a.mode),
            `attempt ${i}`,
          ).toBe(true);
        } else expect(a.kind).not.toBe("return");

        // A repeat comes only after a miss, never after a success.
        const last = cardBefore.at(-1);
        if (last) expect(missed(last.rating, last.stateBefore), `attempt ${i}`).toBe(true);

        // Its gap is the named one: reached, and served the moment it was reached.
        if (a.kind === "return") {
          const misses = cardBefore.filter((e) => missed(e.rating, e.stateBefore)).length;
          const missedAt = before.lastIndexOf(last as DrawLogEntry);
          const since = i - missedAt - 1;
          const gap = returnGap(day.date, a.cardId, a.mode, misses);
          expect(misses).toBeLessThanOrEqual(RETURN_GAPS.length);
          if (since < gap) {
            // Early only when nothing else was drawable: every card left was a pending return.
            const pending = new Map<string, number>();
            for (const e of before) {
              const ek = `${e.cardId} ${e.mode}`;
              if (missed(e.rating, e.stateBefore)) pending.set(ek, (pending.get(ek) ?? 0) + 1);
              else pending.delete(ek);
            }
            const stillReturning = new Set(
              [...pending.entries()]
                .filter(([, n]) => n <= RETURN_GAPS.length)
                .map(([ek]) => ek.split(" ")[0]),
            );
            expect(drawableCount(cards, before, day), `attempt ${i}`).toBe(stillReturning.size);
          }
        }

        // Whenever some return has reached its gap, the attempt is a return.
        const pending = new Map<string, { misses: number; at: number }>();
        before.forEach((e, j) => {
          const ek = `${e.cardId} ${e.mode}`;
          if (missed(e.rating, e.stateBefore)) {
            pending.set(ek, { misses: (pending.get(ek)?.misses ?? 0) + 1, at: j });
          } else pending.delete(ek);
        });
        const reached = [...pending.entries()].some(([ek, p]) => {
          const [cardId, mode] = ek.split(" ") as [string, string];
          return (
            p.misses <= RETURN_GAPS.length &&
            i - p.at - 1 >= returnGap(day.date, cardId, mode, p.misses)
          );
        });
        if (reached) expect(a.kind, `attempt ${i}`).toBe("return");

        // A new card is only introduced once the mode before it has reached Review.
        if (a.kind === "unseen") {
          const card = cards.find((c) => c.cardId === a.cardId) as DrawCard;
          const asked = card.modes.filter((m) => m.hasCue);
          const index = asked.findIndex((m) => m.mode === a.mode);
          expect(index, `attempt ${i}`).toBeGreaterThanOrEqual(0);
          if (index > 0) {
            const previous = asked[index - 1] as (typeof asked)[number];
            expect([State.Review, State.Relearning], `attempt ${i}`).toContain(previous.state);
          }
        }

        seen.set(k, [...(seen.get(k) ?? []), i]);
      });

      // No mode is seen more than once plus its three returns.
      for (const positions of seen.values()) {
        expect(positions.length).toBeLessThanOrEqual(1 + RETURN_GAPS.length);
      }

      // The day ended for a reason: nothing is left that the rules allow.
      expect(exhausted).toBe(true);
      expect(drawableCount(cards, log, day)).toBe(0);
      for (const card of cards) {
        const graded = log.filter((e) => e.cardId === card.cardId);
        if (graded.length > 0) continue;
        // An untouched card had nothing eligible: due later, no cue, or waiting on its sibling.
        const asked = card.modes.filter((m) => m.hasCue);
        asked.forEach((m, index) => {
          const previous = asked[index - 1];
          const held =
            m.state === State.New &&
            index > 0 &&
            !(previous?.state === State.Review || previous?.state === State.Relearning);
          expect(m.due.getTime() >= day.end.getTime() || held, `${card.cardId} ${m.mode}`).toBe(
            true,
          );
        });
      }
    });
  }

  it("counts what the order holds, and a limit is a prefix, whatever the day looks like", () => {
    for (const seed of SEEDS) {
      const modes = collection(seed, day, 80);
      const { cards, log } = playDay(modes, day, seed, 25);
      const full = drawOrder(cards, log, day);
      expect(full.length).toBeGreaterThan(0);
      expect(drawableCount(cards, log, day)).toBe(new Set(full.map((d) => d.cardId)).size);
      // The draw and the count never disagree about whether the day is over.
      const played = [...log];
      for (const d of full) {
        expect(drawableCount(cards, played, day)).toBeGreaterThan(0);
        played.push({
          cardId: d.cardId,
          mode: d.mode,
          rating: 3,
          stateBefore: State.Review,
          at: day.start,
        });
      }
      expect(draw(cards, played, day)).toBeNull();
      expect(drawableCount(cards, played, day)).toBe(0);
      expect(drawOrder(cards, log, day, {}, 7)).toEqual(full.slice(0, 7));
      for (const deckId of ["d0", "d1", "d2"]) {
        const scoped = drawOrder(cards, log, day, { deckId });
        expect(
          scoped.every(
            (d) =>
              d.cardId.length > 0 && cards.find((c) => c.cardId === d.cardId)?.deckId === deckId,
          ),
        ).toBe(true);
        expect(drawableCount(cards, log, day, { deckId })).toBe(
          new Set(scoped.map((d) => d.cardId)).size,
        );
      }
    }
  });

  it("gives the same next card from the same log on another device, in another scope", () => {
    const modes = collection(3, day, 60);
    const { cards, log } = playDay(modes, day, 3, 40);
    const again = draw(cards, [...log], day);
    expect(draw(cards, log, day)).toEqual(again);
    // A deck scope sees the all-decks pick whenever that pick is in the deck.
    const pick = again as Drawn;
    const deckId = cards.find((c) => c.cardId === pick.cardId)?.deckId;
    expect(draw(cards, log, day, { deckId })).toEqual(pick);
  });

  it("never draws a mode graded to Review today, and serves a last-minute miss at once", () => {
    const modes = collection(21, day, 40);
    const { cards, log, attempts } = playDay(modes, day, 21);
    const finished = new Set<string>();
    attempts.forEach((a, i) => {
      const k = `${a.cardId} ${a.mode}`;
      expect(finished.has(k), `attempt ${i} redrew a finished mode`).toBe(false);
      if (!missed(a.rating, a.stateBefore)) finished.add(k);
    });
    // Forget the last drawable card with nothing else left: it is the next card, not tomorrow's.
    const last = attempts.at(-1) as Attempt;
    if (missed(last.rating, last.stateBefore)) return;
    const trimmed = log.slice(0, -1);
    trimmed.push({ ...(log.at(-1) as DrawLogEntry), rating: 1 });
    expect(draw(cards, trimmed, day)).toMatchObject({ cardId: last.cardId, kind: "return" });
  });
});

describe("a day of only cards left learning", () => {
  it("ends after each has been served, not after the first", () => {
    const now = new Date("2026-09-12T10:00:00Z");
    const modes: SimMode[] = [1, 2, 3, 4].map((i) => ({
      cardId: `l${i}`,
      deckId: "d0",
      mode: "term_to_meaning",
      card: schedule(emptyState(now), 1, now).card,
      added: now,
      hasCue: true,
    }));
    const { attempts, exhausted, cards, log } = playDay(modes, day, 9);
    expect(attempts.filter((a) => a.kind === "carry")).toHaveLength(4);
    expect(exhausted).toBe(true);
    expect(drawableCount(cards, log, day)).toBe(0);
  });
});

describe("the weights are the ones the simulations chose", () => {
  const trials = 4000;
  const dates = Array.from({ length: trials }, (_, i) =>
    new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
  );
  const share = (cards: DrawCard[], first: string) =>
    dates.filter((date) => drawOrder(cards, [], { ...day, date })[0]?.cardId === first).length /
    trials;

  it("draws a review with odds of retrievability to the fourth power", () => {
    const review = (cardId: string, r: number): DrawCard => ({
      cardId,
      deckId: "d",
      modes: [
        {
          mode: "term_to_meaning",
          state: State.Review,
          due: day.start,
          retrievability: r,
          added: day.start,
          hasCue: true,
        },
      ],
    });
    const expected = 0.9 ** 4 / (0.9 ** 4 + 0.6 ** 4);
    expect(share([review("strong", 0.9), review("weak", 0.6)], "strong")).toBeCloseTo(expected, 1);
  });

  it("halves an unseen card's odds every week, in the three slots of four", () => {
    const unseen = (cardId: string, ageDays: number): DrawCard => ({
      cardId,
      deckId: "d",
      modes: [
        {
          mode: "term_to_meaning",
          state: State.New,
          due: day.start,
          retrievability: 0,
          added: new Date(day.start.getTime() - ageDays * DAY),
          hasCue: true,
        },
      ],
    });
    // The first slot of a day is a weighted one, so the oldest-card slot never interferes.
    const cards = [unseen("fresh", 0), unseen("week", UNSEEN_HALF_LIFE_DAYS)];
    expect(share(cards, "fresh")).toBeCloseTo(2 / 3, 1);
  });
});

describe("the order is pinned", () => {
  // A change here changes every learner's order on deploy. Change it on purpose or not at all.
  it("hashes the date, card and mode to the same keys as before", () => {
    expect([1, 2, 3].map((m) => returnGap("2026-09-13", "card-a", "term_to_meaning", m))).toEqual([
      6, 9, 20,
    ]);
    expect([1, 2, 3].map((m) => returnGap("2026-09-14", "card-a", "term_to_meaning", m))).toEqual([
      4, 9, 20,
    ]);
    const modes = collection(42, day, 30);
    const order = drawOrder(toDrawCards(modes, day), [], day, {}, 12).map(
      (d) => `${d.cardId}:${d.kind[0]}`,
    );
    expect(order).toEqual([
      "c11:c",
      "c26:r",
      "c19:r",
      "c29:r",
      "c8:r",
      "c5:u",
      "c2:r",
      "c24:r",
      "c7:r",
      "c3:r",
      "c15:u",
      "c16:r",
    ]);
  });
});
