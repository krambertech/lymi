import { createHash } from "node:crypto";
import { ENRICHED_FIELDS } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { checkCard } from "./checks";
import { GUIDED_LANGUAGES, languageGuide } from "./languages";
import {
  cardBrief,
  deckBrief,
  ENRICHMENT_INSTRUCTIONS,
  ENRICHMENT_PROMPT_VERSION,
  NOTES_READ_MAX,
  REPLY_SCHEMA,
  readReply,
} from "./prompt";

describe("the enrichment prompt", () => {
  it("changes only with a new prompt version", () => {
    const guides = GUIDED_LANGUAGES.map(languageGuide);
    const hash = createHash("sha256")
      .update(JSON.stringify({ ENRICHMENT_INSTRUCTIONS, REPLY_SCHEMA, guides }))
      .digest("hex")
      .slice(0, 16);
    // Raise ENRICHMENT_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ ENRICHMENT_PROMPT_VERSION, hash }).toEqual({
      ENRICHMENT_PROMPT_VERSION: 1,
      hash: "568259e29070de2a",
    });
  });

  it("keeps its own examples to its own rules", () => {
    const lines = ENRICHMENT_INSTRUCTIONS.split("\n");
    const examples = lines.flatMap((line, at) => {
      const term = lines[at - 1]?.match(/Card "([^"]+)"/)?.[1];
      return line.startsWith("{") && term ? [{ term, reply: JSON.parse(line) }] : [];
    });
    expect(examples).toHaveLength(5);
    for (const { term, reply } of examples) {
      expect(Object.keys(reply).sort()).toEqual([...ENRICHED_FIELDS].sort());
      const broken = checkCard(
        { term, mayFill: ENRICHED_FIELDS, language: term !== "mitochondrion", expect: {} },
        { id: term, ...reply },
      ).filter((result) => !result.pass);
      expect(broken).toEqual([]);
    }
  });
});

describe("languageGuide", () => {
  it("names each field a language has advice for, and nothing for a language without", () => {
    expect(languageGuide("et")).toMatch(/^notes: .*tulema · tulla · tulen.*\npronunciation: /s);
    expect(languageGuide("pt-BR")).toContain("pt-BR");
    expect(languageGuide("xx")).toBeUndefined();
    expect(languageGuide(null)).toBeUndefined();
  });
});

describe("deckBrief", () => {
  it("leaves blank text out and reads a deck without a language as not about one", () => {
    expect(
      deckBrief({
        id: "d1",
        name: "Cell biology",
        description: "  ",
        language: null,
        purpose: null,
        instructions: "",
        samples: [],
      }),
    ).toEqual({ id: "d1", name: "Cell biology", purpose: "other", samples: [] });
  });

  it("sends the purpose the owner chose over the one the language implies", () => {
    const brief = deckBrief({
      id: "d1",
      name: "Anatomie",
      description: null,
      language: "de",
      purpose: "subject",
      instructions: null,
      samples: [],
    });
    expect(brief.purpose).toBe("subject");
  });

  it("carries the language guide and the owner's instructions for a language deck", () => {
    const brief = deckBrief({
      id: "d1",
      name: "Eesti",
      description: null,
      language: "et",
      purpose: null,
      instructions: " Meanings in one word. ",
      samples: [],
    });
    expect(brief).toMatchObject({ purpose: "language", instructions: "Meanings in one word." });
    expect(brief.guide).toBe(languageGuide("et"));
  });
});

describe("cardBrief", () => {
  it("sends only the text a card has, and cuts long notes", () => {
    const brief = cardBrief(
      {
        id: "c1",
        deckId: "d1",
        term: "tulema",
        language: "et",
        meaning: "приходить",
        example: " ",
        notes: "x".repeat(NOTES_READ_MAX + 10),
      },
      ["example"],
    );
    expect(brief).toEqual({
      id: "c1",
      deck: "d1",
      term: "tulema",
      language: "et",
      meaning: "приходить",
      notes: "x".repeat(NOTES_READ_MAX),
      mayFill: ["example"],
    });
  });
});

describe("readReply", () => {
  it("keeps a usable reply and drops one of the wrong shape", () => {
    const card = {
      id: "c1",
      meaning: "to go",
      example: null,
      notes: null,
      pronunciation: null,
      language: "it",
    };
    expect(readReply({ cards: [card] })).toEqual([card]);
    expect(readReply({ cards: "nope" })).toEqual([]);
    expect(readReply(null)).toEqual([]);
  });
});
