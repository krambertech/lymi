/**
 * The enrichment evaluation's fixtures, requests and scoring, shared by the live script in
 * evaluate.ts and the test that rescores the recorded runs in `runs/` on every CI run.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  CONFIGURED_LANGUAGES,
  type DeckPurpose,
  deckEnrichFields,
  deckPurpose,
  fieldsToFill,
  languageFormat,
} from "@lymi/core";
import { promptHash } from "../ai/prompt-hash";
import { languagePrompts } from "../languages";
import { type CaseExpectations, type CheckResult, checkCard, tally } from "./checks";
import { GUIDED_LANGUAGES, languageGuide } from "./languages";
import {
  CARDS_PER_CALL,
  cardBrief,
  chunked,
  deckBrief,
  ENRICHMENT_INSTRUCTIONS,
  ENRICHMENT_PROMPT_VERSION,
  enrichmentInput,
  type Filled,
  REPLY_SCHEMA,
  type Sample,
} from "./prompt";

export type FixtureCase = {
  id: string;
  term: string;
  meaning?: string;
  example?: string;
  notes?: string;
  expect: CaseExpectations;
};

export type FixtureDeck = {
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
export type Call = { deck: string; input: string; cases: string[]; reply: Filled[] };

/** A live run as `--record` keeps it: every reply, with the prompt and the model that wrote them. */
export type RecordedRun = {
  version: number;
  hash: string;
  model: string;
  recordedAt: string;
  calls: Call[];
};

export const RUNS_DIR = new URL("./runs/", import.meta.url);

/** Everything the model reads besides the cards, so a run recorded against other text is stale. */
export function enrichmentPromptHash(): string {
  const guides = GUIDED_LANGUAGES.map(languageGuide);
  return promptHash({ ENRICHMENT_INSTRUCTIONS, REPLY_SCHEMA, guides });
}

export function newRun(model: string, calls: Call[]): RecordedRun {
  return {
    version: ENRICHMENT_PROMPT_VERSION,
    hash: enrichmentPromptHash(),
    model,
    recordedAt: new Date().toISOString(),
    calls,
  };
}

export function readFixtures(path: string | URL = new URL("./evaluation.json", import.meta.url)) {
  return (JSON.parse(readFileSync(path, "utf8")) as { decks: FixtureDeck[] }).decks;
}

/** The recorded runs, oldest first. */
export function recordedRuns(): { file: string; run: RecordedRun }[] {
  if (!existsSync(RUNS_DIR)) return [];
  return readdirSync(RUNS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      file,
      run: JSON.parse(readFileSync(new URL(file, RUNS_DIR), "utf8")) as RecordedRun,
    }))
    .sort((a, b) => a.run.recordedAt.localeCompare(b.run.recordedAt));
}

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
export function requests(deck: FixtureDeck): { input: string; cases: string[] }[] {
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

export type ScoredCase = {
  deck: FixtureDeck;
  item: FixtureCase;
  reply: Filled | undefined;
  results: CheckResult[];
};

/** Every case's checks against the replies a run holds. */
export function scoreCalls(decks: readonly FixtureDeck[], calls: readonly Call[]): ScoredCase[] {
  const replies = new Map(calls.flatMap((call) => call.reply.map((card) => [card.id, card])));
  return decks.flatMap((deck) =>
    deck.cases.map((item) => {
      const reply = replies.get(item.id);
      const results = checkCard(
        {
          term: item.term,
          mayFill: mayFillOf(deck, item),
          language: deckPurpose(deck.purpose, deck.language) === "language",
          rules: languagePrompts(deck.language)?.checks,
          expect: item.expect,
        },
        reply,
      );
      return { deck, item, reply, results };
    }),
  );
}

export function passRates(scored: readonly ScoredCase[]) {
  return tally(scored.flatMap((one) => one.results));
}

/** One case either way is the model's own noise between runs. */
const SLACK = 1;

/** Rules that pass on fewer cases than the previous run, scaled to this run's count, beyond the noise. */
export function regressions(
  previous: ReturnType<typeof passRates>,
  latest: ReturnType<typeof passRates>,
): string[] {
  return [...latest].flatMap(([rule, now]) => {
    const before = previous.get(rule);
    if (!before?.total) return [];
    const expected = (before.pass / before.total) * now.total;
    return now.pass < expected - SLACK
      ? [`${rule}: ${now.pass}/${now.total}, was ${before.pass}/${before.total}`]
      : [];
  });
}

/** The share of a configured language's expectations a run must meet before its decks enrich unasked. */
export const ENRICHMENT_BAR = 0.9;

/** The rules that check what a case expects of the AI, rather than the house style every card keeps. */
function expected(rule: string): boolean {
  return /^(answered|expected |includes |excludes )/.test(rule);
}

/** How often a run meets each configured language's expectations, by the row's own tag. */
export function languagePassRates(scored: readonly ScoredCase[]) {
  const rates = new Map<string, { pass: number; total: number }>();
  for (const { deck, results } of scored) {
    const tag = languageFormat(deck.language)?.tag;
    if (!tag || !Object.hasOwn(CONFIGURED_LANGUAGES, tag)) continue;
    const count = rates.get(tag) ?? { pass: 0, total: 0 };
    for (const result of results.filter((one) => expected(one.rule))) {
      count.total += 1;
      if (result.pass) count.pass += 1;
    }
    rates.set(tag, count);
  }
  return rates;
}
