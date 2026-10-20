import { CONFIGURED_LANGUAGES } from "@lymi/core";
import { describe, expect, it } from "vitest";
import {
  enrichesByDefault,
  enrichmentPromptHash,
  languagePassRates,
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

  it("keeps each rule on the cases the run before it passed, beyond one call's noise", () => {
    // Two runs of one prompt differ only by the model's noise, which the gate absorbs.
    if (!latest || !previous || previous.run.hash === latest.run.hash) return;
    const shared = new Set(previous.run.calls.flatMap((call) => call.cases));
    const scored = (calls: typeof latest.run.calls) =>
      scoreCalls(decks, calls).filter((one) => shared.has(one.item.id));
    expect(
      regressions(scored(previous.run.calls), scored(latest.run.calls), latest.run.calls),
    ).toEqual([]);
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
  /** Cases keeping or failing one rule each, as `rule:case:pass` entries. */
  const cases = (...entries: string[]) =>
    entries.map((entry) => {
      const [rule = "", id = "", pass = ""] = entry.split(":");
      const [field = "", name = ""] = rule.split(".");
      return {
        item: { id },
        results: [{ field: field as "example", rule: name, pass: pass === "ok" }],
      };
    });
  const kanji = (a: string, b: string, c: string, d: string) =>
    cases(
      `example.readings over kanji:a:${a}`,
      `example.readings over kanji:b:${b}`,
      `example.readings over kanji:c:${c}`,
      `example.readings over kanji:d:${d}`,
    );
  const before = kanji("ok", "ok", "ok", "ok");

  it("fails a small rule that loses cases in two calls, and lets the same loss in one call pass", () => {
    const apart = [{ cases: ["a", "b"] }, { cases: ["c", "d"] }];
    const together = [{ cases: ["a", "c"] }, { cases: ["b", "d"] }];
    const lost = kanji("no", "ok", "no", "ok");
    expect(regressions(before, lost, apart)).toEqual([
      "example: readings over kanji: newly fails a, c, across 2 calls",
    ]);
    expect(regressions(before, lost, together)).toEqual([]);
  });

  it("ignores a rule the run before never checked, and a case it already failed", () => {
    const calls = [{ cases: ["a"] }, { cases: ["b"] }, { cases: ["c", "d"] }];
    expect(
      regressions(kanji("no", "no", "ok", "ok"), kanji("no", "no", "ok", "ok"), calls),
    ).toEqual([]);
    expect(regressions([], cases("notes.no table:a:no", "notes.no table:b:no"), calls)).toEqual([]);
  });
});
