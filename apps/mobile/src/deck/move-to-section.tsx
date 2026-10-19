import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Section } from "@lymi/client/api";
import type { DeckRow } from "@lymi/client/deck-list";
import { deckCardsQuery, sectionsQuery } from "@lymi/client/queries";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDeckCards, useSections } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { toast } from "../ui/toast-host";

type Target = Pick<Section, "id" | "name"> | null;

const refresh = (qc: QueryClient) =>
  Promise.all(
    ["decks", "series", "queue", "rounds"].map((key) => qc.invalidateQueries({ queryKey: [key] })),
  );

/**
 * Moves cards in the cache at once, so the list answers the tap, then on the server; a failure puts
 * the list back. Resolves with the section each card came from, for Undo.
 */
async function move(qc: QueryClient, deckId: string, cardIds: string[], sectionId: string | null) {
  const key = deckCardsQuery(deckId).queryKey;
  void qc.cancelQueries({ queryKey: key, exact: true });
  const before = qc.getQueryData<DeckRow[]>(key);
  const moving = new Set(cardIds);
  const from = new Map<string, string | null>();
  for (const row of before ?? []) {
    if (moving.has(row.card.id)) from.set(row.card.id, row.card.sectionId);
  }
  qc.setQueryData<DeckRow[]>(key, (prev) =>
    prev?.map((row) =>
      moving.has(row.card.id) ? { ...row, card: { ...row.card, sectionId } } : row,
    ),
  );
  try {
    qc.setQueryData(
      sectionsQuery(deckId).queryKey,
      await api.moveCardsToSection(deckId, { cardIds, sectionId }),
    );
    return from;
  } catch (e) {
    qc.setQueryData(key, before);
    throw e;
  } finally {
    void refresh(qc);
  }
}

/**
 * Moves cards to a section, or out of theirs, and says so in a toast with Undo, as the web does.
 * Plain promises rather than a mutation, so Undo still works once the learner has left the page.
 */
export function useMoveCards(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const id = `move-cards-${deckId}`;

  const undo = (from: Map<string, string | null>) => {
    toast.close(id);
    // Cards that came from different sections go back to each of them.
    const back = new Map<string | null, string[]>();
    for (const [cardId, was] of from) back.set(was, [...(back.get(was) ?? []), cardId]);
    for (const [was, ids] of back) {
      move(qc, deckId, ids, was).catch((e) =>
        toast.add({ id, error: true, title: errorMessage(e) }),
      );
    }
  };

  const run = (cardIds: string[], section: Target, term?: string) => {
    const sectionId = section?.id ?? null;
    const sectionName = section?.name ?? "";
    const count = cardIds.length;
    const one = count === 1 && term;
    move(qc, deckId, cardIds, sectionId).then(
      (from) =>
        toast.add({
          id,
          title: one
            ? sectionId
              ? t`Moved “${term}” to ${sectionName}`
              : t`Took “${term}” out of its section`
            : sectionId
              ? t`Moved ${plural(count, { one: "# card", other: "# cards" })} to ${sectionName}`
              : t`Took ${plural(count, { one: "# card", other: "# cards" })} out of their sections`,
          action: { label: t`Undo`, onPress: () => undo(from) },
        }),
      () =>
        toast.add({
          id,
          error: true,
          title: one
            ? t`Couldn’t move “${term}”.`
            : t`Couldn’t move ${plural(count, { one: "# card", other: "# cards" })}.`,
          action: { label: t`Try again`, onPress: () => run(cardIds, section, term) },
        }),
    );
  };

  return run;
}

/**
 * Move to section for a deck's owner, from the deck's selection or a card's menu: `open` with the
 * cards, and render `sheet`. The sheet lists the deck's sections and No section, and the tap is the
 * choice; cards already where they are going stay out of the move.
 */
export function useMoveToSection(deckId: string) {
  const sections = useSections(deckId).data?.sections ?? [];
  const rows = useDeckCards(deckId).data;
  const run = useMoveCards(deckId);
  const [open, setOpen] = useState(false);
  // Kept while the sheet closes, so its title does not change on the way out.
  const [picking, setPicking] = useState<{ cardIds: string[]; after?: () => void }>({
    cardIds: [],
  });
  const chosen = rows?.filter((r) => picking.cardIds.includes(r.card.id)) ?? [];
  const first = chosen[0]?.card.sectionId ?? null;
  const current = chosen.every((r) => r.card.sectionId === first) ? first : undefined;
  const term = picking.cardIds.length === 1 ? chosen[0]?.card.term : undefined;

  const pick = (section: Target) => {
    setOpen(false);
    picking.after?.();
    const to = section?.id ?? null;
    const moving = chosen.filter((r) => r.card.sectionId !== to).map((r) => r.card.id);
    if (moving.length) run(moving, section, moving.length === 1 ? term : undefined);
  };

  return {
    /** Moving needs somewhere to move to. */
    canMove: sections.length > 0,
    open: (cardIds: string[], after?: () => void) => {
      setPicking({ cardIds, ...(after ? { after } : {}) });
      setOpen(true);
    },
    sheet: (
      <MoveToSectionSheet
        open={open}
        onOpenChange={setOpen}
        sections={sections}
        count={picking.cardIds.length}
        term={term}
        current={current}
        onPick={pick}
      />
    ),
  };
}

function MoveToSectionSheet({
  open,
  onOpenChange,
  sections,
  count,
  term,
  current,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  count: number;
  term: string | undefined;
  /** The section every chosen card is in now, null for none, or undefined when they differ. */
  current: string | null | undefined;
  onPick: (section: Target) => void;
}) {
  const { t } = useLingui();
  const online = useOnline();
  const choose = (section: Target) => {
    if (online) onPick(section);
  };
  return (
    <Sheet
      title={
        term && count === 1
          ? t`Move “${term}” to`
          : plural(count, { one: "Move # card to", other: "Move # cards to" })
      }
      description={online ? t`Cards keep their progress.` : t`Moving cards needs a connection.`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetGroup>
        {sections.map((s) => (
          <SheetRow
            key={s.id}
            label={s.name}
            chosen={current === s.id}
            disabled={!online}
            onPress={() => choose(s)}
          />
        ))}
        <SheetRow
          label={t`No section`}
          chosen={current === null}
          disabled={!online}
          onPress={() => choose(null)}
        />
      </SheetGroup>
    </Sheet>
  );
}
