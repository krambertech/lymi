import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider } from "../ai";
import type { Db } from "../db";
import { addCards, showCard, updateCard } from "./cards";
import { ServiceError } from "./context";
import { createDeck } from "./decks";
import { acceptDraft, givesAway, type HookCard, hookable, hookDraftFor } from "./hook-draft";
import { learner, testDb } from "./test-db";

const kurb: HookCard = {
  term: "kurb · kurva · kurba",
  meaning: "грустный",
  language: "et",
  asked: ["meaning_to_term"],
};

describe("givesAway", () => {
  it("allows the meaning and a sound-alike when the meaning is the cue, never the term", () => {
    expect(givesAway("КУРБан грустит", kurb)).toBe(false);
    expect(givesAway("Kurb Kurban grustit", kurb)).toBe(true);
  });

  it("never names the meaning, in any form, when the term is the cue", () => {
    const card: HookCard = { ...kurb, asked: ["term_to_meaning"] };
    expect(givesAway("КУРБан грустит", card)).toBe(true);
    expect(givesAway("КУРБан опустил голову", card)).toBe(false);
  });
});

describe("acceptDraft", () => {
  it("trims quotes and refuses a long or multi-line draft", () => {
    expect(acceptDraft("«КУРБан грустит»", kurb)).toBe("КУРБан грустит");
    expect(acceptDraft("one two three four five six seven", kurb)).toBeNull();
    expect(acceptDraft("КУРБан\nгрустит", kurb)).toBeNull();
    expect(acceptDraft(null, kurb)).toBeNull();
  });
});

describe("hookable", () => {
  it("fits a foreign word or short phrase, not a sentence or the learner's own language", () => {
    expect(hookable(kurb, "ru")).toBe(true);
    expect(hookable({ ...kurb, term: "Miks sa nutad täna õhtul?" }, "ru")).toBe(false);
    expect(hookable({ ...kurb, language: "en", meaning: "Canberra" }, "en-GB")).toBe(false);
    expect(hookable({ ...kurb, meaning: " " }, "ru")).toBe(false);
  });
});

describe("hookDraftFor", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  const provider = (hook: string | null) => {
    const complete = vi.fn(async () => ({ hook }));
    return { provider: { provider: "openai", model: "test", complete } as TextProvider, complete };
  };

  async function card(id: string) {
    const ctx = await learner(db, id, "Kateryna");
    const deck = await createDeck(ctx, {
      name: "Eesti",
      defaultLanguage: "et",
      directions: "production",
    });
    const [added] = await addCards(ctx, [
      { deckId: deck.id, term: kurb.term, meaning: kurb.meaning },
    ]);
    if (added?.status !== "added") throw new Error("not added");
    return { ctx, cardId: added.card.id };
  }

  it("drafts once, keeps the draft until the meaning changes, and marks a hook saved as drafted as the AI's", async () => {
    const { ctx, cardId } = await card("hook-draft-1");
    const first = provider("КУРБан грустит");
    expect(await hookDraftFor(ctx, cardId, first.provider)).toBe("КУРБан грустит");
    expect(await hookDraftFor(ctx, cardId, first.provider)).toBe("КУРБан грустит");
    expect(first.complete).toHaveBeenCalledOnce();

    await updateCard(ctx, cardId, { hook: "КУРБан грустит", hookSource: "manual" });
    expect((await showCard(ctx, cardId)).hookSource).toBe("ai");
    await updateCard(ctx, cardId, { hook: "КУРБан грустит у моря" });
    expect((await showCard(ctx, cardId)).hookSource).toBe("manual");

    await updateCard(ctx, cardId, { meaning: "печальный" });
    const second = provider("КУРБан печалится");
    expect(await hookDraftFor(ctx, cardId, second.provider)).toBe("КУРБан печалится");
    expect(second.complete).toHaveBeenCalledOnce();
  });

  it("remembers that the AI had none, and drafts nothing without a vendor", async () => {
    const { ctx, cardId } = await card("hook-draft-2");
    expect(await hookDraftFor(ctx, cardId, null)).toBeNull();
    const none = provider(null);
    expect(await hookDraftFor(ctx, cardId, none.provider)).toBeNull();
    expect(await hookDraftFor(ctx, cardId, none.provider)).toBeNull();
    // Asked twice the first time, then never again until the card's text changes.
    expect(none.complete).toHaveBeenCalledTimes(2);
  });

  it("refuses a draft that writes the term the card asks for", async () => {
    const { ctx, cardId } = await card("hook-draft-3");
    expect(await hookDraftFor(ctx, cardId, provider("kurb is sad").provider)).toBeNull();
  });

  it("is the owner's alone", async () => {
    const { cardId } = await card("hook-draft-4");
    const stranger = await learner(db, "hook-draft-stranger", "Someone");
    await expect(hookDraftFor(stranger, cardId, provider("x").provider)).rejects.toBeInstanceOf(
      ServiceError,
    );
  });
});
