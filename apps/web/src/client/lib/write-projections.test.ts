import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { Card, DeckSummary } from "./api";
import { cacheLookup, localCard, localDeck, rebase, showWrite } from "./write-projections";
import type { QueuedWrite, Write } from "./writes";

const me = { id: "me", name: "Kateryna", email: "k@example.com" };
const deck = (id: string, fields: Partial<DeckSummary> = {}): DeckSummary => ({
  ...localDeck(
    { kind: "deck.create", input: { id, name: id } },
    {
      card: () => undefined,
      deck: () => undefined,
      me,
    },
  ),
  ...fields,
});
const card = (id: string, deckId: string, fields: Partial<Card> = {}): Card => ({
  ...localCard(
    { kind: "card.add", input: { id, deckId, term: id } },
    {
      card: () => undefined,
      deck: () => undefined,
      me,
    },
  ),
  ...fields,
});

function cache() {
  const qc = new QueryClient();
  qc.setQueryData(["me"], me);
  qc.setQueryData(["decks"], [deck("it", { total: 1, defaultLanguage: "it" }), deck("et")]);
  qc.setQueryData(["decks", "archived"], []);
  qc.setQueryData(["decks", "it", "cards"], [{ card: card("magari", "it"), state: null }]);
  qc.setQueryData(["decks", "et", "cards"], []);
  qc.setQueryData(["cards", "archived"], []);
  return qc;
}
const ids = (rows: { card: Card }[] | undefined) => rows?.map((row) => row.card.id);

describe("a write on the device", () => {
  it("shows a new card in its deck, with the deck's language, and counts it", () => {
    const qc = cache();
    showWrite(qc, {
      kind: "card.add",
      input: { id: "sbrigarsi", deckId: "it", term: "sbrigarsi" },
    });
    const rows = qc.getQueryData<{ card: Card }[]>(["decks", "it", "cards"]);
    expect(ids(rows)).toEqual(["sbrigarsi", "magari"]);
    expect(rows?.[0]?.card).toMatchObject({ language: "it", userId: "me", createdBy: "user" });
    expect(qc.getQueryData<DeckSummary[]>(["decks"])?.[0]?.total).toBe(2);
  });

  it("moves an archived card from its deck to Archived, and back on restore", () => {
    const qc = cache();
    showWrite(qc, { kind: "card.archive", id: "magari" });
    expect(ids(qc.getQueryData(["decks", "it", "cards"]))).toEqual([]);
    expect(qc.getQueryData<Card[]>(["cards", "archived"])).toMatchObject([
      { id: "magari", deckName: "it" },
    ]);
    showWrite(qc, { kind: "card.restore", id: "magari" });
    expect(ids(qc.getQueryData(["decks", "it", "cards"]))).toEqual(["magari"]);
    expect(qc.getQueryData(["cards", "archived"])).toEqual([]);
  });

  it("moves an edited card to the deck it was moved to", () => {
    const qc = cache();
    showWrite(qc, { kind: "card.update", id: "magari", patch: { deckId: "et", meaning: "maybe" } });
    expect(ids(qc.getQueryData(["decks", "it", "cards"]))).toEqual([]);
    const moved = qc.getQueryData<{ card: Card }[]>(["decks", "et", "cards"]);
    expect(moved?.[0]?.card).toMatchObject({ id: "magari", deckId: "et", meaning: "maybe" });
  });

  it("opens a new deck empty, so its screen needs nothing from the server", () => {
    const qc = cache();
    showWrite(qc, { kind: "deck.create", input: { id: "pt", name: "Portuguese" } });
    expect(qc.getQueryData<DeckSummary[]>(["decks"])?.at(-1)).toMatchObject({
      id: "pt",
      name: "Portuguese",
      role: "owner",
      owner: { id: "me" },
    });
    expect(qc.getQueryData(["decks", "pt", "cards"])).toEqual([]);
    expect(qc.getQueryData(["decks", "pt", "sections"])).toEqual({ sections: [], progress: null });
  });

  it("moves an archived deck to Archived and renames it there", () => {
    const qc = cache();
    showWrite(qc, { kind: "deck.archive", id: "et" });
    showWrite(qc, { kind: "deck.update", id: "et", patch: { name: "Estonian" } });
    expect(qc.getQueryData<DeckSummary[]>(["decks"])?.map((d) => d.id)).toEqual(["it"]);
    expect(qc.getQueryData<DeckSummary[]>(["decks", "archived"])).toMatchObject([
      { id: "et", name: "Estonian" },
    ]);
  });
});

describe("a refetch while writes wait", () => {
  const queued = (write: Write): QueuedWrite => ({ v: 1, key: "k", at: 0, write, label: "" });

  it("lays the waiting writes over what the server sent, once each", () => {
    const qc = cache();
    const pending = [
      queued({ kind: "card.add", input: { id: "sbrigarsi", deckId: "it", term: "sbrigarsi" } }),
      queued({ kind: "card.update", id: "magari", patch: { meaning: "perhaps" } }),
    ];
    const server = [{ card: card("magari", "it"), state: null }];
    const rebased = rebase(["decks", "it", "cards"], server, pending, cacheLookup(qc));
    expect(ids(rebased)).toEqual(["sbrigarsi", "magari"]);
    expect(rebased[1]?.card.meaning).toBe("perhaps");
    // A server answer that already holds the add is not given a second copy.
    const landed = [{ card: card("sbrigarsi", "it"), state: null }, ...server];
    expect(ids(rebase(["decks", "it", "cards"], landed, pending, cacheLookup(qc)))).toEqual([
      "sbrigarsi",
      "magari",
    ]);
  });

  it("leaves a query no write shows in untouched", () => {
    const qc = cache();
    const data = { streak: 3 };
    const pending = [queued({ kind: "card.archive", id: "magari" })];
    expect(rebase(["streak"], data, pending, cacheLookup(qc))).toBe(data);
  });
});
