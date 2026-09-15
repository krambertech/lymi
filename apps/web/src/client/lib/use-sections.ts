import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { SectionArchiveInput } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";
import { api, errorMessage, type Section, type Sections } from "./api";
import type { DeckRow } from "./deck-list";
import { deckCardsQuery, sectionsQuery } from "./queries";

/**
 * Every section write the deck page makes, with the toasts that say what happened. Moves and
 * reorders land in the cache at once, so a dropped card stays where it landed while the write
 * travels, and snap back with an error if it fails.
 */
export function useSectionActions(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const cardsKey = deckCardsQuery(deckId).queryKey;
  const sectionsKey = sectionsQuery(deckId).queryKey;

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["decks"] }),
      qc.invalidateQueries({ queryKey: ["series"] }),
      qc.invalidateQueries({ queryKey: ["queue"] }),
      qc.invalidateQueries({ queryKey: ["rounds"] }),
    ]);

  const failed = (id: string, error: unknown) =>
    toast.add({ id, type: "error", title: errorMessage(error) });

  const create = useMutation({
    mutationFn: (input: { name: string; cardIds?: string[] | undefined }) =>
      api.createSection(deckId, input),
    onSettled: refresh,
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameSection(id, name),
    onSettled: refresh,
  });

  const reorder = useMutation({
    mutationFn: (sectionIds: string[]) => api.reorderSections(deckId, sectionIds),
    onMutate: async (sectionIds) => {
      await qc.cancelQueries({ queryKey: sectionsKey, exact: true });
      const before = qc.getQueryData<Sections>(sectionsKey);
      if (before) {
        const byId = new Map(before.sections.map((s) => [s.id, s]));
        qc.setQueryData<Sections>(sectionsKey, {
          ...before,
          sections: sectionIds.flatMap((id) => byId.get(id) ?? []),
        });
      }
      return () => qc.setQueryData(sectionsKey, before);
    },
    onError: (error, _ids, undo) => {
      undo?.();
      failed("reorder-sections", error);
    },
    onSettled: refresh,
  });

  /** Put cards in a section in the cache, returning where each was so Undo can put it back. */
  const place = async (cardIds: readonly string[], sectionId: string | null) => {
    await qc.cancelQueries({ queryKey: cardsKey, exact: true });
    const before = qc.getQueryData<DeckRow[]>(cardsKey);
    const moving = new Set(cardIds);
    const from = new Map<string, string | null>();
    for (const row of before ?? []) {
      if (moving.has(row.card.id)) from.set(row.card.id, row.card.sectionId);
    }
    qc.setQueryData<DeckRow[]>(cardsKey, (prev) =>
      prev?.map((row) =>
        moving.has(row.card.id) ? { ...row, card: { ...row.card, sectionId } } : row,
      ),
    );
    return { restore: () => qc.setQueryData(cardsKey, before), from };
  };

  const moveCards = useMutation({
    mutationFn: ({ cardIds, sectionId }: MoveInput) =>
      api.moveCardsToSection(deckId, { cardIds, sectionId }),
    onMutate: ({ cardIds, sectionId }) => place(cardIds, sectionId),
    onSuccess: (_r, { cardIds, sectionId, sectionName, term, undoing }, context) => {
      if (undoing) return;
      const id = `move-cards-${deckId}`;
      const count = cardIds.length;
      const title =
        count === 1 && term
          ? sectionId
            ? t`Moved “${term}” to ${sectionName}`
            : t`Took “${term}” out of its section`
          : sectionId
            ? t`Moved ${plural(count, { one: "# card", other: "# cards" })} to ${sectionName}`
            : t`Took ${plural(count, { one: "# card", other: "# cards" })} out of their sections`;
      toast.add({
        id,
        title,
        actionProps: {
          children: t`Undo`,
          onClick: () => {
            toast.close(id);
            // Cards that came from different sections go back to each of them.
            const back = new Map<string | null, string[]>();
            for (const [cardId, was] of context?.from ?? []) {
              back.set(was, [...(back.get(was) ?? []), cardId]);
            }
            for (const [was, ids] of back) {
              moveCards.mutate({ cardIds: ids, sectionId: was, sectionName: "", undoing: true });
            }
          },
        },
      });
    },
    onError: (error, _vars, context) => {
      context?.restore();
      failed("move-cards", error);
    },
    onSettled: refresh,
  });

  const restore = useMutation({
    mutationFn: (section: Pick<Section, "id" | "name">) => api.restoreSection(section.id),
    onSuccess: (_r, section) => toast.close(`archive-section-${section.id}`),
    onError: (error) => failed("restore-section", error),
    onSettled: refresh,
  });

  const archive = useMutation({
    mutationFn: ({ section, cards }: { section: Section } & SectionArchiveInput) =>
      api.archiveSection(section.id, { cards }),
    onSuccess: (_r, { section, cards }) => {
      const sectionName = section.name;
      toast.add({
        id: `archive-section-${section.id}`,
        title:
          cards === "archive" && section.total > 0
            ? t`Archived “${sectionName}” and its cards`
            : t`Archived “${sectionName}”`,
        actionProps: { children: t`Undo`, onClick: () => restore.mutate(section) },
      });
    },
    onError: (error) => failed("archive-section", error),
    onSettled: refresh,
  });

  const start = useMutation({
    mutationFn: ({ section }: { section: Section; opening: number }) =>
      api.startSection(section.id),
    onSuccess: (sections, { section, opening }) => {
      qc.setQueryData(sectionsKey, sections);
      const sectionName = section.name;
      const before = opening - 1;
      toast.add({
        id: `start-section-${section.id}`,
        title:
          before > 0
            ? t`Started ${sectionName} and ${plural(before, { one: "the section before it", other: "the # sections before it" })}`
            : t`Started ${sectionName}`,
      });
    },
    onError: (error) => failed("start-section", error),
    onSettled: refresh,
  });

  return { create, rename, reorder, moveCards, archive, restore, start };
}

interface MoveInput {
  cardIds: string[];
  sectionId: string | null;
  /** For the toast. */
  sectionName: string;
  /** The term, when one card moves. */
  term?: string | undefined;
  /** A move back from Undo, which says nothing of its own. */
  undoing?: boolean | undefined;
}
