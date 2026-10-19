import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { type DeckRow, type TagChoice, tagEdits, tagPicker } from "@lymi/client/deck-list";
import { deckCardsQuery, tagsQuery } from "@lymi/client/queries";
import { tagKey } from "@lymi/core";
import { backlogOf } from "@lymi/core/analytics";
import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import { useDeckCards } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { captureEvent } from "../telemetry/posthog";
import { SearchField } from "../ui/menu";
import { Sheet, SheetGroup, SheetNote, SheetRow } from "../ui/sheet";
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

  const apply = (rows: readonly DeckRow[], change: Change) => {
    const { edits, undo, full } = tagEdits(rows, change);
    if (edits.length === 0) return;
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
            onPress: () => {
              toast.close(id);
              send(qc, deckId, undo, edits).catch((e) =>
                toast.add({ id, error: true, title: errorMessage(e) }),
              );
            },
          },
        });
      },
      (e: unknown) =>
        toast.add({
          id,
          error: true,
          title:
            e instanceof Error && e.message === "none"
              ? plural(sent, {
                  one: "Couldn’t change the tags on # card.",
                  other: "Couldn’t change the tags on # cards.",
                })
              : errorMessage(e),
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
  const suggestions = useQuery({ ...tagsQuery, enabled: open }).data;

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
        suggestions={suggestions ?? []}
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
  const { height } = useWindowDimensions();
  const [created, setCreated] = useState<string[]>([]);
  const [choices, setChoices] = useState<ReadonlyMap<string, TagChoice>>(new Map());
  const [query, setQuery] = useState("");
  const picker = tagPicker({ cards, created, suggestions, choices, query });
  const { total, shown, typed, fresh, change } = picker;
  const changed = change.add.length + change.remove.length;
  const set = (name: string, choice: TagChoice) =>
    setChoices((prev) => new Map(prev).set(tagKey(name), choice));
  const create = () => {
    setCreated((prev) => [typed, ...prev]);
    set(typed, "all");
    setQuery("");
  };

  return (
    <Sheet
      title={plural(total, { one: "Tags for # card", other: "Tags for # cards" })}
      description={
        online
          ? t`Tick a tag to put it on every card, or untick it to take it off.`
          : t`Changing tags needs a connection.`
      }
      open={open}
      onOpenChange={onOpenChange}
      save={{ label: t`Save`, onPress: () => onSave(change), disabled: changed === 0 || !online }}
    >
      <SearchField
        label={t`Tags`}
        placeholder={t`Find or create a tag`}
        query={query}
        onChange={setQuery}
        onSubmit={() => {
          // Return creates a new name, or ticks the one tag the letters found.
          const first = shown[0];
          if (fresh) create();
          else if (typed && first) {
            set(first, picker.next(first));
            setQuery("");
          }
        }}
      />
      <ScrollView
        style={{ maxHeight: height * 0.5 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {shown.length > 0 || fresh ? (
          <SheetGroup>
            {shown.map((name) => {
              const choice = picker.choiceOf(name);
              const after = picker.after(name);
              return (
                <SheetRow
                  key={tagKey(name)}
                  label={name}
                  chosen={choice === "mixed" ? "mixed" : choice === "all"}
                  multiple
                  value={total > 1 ? t`${after} of ${total}` : undefined}
                  onPress={() => set(name, picker.next(name))}
                />
              );
            })}
            {fresh && <SheetRow icon="plus" label={t`Create “${typed}”`} onPress={create} />}
          </SheetGroup>
        ) : (
          <SheetNote>{t`No tags yet. Type one to create it.`}</SheetNote>
        )}
      </ScrollView>
    </Sheet>
  );
}
