import type { Card, DeckSummary } from "@lymi/client/api";
import { describe, expect, it } from "vitest";
import { onCardEdited } from "./edited";
import { canEnrich, watchEnrichment } from "./enrich-watch";

const card = (patch: Partial<Card> = {}) =>
  ({
    id: "c1",
    deckId: "d1",
    term: "sbrigare",
    meaning: "to deal with",
    example: null,
    notes: null,
    pronunciation: "zbri-GA-re",
    language: "it",
    enrichmentStatus: null,
    ...patch,
  }) as Card;

const owner: Pick<DeckSummary, "role" | "enrichFields"> = {
  role: "owner",
  enrichFields: ["meaning", "example"],
};

describe("canEnrich", () => {
  it("offers Enrich to the owner while a field the deck lets the AI fill is empty", () => {
    expect(canEnrich(card(), owner)).toBe(true);
  });

  it("leaves it out for a member, a filled card, a field the deck keeps, and a working card", () => {
    expect(canEnrich(card(), { ...owner, role: "learner" })).toBe(false);
    expect(canEnrich(card({ example: "Devo sbrigare una cosa." }), owner)).toBe(false);
    expect(canEnrich(card(), { ...owner, enrichFields: ["meaning"] })).toBe(false);
    expect(canEnrich(card({ enrichmentStatus: "working" }), owner)).toBe(false);
    expect(canEnrich(card(), undefined)).toBe(false);
  });
});

describe("watchEnrichment", () => {
  const instant = { wait: async () => {} };

  it("hands the landed card to a screen holding its own copy, as a review does", async () => {
    const landed = card({ example: "Devo sbrigare una cosa.", exampleSource: "ai" });
    const reads = [null, [{ card: card({ enrichmentStatus: "working" }) }], [{ card: landed }]];
    const heard: Card[] = [];
    const stop = onCardEdited((c) => heard.push(c));
    const settled = await watchEnrichment(card({ enrichmentStatus: "working" }), {
      ...instant,
      read: async () => reads.shift() ?? null,
    });
    stop();
    expect(settled).toBe(landed);
    expect(heard).toEqual([landed]);
  });

  it("hands on a failed run too, so the card stops waiting", async () => {
    const failed = card({ enrichmentStatus: "failed" });
    expect(
      await watchEnrichment(card({ enrichmentStatus: "working" }), {
        ...instant,
        read: async () => [{ card: failed }],
      }),
    ).toBe(failed);
  });

  it("lets go of a card that left its deck, or a run that outlasts the deck's patience", async () => {
    expect(await watchEnrichment(card(), { ...instant, read: async () => [] })).toBeNull();
    let clock = 0;
    const working = [{ card: card({ enrichmentStatus: "working" }) }];
    expect(
      await watchEnrichment(card(), {
        wait: async () => {
          clock += 60_000;
        },
        now: () => clock,
        read: async () => working,
      }),
    ).toBeNull();
  });
});
