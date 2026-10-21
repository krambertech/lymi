import { ENRICHED_FIELDS, LANGUAGE_FORMATS, pronunciationGuide } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { LANGUAGE_PROMPTS } from "../languages";
import { supportedNamesIn } from "../languages/test-helpers";
import { checkCard } from "./checks";
import { languageGuide } from "./languages";
import {
  cardBrief,
  deckBrief,
  ENRICHMENT_INSTRUCTIONS,
  ENRICHMENT_PROMPT_VERSION,
  NOTES_READ_MAX,
  readReply,
} from "./prompt";
import { enrichmentPromptHash } from "./recorded-run";

/** The worked examples in a block of prompt text: each card line and the reply under it. */
function workedExamples(text: string) {
  const lines = text.split("\n");
  return lines.flatMap((line, at) => {
    const term = lines[at - 1]?.match(/Card "([^"]+)"/)?.[1];
    return line.startsWith("{") && term ? [{ term, reply: JSON.parse(line) }] : [];
  });
}

describe("the enrichment prompt", () => {
  it("changes only with a new prompt version", () => {
    // Raise ENRICHMENT_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ ENRICHMENT_PROMPT_VERSION, hash: enrichmentPromptHash() }).toEqual({
      ENRICHMENT_PROMPT_VERSION: 14,
      hash: "5269a5e46bd52d19",
    });
  });

  it("keeps its own examples to its own rules", () => {
    const examples = workedExamples(ENRICHMENT_INSTRUCTIONS);
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

  it("leaves each supported language to its module", () => {
    expect(supportedNamesIn(ENRICHMENT_INSTRUCTIONS)).toEqual([]);
  });
});

describe("a supported language's worked example", () => {
  it.each(Object.values(LANGUAGE_PROMPTS))("keeps to its own rules in $tag", (prompts) => {
    const examples = workedExamples(prompts.enrich.example);
    expect(examples).toHaveLength(1);
    for (const { term, reply } of examples) {
      expect(Object.keys(reply).sort()).toEqual([...ENRICHED_FIELDS].sort());
      const broken = checkCard(
        {
          term,
          tag: prompts.tag,
          mayFill: ENRICHED_FIELDS,
          language: true,
          rules: prompts.checks,
          expect: {},
        },
        { id: term, ...reply },
      ).filter((result) => !result.pass);
      expect(broken).toEqual([]);
    }
    expect(languageGuide(prompts.tag)).toMatch(/\nworked example: .+ deck, /);
  });
});

describe("languageGuide", () => {
  it("names each field a language has advice for, and nothing for a language without", () => {
    expect(languageGuide("et")).toMatch(/^notes: .*tulema · tulla · tulen.*\npronunciation: /s);
    expect(languageGuide("pt-BR")).toContain("said in Brazil");
    expect(languageGuide("pt")).toContain("pronunciation: IPA as the word is said in Portugal");
    expect(languageGuide("xx")).toBeUndefined();
    expect(languageGuide(null)).toBeUndefined();
  });

  // Russian's general guide keeps its own line until its prompt module and recorded run replace it.
  it.each(LANGUAGE_FORMATS.filter((format) => format.tag !== "ru"))(
    "takes $tag's pronunciation and example lines from its format",
    (format) => {
      const guide = languageGuide(format.tag) ?? "";
      expect(guide).toContain(`\npronunciation: ${pronunciationGuide(format.tag)} For example: `);
      expect(guide).toContain(format.pronunciation.sample.pronunciation);
      if (format.example) expect(guide).toMatch(/^example: /);
      expect(guide.includes(format.example?.sample ?? "\0")).toBe(format.example !== null);
    },
  );

  it("keeps Russian's accent line, so the model reads what the last recorded run read", () => {
    expect(languageGuide("ru")).toContain(
      "pronunciation: The term in Cyrillic with an accent mark on the stressed vowel (молоко́)",
    );
  });

  it("asks Korean for pronounced Hangul and Sino-Korean roots, never romanization", () => {
    const guide = languageGuide("ko-KR") ?? "";
    expect(guide).toContain("학교 → 학꾜");
    expect(guide).toContain("學 학");
    expect(guide).not.toMatch(/Revised Romanization|hakgyo/);
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
