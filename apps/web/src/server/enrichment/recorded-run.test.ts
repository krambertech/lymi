import { CONFIGURED_LANGUAGES } from "@lymi/core";
import { describe, expect, it } from "vitest";
import {
  ENRICHMENT_BAR,
  enrichmentPromptHash,
  languagePassRates,
  passRates,
  readFixtures,
  recordedRuns,
  regressions,
  requests,
  scoreCalls,
} from "./recorded-run";

const RECORD = "Record a live run: pnpm --filter @lymi/web eval:enrichment --record";

const decks = readFixtures();
const runs = recordedRuns();
const latest = runs.at(-1);
const previous = runs.at(-2);

describe("the recorded enrichment run", () => {
  it("was recorded with the prompt the model reads now", () => {
    expect(latest, RECORD).toBeDefined();
    expect(latest?.run.hash, RECORD).toBe(enrichmentPromptHash());
  });

  it("was recorded from the requests evaluation.json makes now", () => {
    const now = decks.flatMap((deck) => requests(deck).map((request) => request.input));
    expect(
      latest?.run.calls.map((call) => call.input),
      RECORD,
    ).toEqual(now);
  });

  it("passes each rule about as often as the run before it, on the cases both ran", () => {
    if (!latest || !previous) return;
    const shared = new Set(previous.run.calls.flatMap((call) => call.cases));
    const rates = (calls: typeof latest.run.calls) =>
      passRates(scoreCalls(decks, calls).filter((one) => shared.has(one.item.id)));
    expect(regressions(rates(previous.run.calls), rates(latest.run.calls))).toEqual([]);
  });
});

describe("the enrichment gate", () => {
  const rates = latest ? languagePassRates(scoreCalls(decks, latest.run.calls)) : new Map();

  it.each(Object.entries(CONFIGURED_LANGUAGES))(
    "enriches %s decks unasked only while its fixture passes the bar",
    (tag, row) => {
      const rate = rates.get(tag);
      expect(rate?.total ?? 0, `Add a fixture deck for ${tag} to evaluation.json`).toBeGreaterThan(
        20,
      );
      const passes = (rate?.pass ?? 0) / (rate?.total ?? 1) >= ENRICHMENT_BAR;
      expect(
        row.enrichByDefault,
        `${tag} meets ${rate?.pass}/${rate?.total} of its expectations; set enrichByDefault to ${passes} in packages/core/src/languages/configured.ts`,
      ).toBe(passes);
    },
  );
});

describe("regressions", () => {
  const rates = (entries: [string, number, number][]) =>
    new Map(entries.map(([rule, pass, total]) => [rule, { pass, total }]));

  it("allows one case of noise, scaled to the run's size, and ignores a new rule", () => {
    expect(
      regressions(
        rates([
          ["meaning: short gloss", 10, 10],
          ["example: readings over kanji", 4, 4],
        ]),
        rates([
          ["meaning: short gloss", 9, 10],
          ["example: readings over kanji", 2, 4],
          ["notes: no table", 0, 3],
        ]),
      ),
    ).toEqual(["example: readings over kanji: 2/4, was 4/4"]);
  });
});
