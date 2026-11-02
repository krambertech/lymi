import { describe, expect, it } from "vitest";
import { enrichAnnouncement } from "./enrich-announcement";

type Statuses = [string | null, string | null];

/** Feeds each pair of statuses through in turn and collects what the page says. */
const said = (steps: Statuses[]) => {
  let run: ReturnType<typeof enrichAnnouncement>["run"] = null;
  const out: string[] = [];
  for (const [status, translationStatus] of steps) {
    const next = enrichAnnouncement(run, status, translationStatus);
    run = next.run;
    if (next.say) out.push(next.say);
  }
  return out;
};

describe("enrichAnnouncement", () => {
  it("says nothing for a card with no run, or one that opened already failed", () => {
    expect(said([[null, null]])).toEqual([]);
    expect(said([["failed", null]])).toEqual([]);
  });

  it("announces a run that writes only the translation", () => {
    expect(
      said([
        [null, null],
        [null, "working"],
        [null, null],
      ]),
    ).toEqual(["started", "done"]);
    expect(
      said([
        [null, "working"],
        [null, "failed"],
      ]),
    ).toEqual(["started", "failed"]);
  });

  it("says the start once when the fill fails while the translation still runs", () => {
    expect(
      said([
        ["working", "working"],
        ["failed", "working"],
        ["failed", null],
      ]),
    ).toEqual(["started", "failed"]);
  });

  it("does not read a stale failure from a part this run never touched", () => {
    expect(
      said([
        ["failed", "working"],
        ["failed", null],
      ]),
    ).toEqual(["started", "done"]);
    expect(
      said([
        ["working", "failed"],
        [null, "failed"],
      ]),
    ).toEqual(["started", "done"]);
  });
});
