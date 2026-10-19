import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { type DeckRow, tagEdits } from "@lymi/client/deck-list";
import { deckCardsQuery } from "@lymi/client/queries";
import { backlogOf } from "@lymi/core/analytics";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TagList, useSuggestedTags, useTagList } from "../capture/tags";
import { useDeckCards } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { captureEvent } from "../telemetry/posthog";
import { Sheet, SheetNote } from "../ui/sheet";
import { toast } from "../ui/toast-host";

type Edit = { cardId: string; tags: string[] };
type Change = { add: string[]; remove: string[] };

/** Shows each card's tags in the deck's list at once, as a save or Undo will leave them. */
const place = (qc: QueryClient, deckId: string, edits: readonly Edit[]) => {
  const key = deckCardsQuery(deckId).queryKey;
  void qc.cancelQueries({ queryKey: key, exact: true });
  const byId = new Map(edits.map((e) => [e.cardId, e.tags]));
  qc.setQueryData<DeckRow[]>(key, (prev) =>
    prev?.map((row) => {
      const tags = byId.get(row.card.id);
      return tags ? { ...row, card: { ...row.card, tags } } : row;
    }),
  );
};

/**
 * Writes the edits; a card the server did not change shows its old tags again. Resolves with the
 * cards that saved, and throws when none did.
 */
async function send(qc: QueryClient, deckId: string, edits: Edit[], undo: Edit[]) {
  place(qc, deckId, edits);
  try {
    const out = await api.editCards(edits);
    const saved = new Set(out.results.flatMap((r) => (r.status === "error" ? [] : [r.id])));
    place(
      qc,
      deckId,
      undo.filter((e) => !saved.has(e.cardId)),
    );
    if (saved.size === 0) throw new Error("none");
    return saved;
  } catch (e) {
    place(qc, deckId, undo);
    throw e;
  } finally {
    // A refetch settles any card the server wrote differently, such as a tag respelled.
    void qc.invalidateQueries({ queryKey: deckCardsQuery(deckId).queryKey, exact: true });
    void qc.invalidateQueries({ queryKey: ["tags"] });
    void qc.invalidateQueries({ queryKey: ["decks", deckId, "tags"] });
  }
}

/** Puts tags on, or takes them off, many of a deck's cards at once, with Undo, as the web's Tags… does. */
function useApplyTags(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const id = `tag-cards-${deckId}`;

  const fullNote = (full: number) =>
    t`${plural(full, { one: "# card", other: "# cards" })} already had 20 tags, so a tag was left off.`;
  const none = (e: unknown, sent: number) =>
    e instanceof Error && e.message === "none"
      ? plural(sent, {
          one: "Couldn’t change the tags on # card.",
          other: "Couldn’t change the tags on # cards.",
        })
      : errorMessage(e);

  /** Undo: sends each card its old tags; cards it leaves as they were get a message and Try again for just those. */
  const revert = (back: Edit[], forward: Edit[]) => {
    toast.close(id);
    const sent = back.length;
    send(qc, deckId, back, forward).then(
      (saved) => {
        const unsaved = sent - saved.size;
        if (unsaved === 0) return;
        const left = (e: Edit) => !saved.has(e.cardId);
        toast.add({
          id,
          error: true,
          title: plural(sent, {
            one: `Couldn’t change the tags on ${unsaved} of # card.`,
            other: `Couldn’t change the tags on ${unsaved} of # cards.`,
          }),
          action: {
            label: t`Try again`,
            onPress: () => revert(back.filter(left), forward.filter(left)),
          },
        });
      },
      (e: unknown) =>
        toast.add({
          id,
          error: true,
          title: none(e, sent),
          action: { label: t`Try again`, onPress: () => revert(back, forward) },
        }),
    );
  };

  const apply = (rows: readonly DeckRow[], change: Change) => {
    const { edits, undo, full } = tagEdits(rows, change);
    // Every chosen card already held twenty, so nothing was sent, which the learner should hear.
    if (edits.length === 0) {
      if (full > 0) toast.add({ id, title: fullNote(full) });
      return;
    }
    const sent = edits.length;
    send(qc, deckId, edits, undo).then(
      (saved) => {
        captureEvent("cards_tagged", {
          cards: backlogOf(saved.size),
          added: change.add.length,
          removed: change.remove.length,
        });
        const unsaved = sent - saved.size;
        if (unsaved > 0) {
          const left = rows.filter((r) => !saved.has(r.card.id));
          toast.add({
            id,
            error: true,
            title: plural(sent, {
              one: `Couldn’t change the tags on ${unsaved} of # card.`,
              other: `Couldn’t change the tags on ${unsaved} of # cards.`,
            }),
            action: { label: t`Try again`, onPress: () => apply(left, change) },
          });
          return;
        }
        const count = saved.size;
        toast.add({
          id,
          title:
            full > 0
              ? t`Changed the tags on ${plural(count, { one: "# card", other: "# cards" })}. ${plural(full, { one: "# card", other: "# cards" })} already had 20 tags, so a tag was left off.`
              : t`Changed the tags on ${plural(count, { one: "# card", other: "# cards" })}`,
          action: {
            label: t`Undo`,
            onPress: () => revert(undo, edits),
          },
        });
      },
      (e: unknown) =>
        toast.add({
          id,
          error: true,
          title: none(e, sent),
          action: { label: t`Try again`, onPress: () => apply(rows, change) },
        }),
    );
  };

  return apply;
}

