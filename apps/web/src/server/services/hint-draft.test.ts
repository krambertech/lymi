import { hintable } from "@lymi/core";
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
  HINT_INSTRUCTIONS,
  HINT_PROMPT_VERSION,
  HINT_REPLY_SCHEMA,
  type HintCard,
  hintDraftFor,
  hintInput,
} from "./hint-draft";
import { learner, testDb } from "./test-db";

const kurb: HintCard = {
  term: "kurb · kurva · kurba",
  meaning: "грустный",
  language: "et",
  asked: ["meaning_to_term"],
};

describe("the hint prompt", () => {
  it("changes only with a new prompt version", () => {
    const guides = Object.values(LANGUAGE_PROMPTS).map((prompts) => prompts.hint);
    const hash = promptHash({ HINT_INSTRUCTIONS, HINT_REPLY_SCHEMA, guides });
    // Raise HINT_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ HINT_PROMPT_VERSION, hash }).toEqual({
      HINT_PROMPT_VERSION: 7,
      hash: "9e66944b8d32918d",
    });
  });

  it("leaves each supported language to its module", () => {
    // Russian and Ukrainian are named as languages a hint is written in, never ones being learned.
    expect(supportedNamesIn(HINT_INSTRUCTIONS, ["Russian", "Ukrainian"])).toEqual([]);
  });

  it("sends a card without a guide when its language has no hint advice", () => {
    const input = JSON.parse(
      hintInput({ ...kurb, language: "ja", term: "食べる", meaning: "есть" }),
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
    const card: HintCard = { ...kurb, asked: ["term_to_meaning"] };
    expect(givesAway("КУРБан грустит", card)).toBe(true);
    expect(givesAway("КУРБан опустил голову", card)).toBe(false);
  });

  it("catches an inflected meaning in each of the prompt's own hints when the term is the cue", () => {
    const examples: [string, string][] = [
      ["КУРБан грустит", "грустный"],
      ["НОРКа слабая", "слабый"],
      ["МЭРИ у моря", "море"],
      ["Смотри, ВАТА летит!", "смотреть"],
      ["пАСТУх шагает за стадом", "шагать"],
      ["ТОМ принёс томатный сок", "приносить"],
    ];
    for (const [hint, meaning] of examples) {
      expect(givesAway(hint, { ...kurb, meaning, asked: ["term_to_meaning"] }), hint).toBe(true);
    }
  });

  it("matches a short meaning whole, so it does not catch longer words that start alike", () => {
    const sea: HintCard = { ...kurb, meaning: "sea", asked: ["term_to_meaning"] };
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

describe("hintable", () => {
  it("fits a foreign word or short phrase, not a sentence or the learner's own language", () => {
    expect(hintable(kurb, "ru")).toBe(true);
    expect(hintable({ ...kurb, term: "Miks sa nutad täna õhtul?" }, "ru")).toBe(false);
    expect(hintable({ ...kurb, language: "en", meaning: "Canberra" }, "en-GB")).toBe(false);
    expect(hintable({ ...kurb, meaning: " " }, "ru")).toBe(false);
  });
});

describe("hintDraftFor", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  const provider = (hint: string | null) => {
    const complete = vi.fn(async () => ({ hook: hint }));
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

  it("drafts afresh on every ask, and marks a hint saved as the latest draft as the AI's", async () => {
    const { ctx, cardId } = await card("hint-draft-1");
    expect(await hintDraftFor(ctx, cardId, provider("КУРБан плачет").provider)).toBe(
      "КУРБан плачет",
    );
    const first = provider("КУРБан грустит");
    expect(await hintDraftFor(ctx, cardId, first.provider)).toBe("КУРБан грустит");
    expect(first.complete).toHaveBeenCalledOnce();

    await updateCard(ctx, cardId, { hint: "КУРБан грустит", hintSource: "manual" });
    expect((await showCard(ctx, cardId)).hintSource).toBe("ai");
    await updateCard(ctx, cardId, { hint: "КУРБан грустит у моря" });
    expect((await showCard(ctx, cardId)).hintSource).toBe("manual");

    await updateCard(ctx, cardId, { meaning: "печальный" });
    const second = provider("КУРБан печалится");
    expect(await hintDraftFor(ctx, cardId, second.provider)).toBe("КУРБан печалится");
    expect(second.complete).toHaveBeenCalledOnce();
  });

  it("shows the model other meanings from the deck, so it can tell the meaning's language", async () => {
    const { ctx, cardId, deckId } = await card("hint-draft-deck");
    const added = await addCards(ctx, [
      { deckId, term: "meri", meaning: "море" },
      { deckId, term: "nõrk", meaning: "слабый" },
    ]);
    const archived = added[1];
    if (archived?.status !== "added") throw new Error("not added");
    await archiveCard(ctx, archived.card.id);

    const drafted = provider("КУРБан грустит");
    await hintDraftFor(ctx, cardId, drafted.provider);
    const [request] = drafted.complete.mock.calls[0] as unknown as [{ input: string }];
    expect(JSON.parse(request.input).deckMeanings).toEqual(["море"]);
  });

  it("keeps the last draft when another ask comes back empty, so saving it is still the AI's", async () => {
    const { ctx, cardId } = await card("hint-draft-keep");
    expect(await hintDraftFor(ctx, cardId, provider("КУРБан грустит").provider)).toBe(
      "КУРБан грустит",
    );
    expect(await hintDraftFor(ctx, cardId, provider(null).provider)).toBeNull();
    await updateCard(ctx, cardId, { hint: "КУРБан грустит", hintSource: "manual" });
    expect((await showCard(ctx, cardId)).hintSource).toBe("ai");
  });

  it("asks twice before answering none, and drafts nothing without a vendor", async () => {
    const { ctx, cardId } = await card("hint-draft-2");
    expect(await hintDraftFor(ctx, cardId, null)).toBeNull();
    const none = provider(null);
    expect(await hintDraftFor(ctx, cardId, none.provider)).toBeNull();
    expect(none.complete).toHaveBeenCalledTimes(2);
  });

  it("guards the modes the deck asks in now", async () => {
    const { ctx, cardId, deckId } = await card("hint-draft-5");
    await updateDeck(ctx, deckId, { directions: "recognition" });
    expect(await hintDraftFor(ctx, cardId, provider("КУРБан грустит").provider)).toBeNull();
    expect(await hintDraftFor(ctx, cardId, provider("КУРБан опустил голову").provider)).toBe(
      "КУРБан опустил голову",
    );
  });

  it("says the AI is unavailable when the vendor fails, and keeps nothing", async () => {
    const { ctx, cardId } = await card("hint-draft-6");
    const complete = vi.fn(async () => {
      throw new Error("outage");
    });
    const failing = { provider: "openai", model: "test", complete } as TextProvider;
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(hintDraftFor(ctx, cardId, failing)).rejects.toMatchObject({ code: "unavailable" });
    quiet.mockRestore();
    const after = provider("КУРБан грустит");
    expect(await hintDraftFor(ctx, cardId, after.provider)).toBe("КУРБан грустит");
    expect(after.complete).toHaveBeenCalledOnce();
  });

  it("refuses a draft that writes the term the card asks for", async () => {
    const { ctx, cardId } = await card("hint-draft-3");
    expect(await hintDraftFor(ctx, cardId, provider("kurb is sad").provider)).toBeNull();
  });

  it("is the owner's alone", async () => {
    const { cardId } = await card("hint-draft-4");
    const stranger = await learner(db, "hint-draft-stranger", "Someone");
    await expect(hintDraftFor(stranger, cardId, provider("x").provider)).rejects.toBeInstanceOf(
      ServiceError,
    );
  });
});
