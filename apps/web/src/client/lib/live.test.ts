import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { refreshShown } from "./live";

describe("refreshShown", () => {
  it("refreshes everything but a review round's fixed order", async () => {
    const qc = new QueryClient();
    const keys = [
      ["decks"],
      ["decks", "d1", "cards"],
      ["queue", "all", "draw"],
      ["queue", "all", "order"],
      ["queue", "all", "forgotten"],
      ["dev", "personas"],
    ];
    for (const key of keys) qc.setQueryData(key, 1);
    await refreshShown(qc);
    const stale = keys
      .filter((key) => qc.getQueryState(key)?.isInvalidated)
      .map((k) => k.join("/"));
    expect(stale).toEqual(["decks", "decks/d1/cards", "queue/all/draw"]);
  });
});