/**
 * Tags… for a deck's owner, from the deck's selection: `open` with the cards, and render `sheet`.
 * The sheet ticks a tag onto every chosen card or off every one, and ✓ saves.
 */
export function useTagCards(deckId: string) {
  const rows = useDeckCards(deckId).data;
  const apply = useApplyTags(deckId);
  const [open, setOpen] = useState(false);
  // Kept while the sheet closes, so its title does not change on the way out; `key` starts each opening afresh.
  const [picking, setPicking] = useState<{ cardIds: string[]; after?: () => void; key: number }>({
    cardIds: [],
    key: 0,
  });
  const chosen = useMemo(() => {
    const ids = new Set(picking.cardIds);
    return rows?.filter((r) => ids.has(r.card.id)) ?? [];
  }, [rows, picking.cardIds]);
  const suggestions = useSuggestedTags(deckId, open);

  return {
    open: (cardIds: string[], after?: () => void) => {
      setPicking((prev) => ({ cardIds, ...(after ? { after } : {}), key: prev.key + 1 }));
      setOpen(true);
    },
    sheet: (
      <TagCardsSheet
        key={picking.key}
        open={open}
        onOpenChange={setOpen}
        cards={chosen.map((r) => r.card.tags)}
        suggestions={suggestions}
        onSave={(change) => {
          setOpen(false);
          picking.after?.();
          apply(chosen, change);
        }}
      />
    ),
  };
}

function TagCardsSheet({
  open,
  onOpenChange,
  cards,
  suggestions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The chosen cards' tags, each list one card's. */
  cards: readonly (readonly string[])[];
  suggestions: readonly { name: string }[];
  onSave: (change: Change) => void;
}) {
  const { t } = useLingui();
  const online = useOnline();
  const list = useTagList({ cards, suggestions });
  const { total, change } = list.picker;
  const changed = change.add.length + change.remove.length;

  return (
    <Sheet
      title={plural(total, { one: "Tags for # card", other: "Tags for # cards" })}
      open={open}
      onOpenChange={onOpenChange}
      save={{ label: t`Save`, onPress: () => onSave(change), disabled: changed === 0 || !online }}
    >
      <TagList list={list} />
      {!online && <SheetNote>{t`Changing tags needs a connection.`}</SheetNote>}
    </Sheet>
  );
}
