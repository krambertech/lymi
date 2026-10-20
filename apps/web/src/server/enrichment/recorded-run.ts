/**
 * The enrichment evaluation's fixtures, requests and scoring, shared by the live script in
 * evaluate.ts and the test that rescores the recorded runs in `runs/` on every CI run.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  CONFIGURED_LANGUAGES,
  configuredLanguage,
  type DeckPurpose,
  deckEnrichFields,
  deckPurpose,
  fieldsToFill,
} from "@lymi/core";
import { promptHash } from "../ai/prompt-hash";
import { languagePrompts } from "../languages";
import { type CaseExpectations, type CheckResult, checkCard, ruleKey, tally } from "./checks";
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

/** Whether each case keeps each rule, a case failing a rule when any of its checks under it fails. */
function caseOutcomes(
  scored: readonly { item: { id: string }; results: readonly CheckResult[] }[],
): Map<string, Map<string, boolean>> {
  const byRule = new Map<string, Map<string, boolean>>();
  for (const { item, results } of scored) {
    for (const result of results) {
      const key = ruleKey(result);
      const cases = byRule.get(key) ?? new Map<string, boolean>();
      cases.set(item.id, (cases.get(item.id) ?? true) && result.pass);
      byRule.set(key, cases);
    }
  }
  return byRule;
}

/** One bad call's worth of a rule's cases is the most noise a run can explain; the limits of comparing two runs this way are in krambertech/lymi#897. */
const SLACK_MAX = CARDS_PER_CALL;

/**
 * Rules that now fail more of the cases the previous run passed than one bad call could explain:
 * the rule's cases in its largest call, at most SLACK_MAX, net of cases that newly pass. The
 * model's noise lands a whole call at a time, with the odd stray case beside it.
 */
export function regressions(
  previous: readonly { item: { id: string }; results: readonly CheckResult[] }[],
  latest: readonly { item: { id: string }; results: readonly CheckResult[] }[],
  calls: readonly { cases: readonly string[] }[],
): string[] {
  const callOf = new Map(calls.flatMap((call, at) => call.cases.map((id) => [id, at] as const)));
  const before = caseOutcomes(previous);
  return [...caseOutcomes(latest)].flatMap(([rule, cases]) => {
    const was = before.get(rule);
    if (!was) return [];
    const perCall = new Map<number | undefined, number>();
    for (const id of cases.keys())
      perCall.set(callOf.get(id), (perCall.get(callOf.get(id)) ?? 0) + 1);
    const slack = Math.min(SLACK_MAX, Math.max(...perCall.values()));
    const lost = [...cases].flatMap(([id, pass]) => (!pass && was.get(id) ? [id] : []));
    const gained = [...cases].filter(([id, pass]) => pass && was.get(id) === false).length;
    return lost.length - gained > slack
      ? [`${rule}: newly fails ${lost.join(", ")}, beyond one call's ${slack}`]
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
  const tags = new Map(Object.entries(CONFIGURED_LANGUAGES).map(([tag, row]) => [row, tag]));
  const rates = new Map<string, { pass: number; total: number }>();
  for (const { deck, results } of scored) {
    const config = configuredLanguage(deck.language);
    const tag = config && tags.get(config);
    if (!tag) continue;
    const count = rates.get(tag) ?? { pass: 0, total: 0 };
    for (const result of results.filter((one) => expected(one.rule))) {
      count.total += 1;
      if (result.pass) count.pass += 1;
    }
    rates.set(tag, count);
  }
  return rates;
}

/**
 * Whether a language's new decks should enrich unasked: it meets the bar in the latest run and in
 * the run before, so one noisy run can close the gate but never open it.
 */
export function enrichesByDefault(
  latest: { pass: number; total: number } | undefined,
  previous: { pass: number; total: number } | undefined,
): boolean {
  const passes = (rate: { pass: number; total: number } | undefined) =>
    !!rate?.total && rate.pass / rate.total >= ENRICHMENT_BAR;
  return passes(latest) && passes(previous);
}
