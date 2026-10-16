import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { join } from "./members";
import { gradeCard, reviewQueue } from "./review";
import { createSection } from "./sections";
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
const filter = (f: Partial<{ tags: string[]; states: ("new" | "learning" | "known")[] }>) => ({
  states: [],
  due: null,
  sections: [],
  tags: [],
  q: "",
  ...f,
});

async function grade(ctx: ServiceContext, cardId: string, rating: 1 | 2 | 3 | 4, daysAgo = 0) {
  await gradeCard(ctx, {
    cardId,
    direction: "recognition",
    rating,
    reviewedAt: new Date(Date.now() - daysAgo * DAY),
    timezone: "UTC",
  });
}

/** A deck of the given terms and tags, with each card's id by term. */
async function deckOf(ctx: ServiceContext, cards: { term: string; tags?: string[] }[]) {
  const deck = await createDeck(ctx, { name: `Deck ${n}`, defaultLanguage: "it" });
  const outcomes = await addCards(
    ctx,
    cards.map((card) => ({ deckId: deck.id, ...card })),
  );
  const ids: Record<string, string> = {};
  for (const o of outcomes) if (o.status === "added") ids[o.card.term] = o.card.id;
  return { deck, ids };
}

const terms = (queue: { items: { card: { term: string } }[] }) =>
  queue.items.map((i) => i.card.term);

describe("reviewing what a filter shows", () => {
  it("takes the started cards the filter shows, due ones first, whether or not they are due", async () => {
    const me = await person("Kateryna");
    const { deck, ids } = await deckOf(me, [
      { term: "la bolletta", tags: ["casa"] },
      { term: "il cassetto", tags: ["Casa"] },
      { term: "il treno", tags: ["viaggi"] },
      { term: "la ruggine", tags: ["casa"] },
    ]);
    // Easy yesterday puts the drawer ahead; Forgot three days ago leaves the bill due now.
    await grade(me, ids["il cassetto"] as string, 4, 1);
    await grade(me, ids["la bolletta"] as string, 1, 3);
    await grade(me, ids["il treno"] as string, 1, 1);

    const queue = await reviewQueue(me, { deckId: deck.id, filter: filter({ tags: ["casa"] }) });
    expect(terms(queue)).toEqual(["la bolletta", "il cassetto"]);
    expect(queue.total).toBe(2);
    const day = await reviewQueue(me, { deckId: deck.id });
    expect(terms(day)).not.toContain("il cassetto");
  });

  it("leaves out a card already reviewed today", async () => {
    const me = await person("Kateryna");
    const { deck, ids } = await deckOf(me, [
      { term: "a", tags: ["x"] },
      { term: "b", tags: ["x"] },
    ]);
    await grade(me, ids.a as string, 3, 3);
    await grade(me, ids.b as string, 3, 3);
    await grade(me, ids.a as string, 3);

    const queue = await reviewQueue(me, { deckId: deck.id, filter: filter({ tags: ["x"] }) });
    expect(terms(queue)).toEqual(["b"]);
  });

  it("reads the search and the sections as the deck page does", async () => {
    const me = await person("Kateryna");
    const { deck, ids } = await deckOf(me, [
      { term: "la bolletta" },
      { term: "il biglietto" },
      { term: "il cassetto" },
    ]);
    for (const id of Object.values(ids)) await grade(me, id, 3, 2);
    const lesson = await createSection(me, deck.id, {
      name: "One",
      cardIds: [ids["il biglietto"] as string],
    });

    const searched = await reviewQueue(me, {
      deckId: deck.id,
      filter: { ...filter({}), q: "BOLL" },
    });
    expect(terms(searched)).toEqual(["la bolletta"]);
    const inLesson = await reviewQueue(me, {
      deckId: deck.id,
      filter: { ...filter({}), sections: [lesson.id] },
    });
    expect(terms(inLesson)).toEqual(["il biglietto"]);
    const loose = await reviewQueue(me, {
      deckId: deck.id,
      filter: { ...filter({}), sections: [""] },
    });
    expect(terms(loose).sort()).toEqual(["il cassetto", "la bolletta"]);
  });

  it("lets a member review by the owner's tags, from their own schedule", async () => {
    const me = await person("Kateryna");
    const member = await person("Mari");
    const stranger = await person("Juhan");
    const { deck, ids } = await deckOf(me, [
      { term: "a", tags: ["casa"] },
      { term: "b", tags: ["casa"] },
    ]);
    await join(member, deck.id);
    await grade(me, ids.a as string, 3, 2);
    await grade(member, ids.b as string, 3, 2);

    const mine = await reviewQueue(member, { deckId: deck.id, filter: filter({ tags: ["casa"] }) });
    expect(terms(mine)).toEqual(["b"]);
    await expect(
      reviewQueue(stranger, { deckId: deck.id, filter: filter({ tags: ["casa"] }) }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("needs a deck and takes no round or section", async () => {
    const me = await person("Kateryna");
    const { deck } = await deckOf(me, [{ term: "a" }]);
    await expect(reviewQueue(me, { filter: filter({}) })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(
      reviewQueue(me, { deckId: deck.id, round: "new", filter: filter({}) }),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});
