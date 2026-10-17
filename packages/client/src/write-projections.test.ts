import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { Card, DeckSummary, Draw } from "./api";
import { drawableLeft } from "./review-day";
import { drawState } from "./review-draw";
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

  it("marks a card important in its deck, and unmarks it", () => {
    const qc = cache();
    showWrite(qc, { kind: "card.important", id: "magari", important: true });
    const rows = () => qc.getQueryData<{ card: Card }[]>(["decks", "it", "cards"]);
    expect(rows()?.[0]?.card.important).toBe(true);
    showWrite(qc, { kind: "card.important", id: "magari", important: false });
    expect(rows()?.[0]?.card.important).toBe(false);
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

describe("a deck archive in review", () => {
  const start = new Date("2026-10-12T00:00:00Z");
  const noon = new Date("2026-10-12T12:00:00Z");
  const end = new Date("2026-10-13T00:00:00Z");
  const yesterday = new Date("2026-10-11T00:00:00Z").toISOString();
  const entry = (id: string, deckId: string) => ({
    card: card(id, deckId),
    modes: [
      {
        mode: { cue: "meaning" as const, target: "term" as const },
        stateId: `s-${id}`,
        fsrsState: 2,
        due: yesterday,
        retrievability: 0.6,
        added: "2026-09-01T00:00:00Z",
        hasCue: true,
        next: { 1: yesterday, 2: yesterday, 3: yesterday, 4: yesterday },
      },
    ],
    slipping: false,
  });
  const draw = (cards: Draw["cards"], total = cards.length): Draw => ({
    day: { date: "2026-10-12", zone: "UTC", start: start.toISOString(), end: end.toISOString() },
    goal: 20,
    attempts: 0,
    total,
    cards,
    log: [],
  });
  // What Today, the widgets and the reminders count as left.
  const left = (qc: QueryClient, key: string[]) => {
    const data = qc.getQueryData<Draw>(key);
    return data ? drawableLeft(data, drawState(data, [], noon, undefined), undefined) : undefined;
  };
  const all = ["queue", "all", "draw"];

  it("leaves nothing to review when the only deck is archived", () => {
    const qc = cache();
    qc.setQueryData(all, draw([entry("a", "it"), entry("b", "it"), entry("c", "it")]));
    expect(left(qc, all)).toBe(3);
    showWrite(qc, { kind: "deck.archive", id: "it" });
    expect(qc.getQueryData<Draw>(all)?.cards).toEqual([]);
    expect(left(qc, all)).toBe(0);
  });

  it("keeps when the draw was read through every card write, which the phone dates grades by", () => {
    const qc = cache();
    const fetchedAt = Date.parse("2026-10-12T11:00:00Z");
    qc.setQueryData(all, {
      ...draw([entry("a", "it"), entry("b", "it"), entry("c", "et")]),
      fetchedAt,
    });
    const writes: Write[] = [
      { kind: "card.update", id: "a", patch: { meaning: "maybe" } },
      { kind: "card.important", id: "a", important: true },
      { kind: "card.archive", id: "b" },
      { kind: "deck.archive", id: "et" },
    ];
    for (const w of writes) {
      showWrite(qc, w);
      expect(qc.getQueryData<Draw & { fetchedAt: number }>(all)?.fetchedAt).toBe(fetchedAt);
    }
  });

  it("keeps the other decks' cards", () => {
    const qc = cache();
    qc.setQueryData(all, draw([entry("a", "it"), entry("b", "et"), entry("c", "it")]));
    showWrite(qc, { kind: "deck.archive", id: "it" });
    expect(ids(qc.getQueryData<Draw>(all)?.cards)).toEqual(["b"]);
    expect(left(qc, all)).toBe(1);
  });

  it("takes the deck's cards behind the fetched front out of the total too", () => {
    const qc = cache();
    qc.setQueryData(["decks"], [deck("it", { due: 60 }), deck("et", { due: 90 })]);
    qc.setQueryData(all, draw([entry("a", "it"), entry("b", "et")], 150));
    showWrite(qc, { kind: "deck.archive", id: "it" });
    expect(qc.getQueryData<Draw>(all)?.total).toBe(90);
    expect(left(qc, all)).toBe(90);
  });

  it("empties the deck's own draw and leaves a series draw it is not in", () => {
    const qc = cache();
    qc.setQueryData(["decks"], [deck("it", { due: 5 }), deck("et", { seriesId: "s" })]);
    const own = ["queue", "deck:it", "draw"];
    const series = ["queue", "series:s", "draw"];
    qc.setQueryData(own, draw([entry("a", "it")], 5));
    qc.setQueryData(series, draw([entry("b", "et")], 4));
    showWrite(qc, { kind: "deck.archive", id: "it" });
    expect(qc.getQueryData<Draw>(own)).toMatchObject({ cards: [], total: 0 });
    expect(qc.getQueryData<Draw>(series)?.total).toBe(4);
  });

  it("takes the deck's cards out of a round", () => {
    const qc = cache();
    const round = ["queue", "all", "forgotten"];
    qc.setQueryData(round, {
      total: 3,
      items: [{ card: card("a", "it") }, { card: card("b", "et") }],
    });
    showWrite(qc, { kind: "deck.archive", id: "it" });
    expect(qc.getQueryData(round)).toMatchObject({ total: 2, items: [{ card: { id: "b" } }] });
  });

  it("puts the cards and the count back when the archive is undone", () => {
    const qc = cache();
    qc.setQueryData(["decks"], [deck("it", { due: 60 }), deck("et", { due: 90 })]);
    qc.setQueryData(all, draw([entry("a", "it"), entry("b", "et")], 150));
    showWrite(qc, { kind: "deck.archive", id: "it" });
    showWrite(qc, { kind: "deck.restore", id: "it" });
    const data = qc.getQueryData<Draw>(all);
    expect(ids(data?.cards)?.sort()).toEqual(["a", "b"]);
    expect(data?.total).toBe(150);
  });

  const waiting = (...writes: Write[]): QueuedWrite[] =>
    writes.map((write) => ({ v: 1, key: "k", at: 0, write, label: "" }));
  const twoDecks = () => {
    const qc = cache();
    qc.setQueryData(["decks"], [deck("it", { due: 60 }), deck("et", { due: 90 })]);
    return qc;
  };

  it("takes a deck whose cards all sit behind the front out of the total", () => {
    const qc = twoDecks();
    qc.setQueryData(all, draw([entry("b", "et")], 150));
    showWrite(qc, { kind: "deck.archive", id: "it" });
    expect(qc.getQueryData<Draw>(all)?.total).toBe(90);
  });

  it("leaves a fetched draw that already lacks the deck as it is", () => {
    const qc = twoDecks();
    const landed = draw([entry("b", "et")], 90);
    const rebased = rebase(
      all,
      landed,
      waiting({ kind: "deck.archive", id: "it" }),
      cacheLookup(qc),
    );
    expect(rebased).toBe(landed);
  });

  it("counts an archive once however often it is laid over the same draw", () => {
    const qc = twoDecks();
    const fetched = draw([entry("a", "it"), entry("b", "et")], 150);
    const archive: Write = { kind: "deck.archive", id: "it" };
    const once = rebase(all, fetched, waiting(archive), cacheLookup(qc));
    expect(once.total).toBe(90);
    expect(rebase(all, once, waiting(archive), cacheLookup(qc))).toBe(once);
  });

  it("keeps a deck whose archive was undone while both wait, through a refetch", () => {
    const qc = twoDecks();
    const fetched = draw([entry("a", "it"), entry("b", "et")], 150);
    const pending = waiting({ kind: "deck.archive", id: "it" }, { kind: "deck.restore", id: "it" });
    const rebased = rebase(all, fetched, pending, cacheLookup(qc));
    expect(rebased).toBe(fetched);
    const round = { total: 2, items: [{ card: card("a", "it") }, { card: card("b", "et") }] };
    expect(rebase(["queue", "all", "forgotten"], round, pending, cacheLookup(qc))).toBe(round);
  });

  it("archives again when the deck is archived after its Undo", () => {
    const qc = twoDecks();
    const fetched = draw([entry("a", "it"), entry("b", "et")], 150);
    const pending = waiting(
      { kind: "deck.archive", id: "it" },
      { kind: "deck.restore", id: "it" },
      { kind: "deck.archive", id: "it" },
    );
    const rebased = rebase(all, fetched, pending, cacheLookup(qc));
    expect(ids(rebased.cards)).toEqual(["b"]);
    expect(rebased.total).toBe(90);
  });

  it("lays an archive still waiting over a draw fetched again", () => {
    const qc = cache();
    const pending: QueuedWrite[] = [
      { v: 1, key: "k", at: 0, write: { kind: "deck.archive", id: "it" }, label: "" },
    ];
    const fetched = draw([entry("a", "it"), entry("b", "et")]);
    const rebased = rebase(all, fetched, pending, cacheLookup(qc));
    expect(ids(rebased.cards)).toEqual(["b"]);
    expect(rebased.total).toBe(1);
  });
  describe("with each deck's count in the draw", () => {
    const counted = (cards: Draw["cards"], decks: Record<string, number>): Draw => ({
      ...draw(
        cards,
        Object.values(decks).reduce((a, b) => a + b, 0),
      ),
      decks,
    });
    const archive: Write = { kind: "deck.archive", id: "it" };

    it("takes the deck's count out of a refetch that still counts it, though none of its cards are in front", () => {
      const qc = twoDecks();
      const fetched = counted([entry("b", "et")], { it: 60, et: 100 });
      const rebased = rebase(all, fetched, waiting(archive), cacheLookup(qc));
      expect(rebased.total).toBe(100);
      expect(rebased.decks).toEqual({ et: 100 });
    });

    it("leaves a refetch that no longer counts the deck as it is", () => {
      const qc = twoDecks();
      const landed = counted([entry("b", "et")], { et: 100 });
      expect(rebase(all, landed, waiting(archive), cacheLookup(qc))).toBe(landed);
    });

    it("counts the archive once over the same draw", () => {
      const qc = twoDecks();
      const fetched = counted([entry("a", "it"), entry("b", "et")], { it: 60, et: 100 });
      const once = rebase(all, fetched, waiting(archive), cacheLookup(qc));
      expect(ids(once.cards)).toEqual(["b"]);
      expect(once.total).toBe(100);
      expect(rebase(all, once, waiting(archive), cacheLookup(qc))).toBe(once);
    });

    it("keeps the deck when its Undo waits after the archive", () => {
      const qc = twoDecks();
      const fetched = counted([entry("b", "et")], { it: 60, et: 100 });
      const pending = waiting(archive, { kind: "deck.restore", id: "it" });
      expect(rebase(all, fetched, pending, cacheLookup(qc))).toBe(fetched);
    });

    it("puts the deck's count back on Undo", () => {
      const qc = twoDecks();
      qc.setQueryData(all, counted([entry("a", "it"), entry("b", "et")], { it: 60, et: 100 }));
      showWrite(qc, archive);
      expect(qc.getQueryData<Draw>(all)?.total).toBe(100);
      showWrite(qc, { kind: "deck.restore", id: "it" });
      const data = qc.getQueryData<Draw>(all);
      expect(data?.total).toBe(160);
      expect(data?.decks).toEqual({ it: 60, et: 100 });
      expect(ids(data?.cards)?.sort()).toEqual(["a", "b"]);
    });
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

describe("a card write in review", () => {
  const draw = () => ({
    total: 2,
    cards: [
      { card: card("magari", "it"), modes: [] },
      { card: card("sbrigarsi", "it"), modes: [] },
    ],
  });
  const round = () => ({
    total: 2,
    items: [{ card: card("magari", "it") }, { card: card("sbrigarsi", "it") }],
  });

  it("shows an edit and takes an archived card out of a cached draw", () => {
    const qc = cache();
    qc.setQueryData(["queue", "all", "draw"], draw());
    showWrite(qc, { kind: "card.update", id: "magari", patch: { meaning: "perhaps" } });
    showWrite(qc, { kind: "card.archive", id: "sbrigarsi" });
    const data = qc.getQueryData<ReturnType<typeof draw>>(["queue", "all", "draw"]);
    expect(ids(data?.cards)).toEqual(["magari"]);
    expect(data?.cards[0]?.card.meaning).toBe("perhaps");
    expect(data?.total).toBe(1);
  });

  it("does the same to a round's queue", () => {
    const qc = cache();
    qc.setQueryData(["queue", "all", "forgotten"], round());
    showWrite(qc, { kind: "card.archive", id: "magari" });
    showWrite(qc, { kind: "card.important", id: "sbrigarsi", important: true });
    const data = qc.getQueryData<ReturnType<typeof round>>(["queue", "all", "forgotten"]);
    expect(ids(data?.items)).toEqual(["sbrigarsi"]);
    expect(data?.items[0]?.card.important).toBe(true);
    expect(data?.total).toBe(1);
  });

  it("puts a card back in the draw and the round when its archive is undone", () => {
    const qc = cache();
    qc.setQueryData(["queue", "all", "draw"], draw());
    qc.setQueryData(["queue", "all", "forgotten"], round());
    showWrite(qc, { kind: "card.archive", id: "magari" });
    showWrite(qc, { kind: "card.restore", id: "magari" });
    const d = qc.getQueryData<ReturnType<typeof draw>>(["queue", "all", "draw"]);
    const r = qc.getQueryData<ReturnType<typeof round>>(["queue", "all", "forgotten"]);
    expect(ids(d?.cards)?.sort()).toEqual(["magari", "sbrigarsi"]);
    expect(d?.total).toBe(2);
    expect(ids(r?.items)?.sort()).toEqual(["magari", "sbrigarsi"]);
  });

  it("lays an archive still waiting over a draw fetched again", () => {
    const qc = cache();
    const pending: QueuedWrite[] = [
      { v: 1, key: "k", at: 0, write: { kind: "card.archive", id: "magari" }, label: "" },
    ];
    const rebased = rebase(["queue", "all", "draw"], draw(), pending, cacheLookup(qc));
    expect(ids(rebased.cards)).toEqual(["sbrigarsi"]);
  });
});

describe("archived cards a page at a time", () => {
  const page = (ids: string[], nextCursor: string | null) => ({
    cards: ids.map((id) => ({ ...card(id, "it"), deckName: "it" })),
    nextCursor,
    total: null,
  });
  const pagesKey = ["cards", "archived", "pages"];
  const cached = () => ({
    pages: [page(["a"], "c1"), page(["b"], null)],
    pageParams: [undefined, "c1"],
  });
  type Pages = ReturnType<typeof cached>;

  it("adds an archive to the first page once and keeps the cursors", () => {
    const qc = cache();
    qc.setQueryData(pagesKey, cached());
    showWrite(qc, { kind: "card.archive", id: "magari" });
    showWrite(qc, { kind: "card.archive", id: "magari" });
    const data = qc.getQueryData<Pages>(pagesKey);
    expect(data?.pages.map((p) => p.cards.map((c) => c.id))).toEqual([["magari", "a"], ["b"]]);
    expect(data?.pages.map((p) => p.nextCursor)).toEqual(["c1", null]);
    expect(data?.pageParams).toEqual([undefined, "c1"]);
  });

  it("takes a restored card off whichever page holds it", () => {
    const qc = cache();
    qc.setQueryData(pagesKey, cached());
    showWrite(qc, { kind: "card.restore", id: "b" });
    const data = qc.getQueryData<Pages>(pagesKey);
    expect(data?.pages.map((p) => p.cards.map((c) => c.id))).toEqual([["a"], []]);
  });

  it("lays waiting writes over a page fetched again: an archive on the first page only", () => {
    const qc = cache();
    const pending: QueuedWrite[] = [
      { v: 1, key: "k", at: 0, write: { kind: "card.archive", id: "magari" }, label: "" },
      { v: 1, key: "k2", at: 1, write: { kind: "card.restore", id: "b" }, label: "" },
    ];
    const lookup = cacheLookup(qc);
    const first = rebase([...pagesKey, "first"], page(["a"], "c1"), pending, lookup);
    const next = rebase([...pagesKey, "next"], page(["b", "x"], null), pending, lookup);
    expect(first.cards.map((c) => c.id)).toEqual(["magari", "a"]);
    expect(first.nextCursor).toBe("c1");
    expect(next.cards.map((c) => c.id)).toEqual(["x"]);
  });
});

describe("a card only review data holds", () => {
  it("is found for its archive, so Archived and its deck's count follow", () => {
    const qc = cache();
    qc.setQueryData(["queue", "all", "draw"], {
      total: 1,
      cards: [{ card: card("farcela", "it"), modes: [] }],
    });
    qc.setQueryData(["cards", "archived", "pages"], {
      pages: [{ cards: [], nextCursor: null, total: null }],
      pageParams: [undefined],
    });
    showWrite(qc, { kind: "card.archive", id: "farcela" });
    const pages = qc.getQueryData<{ pages: { cards: Card[] }[] }>(["cards", "archived", "pages"]);
    expect(pages?.pages[0]?.cards.map((c) => c.id)).toEqual(["farcela"]);
    expect(qc.getQueryData<Card[]>(["cards", "archived"])?.map((c) => c.id)).toEqual(["farcela"]);
    expect(qc.getQueryData<DeckSummary[]>(["decks"])?.[0]?.total).toBe(0);
  });
});

describe("a card archive undone while both wait", () => {
  it("is not replayed over a draw fetched again", () => {
    const qc = cache();
    const pending: QueuedWrite[] = [
      { v: 1, key: "k", at: 0, write: { kind: "card.archive", id: "x" }, label: "" },
      { v: 1, key: "k2", at: 1, write: { kind: "card.restore", id: "x" }, label: "" },
    ];
    const fetched = { total: 5, decks: { d: 5 }, cards: [{ card: card("x", "d"), modes: [] }] };
    const rebased = rebase(["queue", "all", "draw"], fetched, pending, cacheLookup(qc));
    expect(rebased).toMatchObject({ total: 5, decks: { d: 5 } });
    expect(ids(rebased.cards)).toEqual(["x"]);
  });
});
