import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { DeckRow } from "./deck-list";
import { deckCardsQuery } from "./queries";
import { showWrite } from "./write-projections";

/**
 * Archive, Move to deck and the important mark for a deck's chosen cards, as the web's and the
 * phone's selections both run them: the list answers at once, a card the server did not change
 * goes back, and each resolves with the cards that changed so a client can offer Undo. A write
 * where no card changed rejects with `NOTHING_CHANGED`. An Undo resolves with the cards that did
 * not come back, for the client to say so and send again.
 */

type Outcome = { results: { id: string | null; status: string }[] };

export const NOTHING_CHANGED = "none";

const refresh = (qc: QueryClient) =>
  Promise.all(
    ["decks", "series", "queue", "rounds"].map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );

/** The cards a bulk write changed; one that failed stays where it was. */
const changed = (out: Outcome) =>
  out.results.flatMap((r) => (r.status !== "error" && r.id ? [r.id] : []));

/** Of the cards an Undo sent, those it left as they were. */
const missed = (sent: readonly string[], back: Iterable<string>) => {
  const came = new Set(back);
  return sent.filter((id) => !came.has(id));
};

/** Takes these cards off the deck's list. */
const take = (qc: QueryClient, deckId: string, ids: Iterable<string>) => {
  const going = new Set(ids);
  if (going.size === 0) return;
  qc.setQueryData<DeckRow[]>(deckCardsQuery(deckId).queryKey, (prev) =>
    prev?.filter((row) => !going.has(row.card.id)),
  );
};

/**
 * Puts these rows back on the deck's list beside every row it holds now, so a batch that fails or is
 * undone never takes back another batch's change; the list sorts itself.
 */
const putBack = (qc: QueryClient, deckId: string, rows: readonly DeckRow[]) => {
  if (rows.length === 0) return;
  const key = deckCardsQuery(deckId).queryKey;
  void qc.cancelQueries({ queryKey: key, exact: true });
  qc.setQueryData<DeckRow[]>(key, (prev) => {
    if (!prev) return prev;
    const here = new Set(prev.map((row) => row.card.id));
    const back = rows.filter((row) => !here.has(row.card.id));
    return back.length > 0 ? [...prev, ...back] : prev;
  });
};

/**
 * Takes cards off the deck's list at once, then writes; a card the server did not change goes back.
 * Resolves with the cards that changed and the rows they had, for Undo to show again at once.
 */
async function leave(
  qc: QueryClient,
  deckId: string,
  cardIds: string[],
  write: () => Promise<Outcome>,
) {
  const key = deckCardsQuery(deckId).queryKey;
  void qc.cancelQueries({ queryKey: key, exact: true });
  const going = new Set(cardIds);
  const rows = (qc.getQueryData<DeckRow[]>(key) ?? []).filter((row) => going.has(row.card.id));
  take(qc, deckId, going);
  try {
    const done = changed(await write());
    const gone = new Set(done);
    putBack(
      qc,
      deckId,
      rows.filter((row) => !gone.has(row.card.id)),
    );
    if (done.length === 0) throw new Error(NOTHING_CHANGED);
    return { done, rows: new Map(rows.map((row) => [row.card.id, row])) };
  } catch (e) {
    putBack(qc, deckId, rows);
    throw e;
  } finally {
    void refresh(qc);
  }
}

/**
 * Shows the cards an Undo sends back on the deck's list at once, then takes off again those the
 * server left where they were. Resolves with those cards.
 */
async function comeBack(
  qc: QueryClient,
  deckId: string,
  rows: ReadonlyMap<string, DeckRow>,
  ids: string[],
  write: () => Promise<string[]>,
) {
  putBack(
    qc,
    deckId,
    ids.flatMap((id) => rows.get(id) ?? []),
  );
  try {
    const left = await write();
    take(qc, deckId, left);
    return left;
  } catch (e) {
    take(qc, deckId, ids);
    throw e;
  } finally {
    void refresh(qc);
  }
}

