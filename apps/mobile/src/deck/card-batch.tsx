import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { archiveCards, markCards, moveCardsToDeck, NOTHING_CHANGED } from "@lymi/client/card-batch";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDecks } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { toast } from "../ui/toast-host";

/**
 * Archive, Move to deck and the important mark for chosen cards, each saying what it did in a toast
 * with Undo, as Move to section does. Plain promises, so Undo still works once the learner has left
 * the deck.
 */
export function useCardBatch(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const id = `card-batch-${deckId}`;
  const cards = (count: number) => plural(count, { one: "# card", other: "# cards" });
  const undo = (run: (ids: string[]) => Promise<string[]>, ids: string[]) => {
    toast.close(id);
    run(ids).then(
      (left) => {
        if (left.length === 0) return;
        const missed = left.length;
        toast.add({
          id,
          error: true,
          title: plural(ids.length, {
            one: `Couldn’t undo ${missed} of # card.`,
            other: `Couldn’t undo ${missed} of # cards.`,
          }),
          action: { label: t`Try again`, onPress: () => undo(run, left) },
        });
      },
      (e: unknown) =>
        toast.add({
          id,
          error: true,
          title: errorMessage(e),
          action: { label: t`Try again`, onPress: () => undo(run, ids) },
        }),
    );
  };
  const failed = (e: unknown, title: string, retry: () => void) =>
    toast.add({
      id,
      error: true,
      title:
        e instanceof Error && e.message === NOTHING_CHANGED ? title : `${title} ${errorMessage(e)}`,
      action: { label: t`Try again`, onPress: retry },
    });

  const archive = (cardIds: string[]) => {
    const archiving = archiveCards(qc, deckId, cardIds);
    return archiving.done.then(
      (done) => {
        const saved = done.length;
        const total = cardIds.length;
        toast.add({
          id,
          title:
            saved < total
              ? plural(total, {
                  one: `Archived ${saved} of # card`,
                  other: `Archived ${saved} of # cards`,
                })
              : t`Archived ${cards(done.length)}`,
          action: {
            label: t`Undo`,
            onPress: () => undo(archiving.undo, done),
          },
        });
      },
      (e) => failed(e, t`Couldn’t archive ${cards(cardIds.length)}.`, () => archive(cardIds)),
    );
  };

  const moveToDeck = (cardIds: string[], to: { id: string; name: string }) => {
    const deckName = to.name;
    const moving = moveCardsToDeck(qc, deckId, cardIds, to.id);
    return moving.done.then(
      (done) => {
        const saved = done.length;
        const total = cardIds.length;
        toast.add({
          id,
          title:
            saved < total
              ? plural(total, {
                  one: `Moved ${saved} of # card to ${deckName}`,
                  other: `Moved ${saved} of # cards to ${deckName}`,
                })
              : t`Moved ${cards(done.length)} to ${deckName}`,
          action: {
            label: t`Undo`,
            onPress: () => undo(moving.undo, done),
          },
        });
      },
      (e) => failed(e, t`Couldn’t move ${cards(cardIds.length)}.`, () => moveToDeck(cardIds, to)),
    );
  };

  /** The learner's own mark, so a member sets it too. Undo gives each card back the mark it had. */
  const important = (cardIds: string[], mark: boolean) => {
    const marking = markCards(qc, deckId, cardIds, mark);
    return marking.done.then(
      (done) => {
        const saved = done.length;
        const total = cardIds.length;
        toast.add({
          id,
          title:
            saved < total
              ? mark
                ? plural(total, {
                    one: `Marked ${saved} of # card important`,
                    other: `Marked ${saved} of # cards important`,
                  })
                : plural(total, {
                    one: `Removed the important mark from ${saved} of # card`,
                    other: `Removed the important mark from ${saved} of # cards`,
                  })
              : mark
                ? plural(done.length, {
                    one: "Marked # card important",
                    other: "Marked # cards important",
                  })
                : plural(done.length, {
                    one: "Removed the important mark from # card",
                    other: "Removed the important mark from # cards",
                  }),
          action: {
            label: t`Undo`,
            onPress: () => undo(marking.undo, done),
          },
        });
      },
      (e) =>
        failed(
          e,
          mark
            ? plural(cardIds.length, {
                one: "Couldn’t mark # card important.",
                other: "Couldn’t mark # cards important.",
              })
            : plural(cardIds.length, {
                one: "Couldn’t remove the important mark from # card.",
                other: "Couldn’t remove the important mark from # cards.",
              }),
          () => important(cardIds, mark),
        ),
    );
  };

  return { archive, moveToDeck, important };
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
