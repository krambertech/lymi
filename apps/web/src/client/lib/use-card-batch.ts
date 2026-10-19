import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { archiveCards, markCards, moveCardsToDeck, NOTHING_CHANGED } from "@lymi/client/card-batch";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { errorMessage } from "./api";

let batches = 0;

/**
 * Archive, Move to deck and the important mark for a deck's chosen cards, each saying what it did
 * in a toast with Undo, as the phone's selection does. Plain promises, so Undo still works once the
 * learner has left the deck.
 */
export function useCardBatch(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  // Base UI merges a repeated id into the toast already up, so each batch's toast, and its Undo, gets its own.
  const next = () => `card-batch-${deckId}-${++batches}`;
  const failed = (id: string, e: unknown, title: string, retry: () => void) =>
    toast.add({
      id,
      type: "error",
      title,
      description:
        e instanceof Error && e.message === NOTHING_CHANGED ? undefined : errorMessage(e),
      actionProps: {
        children: t`Try again`,
        onClick: () => {
          toast.close(id);
          retry();
        },
      },
    });
  /** Runs an Undo; cards it could not bring back get their own message and Try again for just those. */
  const undo = (id: string, run: (ids: string[]) => Promise<string[]>, ids: string[]) => {
    toast.close(id);
    run(ids).then(
      (left) => {
        if (left.length === 0) return;
        const missed = left.length;
        toast.add({
          id,
          type: "error",
          title: plural(ids.length, {
            one: `Couldn’t undo ${missed} of # card.`,
            other: `Couldn’t undo ${missed} of # cards.`,
          }),
          actionProps: { children: t`Try again`, onClick: () => undo(id, run, left) },
        });
      },
      (e: unknown) =>
        toast.add({
          id,
          type: "error",
          title: errorMessage(e),
          actionProps: { children: t`Try again`, onClick: () => undo(id, run, ids) },
        }),
    );
  };

  const archive = (cardIds: string[]) => {
    const id = next();
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
              : t`Archived ${plural(saved, { one: "# card", other: "# cards" })}`,
          actionProps: {
            children: t`Undo`,
            onClick: () => undo(id, archiving.undo, done),
          },
        });
      },
      (e) =>
        failed(
          id,
          e,
          t`Couldn’t archive ${plural(cardIds.length, { one: "# card", other: "# cards" })}.`,
          () => archive(cardIds),
        ),
    );
  };

  const moveToDeck = (cardIds: string[], to: { id: string; name: string }) => {
    const id = next();
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
              : t`Moved ${plural(saved, { one: "# card", other: "# cards" })} to ${deckName}`,
          actionProps: {
            children: t`Undo`,
            onClick: () => undo(id, moving.undo, done),
          },
        });
      },
      (e) =>
        failed(
          id,
          e,
          t`Couldn’t move ${plural(cardIds.length, { one: "# card", other: "# cards" })}.`,
          () => moveToDeck(cardIds, to),
        ),
    );
  };

  /** The learner's own mark, so a member sets it too. Undo gives each card back the mark it had. */
  const important = (cardIds: string[], mark: boolean) => {
    const id = next();
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
                ? plural(saved, {
                    one: "Marked # card important",
                    other: "Marked # cards important",
                  })
                : plural(saved, {
                    one: "Removed the important mark from # card",
                    other: "Removed the important mark from # cards",
                  }),
          actionProps: {
            children: t`Undo`,
            onClick: () => undo(id, marking.undo, done),
          },
        });
      },
      (e) =>
        failed(
          id,
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