/** `undo` restores the cards it archived and shows them on the deck's list again at once. */
export function archiveCards(qc: QueryClient, deckId: string, cardIds: string[]) {
  const archiving = leave(qc, deckId, cardIds, () => api.archiveCards(cardIds));
  return {
    done: archiving.then((a) => a.done),
    undo: async (done: string[]) => {
      const { rows } = await archiving;
      return comeBack(qc, deckId, rows, done, () =>
        api.restoreCards(done).then((out) => missed(done, changed(out))),
      );
    },
  };
}

/**
 * A card keeps its progress and leaves its section. `undo` puts each card it moved back in this
 * deck and the section it left, or in none when that section has gone since.
 */
export function moveCardsToDeck(qc: QueryClient, deckId: string, cardIds: string[], to: string) {
  const moving = leave(qc, deckId, cardIds, () =>
    api.editCards(cardIds.map((cardId) => ({ cardId, deckId: to }))),
  );
  const back = (ids: string[], section: (id: string) => string | null) =>
    api.editCards(ids.map((cardId) => ({ cardId, deckId, sectionId: section(cardId) })));
  return {
    done: moving.then((m) => m.done),
    undo: async (done: string[]) => {
      const { rows } = await moving;
      const sectionOf = (id: string) => rows.get(id)?.card.sectionId ?? null;
      return comeBack(qc, deckId, rows, done, async () => {
        const out = await back(done, sectionOf);
        const homeless = out.results.flatMap((r) =>
          r.status === "error" && r.code === "not_found" && r.id && sectionOf(r.id) ? [r.id] : [],
        );
        if (homeless.length === 0) return missed(done, changed(out));
        const again = changed(await back(homeless, () => null));
        const loose = new Set(again);
        qc.setQueryData<DeckRow[]>(deckCardsQuery(deckId).queryKey, (prev) =>
          prev?.map((row) =>
            loose.has(row.card.id) ? { ...row, card: { ...row.card, sectionId: null } } : row,
          ),
        );
        return missed(done, [...changed(out), ...again]);
      });
    },
  };
}

/** Shows each card's mark everywhere it is cached, at once, as a single mark's write does. */
const showMarks = (qc: QueryClient, marks: ReadonlyMap<string, boolean>) => {
  for (const [id, important] of marks) showWrite(qc, { kind: "card.important", id, important });
};

/**
 * Sets the learner's own mark on chosen cards, so a member marks too. `undo` gives each card it
 * changed back the mark it had before.
 */
export function markCards(qc: QueryClient, deckId: string, cardIds: string[], mark: boolean) {
  const rows = qc.getQueryData<DeckRow[]>(deckCardsQuery(deckId).queryKey) ?? [];
  const chosen = new Set(cardIds);
  const before = new Map(
    rows.flatMap((r) => (chosen.has(r.card.id) ? [[r.card.id, r.card.important] as const] : [])),
  );
  const was = (id: string) => before.get(id) ?? !mark;
  /** `back` is the mark a card shows again when the server leaves it unchanged. */
  const write = (marks: ReadonlyMap<string, boolean>, back: (id: string) => boolean) => {
    showMarks(qc, marks);
    return api
      .setCardsImportant([...marks].map(([cardId, important]) => ({ cardId, important })))
      .then((out) => {
        // A card the server refused shows the mark it had again.
        const refused = out.results.filter((r) => r.status === "error").map((r) => r.id);
        showMarks(qc, new Map(refused.map((id) => [id, back(id)])));
        const done = out.results.flatMap((r) => (r.status === "updated" ? [r.id] : []));
        if (done.length === 0) throw new Error(NOTHING_CHANGED);
        return done;
      })
      .catch((e: unknown) => {
        showMarks(qc, new Map([...marks.keys()].map((id) => [id, back(id)])));
        throw e;
      })
      .finally(() => void qc.invalidateQueries({ queryKey: ["queue"] }));
  };
  return {
    done: write(new Map(cardIds.map((cardId) => [cardId, mark])), was),
    undo: (done: string[]) =>
      write(new Map(done.map((cardId) => [cardId, was(cardId)])), () => mark).then(
        (back) => missed(done, back),
        (e: unknown) => {
          if (e instanceof Error && e.message === NOTHING_CHANGED) return done;
          throw e;
        },
      ),
  };
}
