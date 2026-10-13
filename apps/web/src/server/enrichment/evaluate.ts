/**
 * Runs the enrichment prompt over labelled cards and prints how often each house rule and each
 * expectation holds. It calls OpenAI, so it is a script and never a test:
 *
 *   pnpm --filter @lymi/web eval:enrichment [--cards file.json] [--deck id] [--save run.json] [--from run.json] [--dry] [--verbose]
 *
 * The key comes from `.dev.vars` and the model from the text-provider helper the Worker uses, so
 * OPENAI_TEXT_MODEL overrides it. `--save` keeps every reply so `--from` can rescore without
 * another call. `--dry` prints the first request and calls nothing. Keep real learners' cards in a
 * file outside the repository and pass it with `--cards`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { type DeckPurpose, deckEnrichFields, deckPurpose, fieldsToFill } from "@lymi/core";
import { createTextProvider, type TextProvider } from "../ai";
import { CARDS_PER_CALL, chunked } from "../services/enrichment";
import { type CaseExpectations, type CheckResult, checkCard, tally } from "./checks";
import {
  cardBrief,
  deckBrief,
  ENRICHMENT_INSTRUCTIONS,
  ENRICHMENT_PROMPT_VERSION,
  enrichmentInput,
  type Filled,
  REPLY_SCHEMA,
  readReply,
  type Sample,
} from "./prompt";

type FixtureCase = {
  id: string;
  term: string;
  meaning?: string;
  example?: string;
  notes?: string;
  expect: CaseExpectations;
};

type FixtureDeck = {
  id: string;
  name: string;
  description?: string;
  language: string | null;
  purpose?: DeckPurpose;
  meaningLanguage: string;
  fields?: string[];
  instructions?: string;
  samples: Sample[];
  cases: FixtureCase[];
};

/** One model call: its deck, the cases it carried and what came back. */
type Call = { deck: string; input: string; cases: string[]; reply: Filled[] };

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const verbose = args.includes("--verbose");

/** A case as the service would store it: in the deck's language, with only the text it was given. */
function stored(deck: FixtureDeck, item: FixtureCase) {
  return {
    id: item.id,
    deckId: deck.id,
    term: item.term,
    language: deck.language,
    meaning: item.meaning ?? null,
    example: item.example ?? null,
    notes: item.notes ?? null,
    pronunciation: null,
  };
}

function mayFillOf(deck: FixtureDeck, item: FixtureCase) {
  return fieldsToFill(
    stored(deck, item),
    deckEnrichFields(deck.fields ?? null, deck.language, deck.purpose),
  );
}

/** The requests the service would make for a deck: one per wave of cards, all with the same deck. */
function requests(deck: FixtureDeck): { input: string; cases: string[] }[] {
  const brief = deckBrief({
    id: deck.id,
    name: deck.name,
    description: deck.description ?? null,
    language: deck.language,
    purpose: deck.purpose ?? null,
    instructions: deck.instructions ?? null,
    samples: deck.samples,
  });
  return chunked(deck.cases, CARDS_PER_CALL).map((wave) => ({
    input: enrichmentInput(
      deck.meaningLanguage,
      [brief],
      wave.map((item) => cardBrief(stored(deck, item), mayFillOf(deck, item))),
    ),
    cases: wave.map((item) => item.id),
  }));
}

async function run(decks: FixtureDeck[], provider: TextProvider): Promise<Call[]> {
  const jobs = decks.flatMap((deck) => requests(deck).map((request) => ({ deck, ...request })));
  const calls: Call[] = [];
  // A few at a time, so a long run is quick without tripping the vendor's rate limit.
  for (const batch of chunked(jobs, 4)) {
    calls.push(
      ...(await Promise.all(
        batch.map(async ({ deck, input, cases }) => {
          const reply = readReply(
            await provider.complete({
              instructions: ENRICHMENT_INSTRUCTIONS,
              input,
              schema: REPLY_SCHEMA,
            }),
          );
          process.stdout.write(".");
          return { deck: deck.id, input, cases, reply };
        }),
      )),
    );
  }
  process.stdout.write("\n");
  return calls;
}

function score(decks: FixtureDeck[], calls: Call[]) {
  const replies = new Map(calls.flatMap((call) => call.reply.map((card) => [card.id, card])));
  const all: CheckResult[] = [];
  const failures: string[] = [];
  for (const deck of decks) {
    for (const item of deck.cases) {
      const reply = replies.get(item.id);
      const results = checkCard(
        {
          term: item.term,
          mayFill: mayFillOf(deck, item),
          language: deckPurpose(deck.purpose, deck.language) === "language",
          expect: item.expect,
        },
        reply,
      );
      all.push(...results);
      const broken = results.filter((result) => !result.pass);
      if (broken.length || verbose) {
        failures.push(`\n${deck.id} · ${item.term}`);
        if (reply) {
          for (const field of [
            "meaning",
            "example",
            "notes",
            "pronunciation",
            "language",
          ] as const) {
            if (reply[field]) failures.push(`  ${field}: ${reply[field]?.replaceAll("\n", "⏎ ")}`);
          }
        }
        for (const result of broken) failures.push(`  ✗ ${result.field}: ${result.rule}`);
      }
    }
  }
  const passed = all.filter((result) => result.pass).length;
  console.log(`\nPrompt v${ENRICHMENT_PROMPT_VERSION}: ${passed}/${all.length} checks pass`);
  for (const [rule, count] of [...tally(all)].sort(([a], [b]) => a.localeCompare(b))) {
    const mark = count.pass === count.total ? " " : "✗";
    console.log(`${mark} ${rule.padEnd(40)} ${count.pass}/${count.total}`);
  }
  console.log(failures.join("\n"));
}

async function main() {
  const path = option("--cards") ?? new URL("./evaluation.json", import.meta.url);
  const only = option("--deck");
  const decks = (JSON.parse(readFileSync(path, "utf8")) as { decks: FixtureDeck[] }).decks.filter(
    (deck) => !only || deck.id === only,
  );

  if (args.includes("--dry")) {
    const [deck] = decks;
    const [first] = deck ? requests(deck) : [];
    console.log(ENRICHMENT_INSTRUCTIONS);
    console.log(`\n--- input ---\n${JSON.stringify(JSON.parse(first?.input ?? "{}"), null, 2)}`);
    return;
  }

  const from = option("--from");
  let calls: Call[];
  if (from) {
    calls = JSON.parse(readFileSync(from, "utf8")) as Call[];
  } else {
    const { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_TEXT_MODEL, AI_GATEWAY_TOKEN } = process.env;
    const provider = createTextProvider({
      OPENAI_API_KEY,
      OPENAI_BASE_URL,
      OPENAI_TEXT_MODEL,
      AI_GATEWAY_TOKEN,
    });
    if (!provider) throw new Error("Set OPENAI_API_KEY to run the evaluation");
    console.log(`Model: ${provider.model}`);
    calls = await run(decks, provider);
  }
  const save = option("--save");
  if (save) writeFileSync(save, `${JSON.stringify(calls, null, 2)}\n`);
  score(decks, calls);
}

await main();
