import { hookable } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider } from "../ai";
import { promptHash } from "../ai/prompt-hash";
import type { Db } from "../db";
import { LANGUAGE_PROMPTS } from "../languages";
import { supportedNamesIn } from "../languages/test-helpers";
import { addCards, archiveCard, showCard, updateCard } from "./cards";
import { ServiceError } from "./context";
import { createDeck, updateDeck } from "./decks";
import {
  acceptDraft,
  givesAway,
  HOOK_INSTRUCTIONS,
  HOOK_PROMPT_VERSION,
  HOOK_REPLY_SCHEMA,
  type HookCard,
  hookDraftFor,
  hookInput,
} from "./hook-draft";
import { learner, testDb } from "./test-db";

const kurb: HookCard = {
  term: "kurb · kurva · kurba",
  meaning: "грустный",
  language: "et",
  asked: ["meaning_to_term"],
};

describe("the hook prompt", () => {
  it("changes only with a new prompt version", () => {
    const guides = Object.values(LANGUAGE_PROMPTS).map((prompts) => prompts.hook);
    const hash = promptHash({ HOOK_INSTRUCTIONS, HOOK_REPLY_SCHEMA, guides });
    // Raise HOOK_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ HOOK_PROMPT_VERSION, hash }).toEqual({
      HOOK_PROMPT_VERSION: 8,
      hash: "e487250e6420e405",
    });
  });

  it("leaves each supported language to its module", () => {
    // Russian and Ukrainian are named as languages a hook is written in, never ones being learned.
    expect(supportedNamesIn(HOOK_INSTRUCTIONS, ["Russian", "Ukrainian"])).toEqual([]);
  });

  it("sends a card without a guide when its language has no hook advice", () => {
    const input = JSON.parse(
      hookInput({ ...kurb, language: "ja", term: "食べる", meaning: "есть" }),
    );
    expect(input).not.toHaveProperty("guide");
  });
});

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

  it("catches an inflected meaning in each of the prompt's own hooks when the term is the cue", () => {
    const examples: [string, string][] = [
      ["КУРБан грустит", "грустный"],
      ["НОРКа слабая", "слабый"],
      ["МЭРИ у моря", "море"],
      ["Смотри, ВАТА летит!", "смотреть"],
      ["пАСТУх шагает за стадом", "шагать"],
      ["ТОМ принёс томатный сок", "приносить"],
    ];
    for (const [hook, meaning] of examples) {
      expect(givesAway(hook, { ...kurb, meaning, asked: ["term_to_meaning"] }), hook).toBe(true);
    }
  });

  it("matches a short meaning whole, so it does not catch longer words that start alike", () => {
    const sea: HookCard = { ...kurb, meaning: "sea", asked: ["term_to_meaning"] };
    expect(givesAway("MERRY at the sea", sea)).toBe(true);
    expect(givesAway("MERRY seasons", sea)).toBe(false);
  });

  it("guards picture modes as their text counterparts", () => {
    expect(givesAway("КУРБан грустит", { ...kurb, asked: ["image_to_meaning"] })).toBe(true);
    expect(givesAway("Kurb Kurban", { ...kurb, asked: ["image_to_term"] })).toBe(true);
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
    return { ctx, cardId: added.card.id, deckId: deck.id };
  }

  it("drafts afresh on every ask, and marks a hook saved as the latest draft as the AI's", async () => {
    const { ctx, cardId } = await card("hook-draft-1");
    expect(await hookDraftFor(ctx, cardId, provider("КУРБан плачет").provider)).toBe(
      "КУРБан плачет",
    );
    const first = provider("КУРБан грустит");
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

  it("shows the model other meanings from the deck, so it can tell the meaning's language", async () => {
    const { ctx, cardId, deckId } = await card("hook-draft-deck");
    const added = await addCards(ctx, [
      { deckId, term: "meri", meaning: "море" },
      { deckId, term: "nõrk", meaning: "слабый" },
    ]);
    const archived = added[1];
    if (archived?.status !== "added") throw new Error("not added");
    await archiveCard(ctx, archived.card.id);

    const drafted = provider("КУРБан грустит");
    await hookDraftFor(ctx, cardId, drafted.provider);
    const [request] = drafted.complete.mock.calls[0] as unknown as [{ input: string }];
    expect(JSON.parse(request.input).deckMeanings).toEqual(["море"]);
  });

  it("keeps the last draft when another ask comes back empty, so saving it is still the AI's", async () => {
    const { ctx, cardId } = await card("hook-draft-keep");
    expect(await hookDraftFor(ctx, cardId, provider("КУРБан грустит").provider)).toBe(
      "КУРБан грустит",
    );
    expect(await hookDraftFor(ctx, cardId, provider(null).provider)).toBeNull();
    await updateCard(ctx, cardId, { hook: "КУРБан грустит", hookSource: "manual" });
    expect((await showCard(ctx, cardId)).hookSource).toBe("ai");
  });

  it("asks twice before answering none, and drafts nothing without a vendor", async () => {
    const { ctx, cardId } = await card("hook-draft-2");
    expect(await hookDraftFor(ctx, cardId, null)).toBeNull();
    const none = provider(null);
    expect(await hookDraftFor(ctx, cardId, none.provider)).toBeNull();
    expect(none.complete).toHaveBeenCalledTimes(2);
  });

  it("guards the modes the deck asks in now", async () => {
    const { ctx, cardId, deckId } = await card("hook-draft-5");
    await updateDeck(ctx, deckId, { directions: "recognition" });
    expect(await hookDraftFor(ctx, cardId, provider("КУРБан грустит").provider)).toBeNull();
    expect(await hookDraftFor(ctx, cardId, provider("КУРБан опустил голову").provider)).toBe(
      "КУРБан опустил голову",
    );
  });

  it("says the AI is unavailable when the vendor fails, and keeps nothing", async () => {
    const { ctx, cardId } = await card("hook-draft-6");
    const complete = vi.fn(async () => {
      throw new Error("outage");
    });
    const failing = { provider: "openai", model: "test", complete } as TextProvider;
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(hookDraftFor(ctx, cardId, failing)).rejects.toMatchObject({ code: "unavailable" });
    quiet.mockRestore();
    const after = provider("КУРБан грустит");
    expect(await hookDraftFor(ctx, cardId, after.provider)).toBe("КУРБан грустит");
    expect(after.complete).toHaveBeenCalledOnce();
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
