import { CHOSEN_LIMIT } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { join } from "./members";
import { gradeCard, reviewQueue } from "./review";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let n = 0;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function person(name: string) {
  n += 1;
  return learner(db, `${name.toLowerCase()}-${n}`, name);
}

const DAY = 86_400_000;

async function grade(ctx: ServiceContext, cardId: string, rating: 1 | 2 | 3 | 4, daysAgo = 0) {
  await gradeCard(ctx, {
    cardId,
    direction: "recognition",
    rating,
    reviewedAt: new Date(Date.now() - daysAgo * DAY),
    timezone: "UTC",
  });
}

/** A deck of the given terms, with each card's id by term. */
async function deckOf(ctx: ServiceContext, terms: string[]) {
  const deck = await createDeck(ctx, { name: `Deck ${n}`, defaultLanguage: "it" });
  const outcomes = await addCards(
    ctx,
    terms.map((term) => ({ deckId: deck.id, term })),
  );
  const ids: Record<string, string> = {};
  for (const o of outcomes) if (o.status === "added") ids[o.card.term] = o.card.id;
  return { deck, ids };
}

const terms = (queue: { items: { card: { term: string } }[] }) =>
  queue.items.map((i) => i.card.term);

describe("reviewing chosen cards", () => {
  it("takes the started cards chosen, due ones first, whether or not they are due", async () => {
    const me = await person("Kateryna");
    const { deck, ids } = await deckOf(me, [
      "la bolletta",
      "il cassetto",
      "il treno",
      "la ruggine",
    ]);
    // Easy yesterday puts the drawer ahead; Forgot three days ago leaves the bill due now.
    await grade(me, ids["il cassetto"] as string, 4, 1);
    await grade(me, ids["la bolletta"] as string, 1, 3);
    await grade(me, ids["il treno"] as string, 1, 3);
    const chosen = [ids["la bolletta"], ids["il cassetto"], ids["la ruggine"]] as string[];

    const queue = await reviewQueue(me, { deckId: deck.id, cardIds: chosen });
    // The train was not chosen, and the rust card is new, which the day's draw introduces.
    expect(terms(queue)).toEqual(["la bolletta", "il cassetto"]);
    expect(queue.total).toBe(2);
    const day = await reviewQueue(me, { deckId: deck.id });
    expect(terms(day)).not.toContain("il cassetto");
  });

  it("leaves out a card already reviewed today", async () => {
    const me = await person("Kateryna");
    const { deck, ids } = await deckOf(me, ["a", "b"]);
    await grade(me, ids.a as string, 3, 3);
    await grade(me, ids.b as string, 3, 3);
    await grade(me, ids.a as string, 3);

    const queue = await reviewQueue(me, { deckId: deck.id, cardIds: [ids.a, ids.b] as string[] });
    expect(terms(queue)).toEqual(["b"]);
  });

  it("lets a member review chosen cards from their own schedule", async () => {
    const me = await person("Kateryna");
    const member = await person("Mari");
    const stranger = await person("Juhan");
    const { deck, ids } = await deckOf(me, ["a", "b"]);
    await join(member, deck.id);
    await grade(me, ids.a as string, 3, 2);
    await grade(member, ids.b as string, 3, 2);
    const chosen = [ids.a, ids.b] as string[];

    const mine = await reviewQueue(member, { deckId: deck.id, cardIds: chosen });
    expect(terms(mine)).toEqual(["b"]);
    await expect(reviewQueue(stranger, { deckId: deck.id, cardIds: chosen })).rejects.toMatchObject(
      { code: "not_found" },
    );
  });

  it("ignores a chosen card from another deck", async () => {
    const me = await person("Kateryna");
    const one = await deckOf(me, ["a"]);
    const other = await deckOf(me, ["b"]);
    await grade(me, one.ids.a as string, 3, 2);
    await grade(me, other.ids.b as string, 3, 2);

    const queue = await reviewQueue(me, {
      deckId: one.deck.id,
      cardIds: [one.ids.a, other.ids.b] as string[],
    });
    expect(terms(queue)).toEqual(["a"]);
  });

  it("needs a deck, takes no round, and caps how many are chosen", async () => {
    const me = await person("Kateryna");
    const { deck, ids } = await deckOf(me, ["a"]);
    const chosen = [ids.a] as string[];
    await expect(reviewQueue(me, { cardIds: chosen })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(
      reviewQueue(me, { deckId: deck.id, round: "new", cardIds: chosen }),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      reviewQueue(me, {
        deckId: deck.id,
        cardIds: Array.from({ length: CHOSEN_LIMIT + 1 }, (_, i) => `c${i}`),
      }),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});
