import { describe, expect, it } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import { detectDeckLanguages } from "./import-languages";

function provider(
  reply: (request: TextRequest) => unknown,
): TextProvider & { asked: TextRequest[] } {
  const asked: TextRequest[] = [];
  return {
    provider: "openai",
    model: "test",
    asked,
    complete: async (request) => {
      asked.push(request);
      return reply(request);
    },
  };
}

const japanese = { key: "jp", name: "Core 2k", terms: ["食べる", "ありがとう", "窓"] };
const spanish = { key: "es", name: "From school", terms: ["la ventana", "tener", "el sol"] };

describe("detectDeckLanguages", () => {
  it("reads a script only one language uses without asking the model", async () => {
    const model = provider(() => ({ decks: [] }));
    expect(await detectDeckLanguages([japanese], model)).toEqual({ jp: "ja" });
    expect(model.asked).toHaveLength(0);
  });

  it("asks the model once about every deck the script can't place", async () => {
    const model = provider(() => ({
      decks: [
        { key: "es", language: "es" },
        { key: "other", language: "fr" },
      ],
    }));
    const decks = [japanese, spanish, { key: "maths", name: "Formulas", terms: ["x²"] }];
    expect(await detectDeckLanguages(decks, model)).toEqual({ jp: "ja", es: "es" });
    expect(model.asked).toHaveLength(1);
    expect(
      JSON.parse(model.asked[0]?.input ?? "{}").decks.map((d: { key: string }) => d.key),
    ).toEqual(["es", "maths"]);
  });

  it("drops an answer that isn't a language tag, and a deck the model has no answer for", async () => {
    const model = provider(() => ({ decks: [{ key: "es", language: "Spanish!" }] }));
    expect(await detectDeckLanguages([spanish], model)).toEqual({});
  });

  it("keeps what the script found when the model is missing or fails", async () => {
    expect(await detectDeckLanguages([japanese, spanish], null)).toEqual({ jp: "ja" });
    const failing = provider(() => {
      throw new Error("down");
    });
    expect(await detectDeckLanguages([japanese, spanish], failing)).toEqual({ jp: "ja" });
  });

  it("asks nothing about a deck with no terms", async () => {
    const model = provider(() => ({ decks: [] }));
    expect(await detectDeckLanguages([{ key: "empty", name: "Empty", terms: [] }], model)).toEqual(
      {},
    );
    expect(model.asked).toHaveLength(0);
  });
});
