import { CONFIGURED_LANGUAGES } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { CARDS_PER_CALL } from "./prompt";
import {
  enrichesByDefault,
  enrichmentPromptHash,
  languagePassRates,
  passRates,
  type RecordedRun,
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
    // Two runs of one prompt differ only by the model's noise, which the gate absorbs.
    if (!latest || !previous || previous.run.hash === latest.run.hash) return;
    const shared = new Set(previous.run.calls.flatMap((call) => call.cases));
    const rates = (calls: typeof latest.run.calls) =>
      passRates(scoreCalls(decks, calls).filter((one) => shared.has(one.item.id)));
    expect(regressions(rates(previous.run.calls), rates(latest.run.calls))).toEqual([]);
  });
});

describe("the enrichment gate", () => {
  // Only the cases a run was asked, so a run from before a language's fixture has no rate for it.
  const rates = (run: RecordedRun | undefined) => {
    const asked = new Set(run?.calls.flatMap((call) => call.cases));
    return languagePassRates(
      scoreCalls(decks, run?.calls ?? []).filter((one) => asked.has(one.item.id)),
    );
  };
  const now = rates(latest?.run);
  const before = rates(previous?.run);

  it.each(Object.entries(CONFIGURED_LANGUAGES))(
    "enriches %s decks unasked only while its fixture passes the bar",
    (tag, row) => {
      const rate = now.get(tag);
      expect(rate?.total ?? 0, `Add a fixture deck for ${tag} to evaluation.json`).toBeGreaterThan(
        20,
      );
      const passes = enrichesByDefault(rate, before.get(tag));
      expect(
        row.enrichByDefault,
        `${tag} meets ${rate?.pass}/${rate?.total} of its expectations now and ${before.get(tag)?.pass ?? "-"}/${before.get(tag)?.total ?? "-"} before; set enrichByDefault to ${passes} in packages/core/src/languages/configured.ts`,
      ).toBe(passes);
    },
  );
});

describe("enrichesByDefault", () => {
  it("turns a language on after two passing runs, a new one included, and off after one failing run", () => {
    expect(enrichesByDefault({ pass: 35, total: 37 }, { pass: 33, total: 37 })).toBe(false);
    expect(enrichesByDefault({ pass: 35, total: 37 }, { pass: 36, total: 37 })).toBe(true);
    expect(enrichesByDefault({ pass: 35, total: 37 }, undefined)).toBe(false);
    expect(enrichesByDefault({ pass: 33, total: 37 }, { pass: 37, total: 37 })).toBe(false);
    expect(enrichesByDefault(undefined, undefined)).toBe(false);
  });
});

describe("regressions", () => {
  const rates = (entries: [string, number, number][]) =>
    new Map(entries.map(([rule, pass, total]) => [rule, { pass, total }]));

  it("allows one call's worth of noise, scaled to the run's size, and ignores a new rule", () => {
    const noise = CARDS_PER_CALL;
    expect(
      regressions(
        rates([
          ["language: only mayFill", 300, 300],
          ["example: readings over kanji", 40, 40],
        ]),
        rates([
          ["language: only mayFill", 300 - noise, 300],
          ["example: readings over kanji", 40 - noise - 1, 40],
          ["notes: no table", 0, 3],
        ]),
      ),
    ).toEqual([`example: readings over kanji: ${39 - noise}/40, was 40/40`]);
  });
});
