/**
 * Runs the deck style prompt over invented decks and prints each note with whether its
 * expectations hold. It calls OpenAI, so it is a script and never a test:
 *
 *   pnpm --filter @lymi/web eval:style [--deck id] [--runs n] [--dry]
 *
 * `--runs` asks each deck more than once, to see whether the note holds steady.
 */
import { readFileSync } from "node:fs";
import { type DeckEnrichField, type DeckPurpose, deckEnrichFields } from "@lymi/core";
import { createTextProvider } from "../ai";
import { languageGuide } from "./languages";
import {
  readStyle,
  STYLE_INSTRUCTIONS,
  STYLE_PROMPT_VERSION,
  STYLE_REPLY_SCHEMA,
  styleInput,
} from "./style";

type FixtureDeck = {
  id: string;
  meaningLanguage: string;
  deck: { name: string; language?: string; purpose: DeckPurpose; instructions?: string };
  /** Day added, term, meaning, example. */
  cards: [string, string, string, string][];
  /** Term, field, the AI's text, the learner's, newest first. */
  corrections?: [string, DeckEnrichField, string, string][];
  expect: {
    /** Each group needs one of its words in the note. */
    mentions?: string[][];
    /** None of these may appear. */
    avoids?: string[];
    maxChars?: number;
  };
};

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};

function inputOf(fixture: FixtureDeck): string {
  const guide = languageGuide(fixture.deck.language);
  return styleInput({
    meaningLanguage: fixture.meaningLanguage,
    deck: {
      ...fixture.deck,
      fields: deckEnrichFields(null, fixture.deck.language, fixture.deck.purpose),
      ...(guide ? { guide } : {}),
    },
    previous: null,
    cards: fixture.cards.map(([day, term, meaning, example]) => ({
      day,
      term,
      meaning,
      example,
      notes: "",
      pronunciation: "",
    })),
    corrections: (fixture.corrections ?? []).map(([term, field, ai, learner]) => ({
      term,
      field,
      ai,
      learner,
    })),
  });
}

async function main() {
  const only = option("--deck");
  const runs = Number(option("--runs") ?? 1);
  const fixtures = (
    JSON.parse(readFileSync(new URL("./style-evaluation.json", import.meta.url), "utf8")) as {
      decks: FixtureDeck[];
    }
  ).decks.filter((deck) => !only || deck.id === only);

  if (args.includes("--dry")) {
    console.log(STYLE_INSTRUCTIONS);
    const [first] = fixtures;
    if (first)
      console.log(`\n--- input ---\n${JSON.stringify(JSON.parse(inputOf(first)), null, 2)}`);
    return;
  }

  const { OPENAI_API_KEY, OPENAI_TEXT_MODEL, AI_GATEWAY_URL, AI_GATEWAY_TOKEN } = process.env;
  const provider = createTextProvider({
    OPENAI_API_KEY,
    OPENAI_TEXT_MODEL,
    AI_GATEWAY_URL,
    AI_GATEWAY_TOKEN,
  });
  if (!provider) throw new Error("Set OPENAI_API_KEY to run the evaluation");
  console.log(`Style prompt v${STYLE_PROMPT_VERSION} · model ${provider.model}`);

  let passed = 0;
  let total = 0;
  for (const fixture of fixtures) {
    const input = inputOf(fixture);
    for (let run = 1; run <= runs; run++) {
      const style = readStyle(
        await provider.complete({
          instructions: STYLE_INSTRUCTIONS,
          input,
          schema: STYLE_REPLY_SCHEMA,
        }),
      );
      const text = (style ?? "").toLowerCase();
      const { mentions = [], avoids = [], maxChars } = fixture.expect;
      const checks: [string, boolean][] = [
        ...mentions.map((words): [string, boolean] => [
          `mentions ${words.join(" or ")}`,
          words.some((word) => text.includes(word.toLowerCase())),
        ]),
        ...avoids.map((word): [string, boolean] => [`avoids ${word}`, !text.includes(word)]),
        ...(maxChars === undefined
          ? []
          : [[`at most ${maxChars} characters`, text.length <= maxChars] as [string, boolean]]),
      ];
      console.log(`\n${fixture.id}${runs > 1 ? ` · run ${run}` : ""}`);
      console.log(`  ${style ?? "(none)"}`);
      for (const [name, pass] of checks) console.log(`  ${pass ? "✓" : "✗"} ${name}`);
      passed += checks.filter(([, pass]) => pass).length;
      total += checks.length;
    }
  }
  console.log(`\n${passed}/${total} checks pass`);
}

await main();
