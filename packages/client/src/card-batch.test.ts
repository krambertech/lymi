import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveCards,
  markCards,
  moveCardsToDeck,
  NOTHING_CHANGED,
  restoreCards,
} from "./card-batch";
import type { DeckRow } from "./deck-list";
import { deckCardsQuery } from "./queries";

const api = vi.hoisted(() => ({
  archiveCards: vi.fn(),
  restoreCards: vi.fn(),
  editCards: vi.fn(),
  setCardsImportant: vi.fn(),
}));
vi.mock("./api", () => ({ api }));

const row = (id: string, important = false, sectionId: string | null = null) =>
  ({ card: { id, important, sectionId, tags: [] }, state: null }) as unknown as DeckRow;
const key = deckCardsQuery("d1").queryKey;
let qc: QueryClient;
const ids = () => qc.getQueryData<DeckRow[]>(key)?.map((r) => r.card.id);

beforeEach(() => {
  qc = new QueryClient();
  qc.setQueryData(key, [row("a"), row("b"), row("c")]);
  vi.clearAllMocks();
});

describe("archiving chosen cards", () => {
  it("puts back on the list a card the server did not archive", async () => {
    api.archiveCards.mockResolvedValue({
      results: [
        { id: "a", status: "archived" },
        { id: "b", status: "error", code: "unavailable", error: "offline" },
      ],
    });
    await expect(archiveCards(qc, "d1", ["a", "b"])).resolves.toEqual(["a"]);
    expect(ids()).toEqual(["b", "c"]);
  });

  it("puts every card back and says so when none was archived", async () => {
    api.archiveCards.mockResolvedValue({
      results: [{ id: "a", status: "error", code: "forbidden", error: "no" }],
    });
    await expect(archiveCards(qc, "d1", ["a"])).rejects.toThrow(NOTHING_CHANGED);
    expect(ids()).toEqual(["a", "b", "c"]);
  });
});

describe("marking chosen cards important", () => {
  const marks = () => qc.getQueryData<DeckRow[]>(key)?.map((r) => r.card.important);

  it("gives each card back the mark it had on Undo", async () => {
    qc.setQueryData(key, [row("a", true), row("b"), row("c")]);
    api.setCardsImportant.mockImplementation(async (cards: { cardId: string }[]) => ({
      results: cards.map((c) => ({ id: c.cardId, status: "updated" })),
    }));
    const marking = markCards(qc, "d1", ["a", "b"], true);
    await expect(marking.done).resolves.toEqual(["a", "b"]);
    await marking.undo(["a", "b"]);
    expect(api.setCardsImportant).toHaveBeenLastCalledWith([
      { cardId: "a", important: true },
      { cardId: "b", important: false },
    ]);
    expect(marks()).toEqual([true, false, false]);
  });

  it("keeps the new mark when Undo fails", async () => {
    api.setCardsImportant
      .mockResolvedValueOnce({ results: [{ id: "b", status: "updated" }] })
      .mockRejectedValueOnce(new Error("offline"));
    const marking = markCards(qc, "d1", ["b"], true);
    await marking.done;
    await expect(marking.undo(["b"])).rejects.toThrow("offline");
    expect(marks()).toEqual([false, true, false]);
  });
});

describe("moving chosen cards to another deck", () => {
  it("puts each card back in the section it left on Undo, or in none when it has gone", async () => {
    qc.setQueryData(key, [row("a", false, "s1"), row("b", false, "s2"), row("c")]);
    api.editCards
      .mockResolvedValueOnce({
        results: ["a", "b", "c"].map((id) => ({ id, status: "updated" })),
      })
      .mockResolvedValueOnce({
        results: [
          { id: "a", status: "updated" },
          { id: "b", status: "error", code: "not_found", error: "Section not found" },
          { id: "c", status: "updated" },
        ],
      })
      .mockResolvedValueOnce({ results: [{ id: "b", status: "updated" }] });
    const moving = moveCardsToDeck(qc, "d1", ["a", "b", "c"], "d2");
    const done = await moving.done;
    await expect(moving.undo(done)).resolves.toEqual([]);
    expect(api.editCards.mock.calls.slice(1).map(([edits]) => edits)).toEqual([
      [
        { cardId: "a", deckId: "d1", sectionId: "s1" },
        { cardId: "b", deckId: "d1", sectionId: "s2" },
        { cardId: "c", deckId: "d1", sectionId: null },
      ],
      [{ cardId: "b", deckId: "d1", sectionId: null }],
    ]);
  });
});

describe("Undo", () => {
  it("names the cards a restore left archived, to send again", async () => {
    api.restoreCards.mockResolvedValue({
      results: [
        { id: "a", status: "restored" },
        { id: "b", status: "error", code: "unavailable", error: "offline" },
      ],
    });
    await expect(restoreCards(qc, ["a", "b"])).resolves.toEqual(["b"]);
  });

  it("names the cards a move back left in the other deck", async () => {
    api.editCards
      .mockResolvedValueOnce({
        results: [
          { id: "a", status: "updated" },
          { id: "b", status: "updated" },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          { id: "a", status: "updated" },
          { id: "b", status: "error", code: "unavailable", error: "offline" },
        ],
      });
    const moving = moveCardsToDeck(qc, "d1", ["a", "b"], "d2");
    await expect(moving.undo(await moving.done)).resolves.toEqual(["b"]);
  });

  it("names every card when no mark came back", async () => {
    api.setCardsImportant
      .mockResolvedValueOnce({ results: [{ id: "a", status: "updated" }] })
      .mockResolvedValueOnce({
        results: [{ id: "a", status: "error", code: "unavailable", error: "offline" }],
      });
    const marking = markCards(qc, "d1", ["a"], true);
    await expect(marking.undo(await marking.done)).resolves.toEqual(["a"]);
  });
});
