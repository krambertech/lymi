import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveCards, markCards, NOTHING_CHANGED } from "./card-batch";
import type { DeckRow } from "./deck-list";
import { deckCardsQuery } from "./queries";

const api = vi.hoisted(() => ({ archiveCards: vi.fn(), setCardsImportant: vi.fn() }));
vi.mock("./api", () => ({ api }));

const row = (id: string, important = false) =>
  ({ card: { id, important, tags: [] }, state: null }) as unknown as DeckRow;
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
