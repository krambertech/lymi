import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import type { DeckRow } from "@lymi/client/deck-list";
import { deckCardsQuery } from "@lymi/client/queries";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDecks } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { toast } from "../ui/toast-host";

type Outcome = { results: { id: string | null; status: string }[] };

const refresh = (qc: QueryClient) =>
  Promise.all(
    ["decks", "series", "queue", "rounds"].map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );

/** The cards a bulk write changed; one that failed stays where it was. */
const changed = (out: Outcome) =>
  out.results.flatMap((r) => (r.status !== "error" && r.id ? [r.id] : []));

/**
 * Takes cards off the deck's list at once, so the list answers the tap, then writes; a failure puts
 * the list back. Resolves with the cards the server changed.
 */
async function leave(
  qc: QueryClient,
  deckId: string,
  cardIds: string[],
  write: () => Promise<Outcome>,
) {
  const key = deckCardsQuery(deckId).queryKey;
  void qc.cancelQueries({ queryKey: key, exact: true });
  const before = qc.getQueryData<DeckRow[]>(key);
  const going = new Set(cardIds);
  qc.setQueryData<DeckRow[]>(key, (prev) => prev?.filter((row) => !going.has(row.card.id)));
  try {
    const done = changed(await write());
    if (done.length === 0) throw new Error("none");
    return done;
  } catch (e) {
    qc.setQueryData(key, before);
    throw e;
  } finally {
    void refresh(qc);
  }
}

/**
 * Archive and Move to deck for chosen cards, each saying what it did in a toast with Undo, as Move
 * to section does. Plain promises, so Undo still works once the learner has left the deck.
 */
export function useCardBatch(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const id = `card-batch-${deckId}`;
  const cards = (count: number) => plural(count, { one: "# card", other: "# cards" });
  const failed = (e: unknown, title: string, retry: () => void) =>
    toast.add({
      id,
      error: true,
      title: e instanceof Error && e.message === "none" ? title : `${title} ${errorMessage(e)}`,
      action: { label: t`Try again`, onPress: retry },
    });

  const archive = (cardIds: string[]) =>
    leave(qc, deckId, cardIds, () => api.archiveCards(cardIds)).then(
      (done) =>
        toast.add({
          id,
          title: t`Archived ${cards(done.length)}`,
          action: {
            label: t`Undo`,
            onPress: () => {
              toast.close(id);
              api
                .restoreCards(done)
                .catch((e) => toast.add({ id, error: true, title: errorMessage(e) }))
                .finally(() => void refresh(qc));
            },
          },
        }),
      (e) => failed(e, t`Couldn’t archive ${cards(cardIds.length)}.`, () => archive(cardIds)),
    );

  const moveToDeck = (cardIds: string[], to: { id: string; name: string }) => {
    const deckName = to.name;
    return leave(qc, deckId, cardIds, () =>
      api.editCards(cardIds.map((cardId) => ({ cardId, deckId: to.id }))),
    ).then(
      (done) =>
        toast.add({
          id,
          title: t`Moved ${cards(done.length)} to ${deckName}`,
          action: {
            label: t`Undo`,
            onPress: () => {
              toast.close(id);
              api
                .editCards(done.map((cardId) => ({ cardId, deckId })))
                .catch((e) => toast.add({ id, error: true, title: errorMessage(e) }))
                .finally(() => void refresh(qc));
            },
          },
        }),
      (e) => failed(e, t`Couldn’t move ${cards(cardIds.length)}.`, () => moveToDeck(cardIds, to)),
    );
  };

  return { archive, moveToDeck };
}

/**
 * Move to deck for chosen cards: `open` with the cards, and render `sheet`. It lists the learner's
 * other decks, and the tap is the choice. A card keeps its progress and leaves its section.
 */
export function useMoveToDeck(deckId: string) {
  const { t } = useLingui();
  const online = useOnline();
  const decks = (useDecks().data ?? []).filter((d) => d.role === "owner" && d.id !== deckId);
  const { moveToDeck } = useCardBatch(deckId);
  const [open, setOpen] = useState(false);
  // Kept while the sheet closes, so its title does not change on the way out.
  const [picking, setPicking] = useState<{ cardIds: string[]; after?: () => void }>({
    cardIds: [],
  });
  const count = picking.cardIds.length;
  return {
    /** Moving needs another deck of the learner's own. */
    canMove: decks.length > 0,
    open: (cardIds: string[], after?: () => void) => {
      setPicking({ cardIds, ...(after ? { after } : {}) });
      setOpen(true);
    },
    sheet: (
      <Sheet
        title={plural(count, { one: "Move # card to", other: "Move # cards to" })}
        description={
          online
            ? t`A card keeps its progress and leaves its section.`
            : t`Moving cards needs a connection.`
        }
        open={open}
        onOpenChange={setOpen}
      >
        <SheetGroup>
          {decks.map((d) => (
            <SheetRow
              key={d.id}
              label={d.name}
              disabled={!online}
              onPress={() => {
                setOpen(false);
                picking.after?.();
                void moveToDeck(picking.cardIds, d);
              }}
            />
          ))}
        </SheetGroup>
      </Sheet>
    ),
  };
}
