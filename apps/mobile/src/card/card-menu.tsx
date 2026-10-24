import { useLingui } from "@lingui/react/macro";
import { type Card, errorMessage, type Sections } from "@lymi/client/api";
import { sectionsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { canPlayPronunciation, isolate } from "@lymi/core";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useDecks, useSections } from "../data/queries";
import { useMoveToDeck } from "../deck/card-batch";
import { useMoveToSection } from "../deck/move-to-section";
import { useAiConsent } from "../privacy/ai-consent";
import { usePronunciation } from "../review/pronounce";
import type { RowMenuItem } from "../ui/row-menu";
import { toast } from "../ui/toast-host";

/** Refetches every list that counts a card, after it is archived or restored. */
export function useRefreshCards() {
  const qc = useQueryClient();
  return () => {
    for (const key of [["decks"], ["cards"], ["queue"]]) {
      void qc.invalidateQueries({ queryKey: key });
    }
  };
}

/** Archives a card and says so in a toast with Undo, as archiving from its page and in review do. */
export function useArchiveCard() {
  const { t } = useLingui();
  const refresh = useRefreshCards();
  return async (card: Pick<Card, "id" | "term">) => {
    const { id, term } = card;
    try {
      await writes.archiveCard(id);
      refresh();
      toast.add({
        id: `archive-card-${id}`,
        title: t`Card archived`,
        action: {
          label: t`Undo`,
          onPress: () =>
            void writes
              .restoreCard(id)
              .then(refresh)
              .catch((e) => toast.add({ error: true, title: errorMessage(e) })),
        },
      });
    } catch {
      toast.add({ error: true, title: t`Couldn’t archive “${{ term: isolate(term) }}”.` });
    }
  };
}

/** Plays any card's pronunciation from a list, through one player; a failure says why in a toast. */
function usePlayAny() {
  const { t } = useLingui();
  const router = useRouter();
  const consent = useAiConsent("speech");
  const [asked, setAsked] = useState<{ card: Card } | null>(null);
  const pronounce = usePronunciation(asked?.card ?? null);
  const play = pronounce?.play;
  // A fresh object on every ask, so the same card plays again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: plays once per ask, not per render
  useEffect(() => {
    if (asked) play?.();
  }, [asked]);
  const error = pronounce?.error;
  useEffect(() => {
    if (error) toast.add({ error: true, title: error });
  }, [error]);
  return (card: Card) => {
    // A list has no room for the ask, so it points to where the learner can allow AI.
    if (card.userId === consent.userId && !card.audioKey && !consent.allowed) {
      toast.add({
        title: t`Allow AI services in You to hear this word.`,
        action: { label: t`Open You`, onPress: () => router.navigate("/you") },
      });
      return;
    }
    setAsked({ card });
  };
}

interface CardMenuOptions {
  /** Only the deck's owner edits, moves or archives a card; a member reads it. #581. */
  owner: (card: Card) => boolean;
  /** Set where the card's sections can be chosen. */
  moveToSection?: ((card: Card) => (() => void) | null) | undefined;
  /** Set where the learner has another deck of their own to move the card to. */
  moveToDeck?: ((card: Card) => (() => void) | null) | undefined;
}

/**
 * A card's long-press menu, in the order its page's ⋯ has: play, important, edit and move, then
 * archive on its own.
 */
export function useCardMenu({ owner, moveToSection, moveToDeck }: CardMenuOptions) {
  const { t } = useLingui();
  const router = useRouter();
  const play = usePlayAny();
  const archive = useArchiveCard();
  return (card: Card): RowMenuItem[][] => {
    const owns = owner(card);
    const toSection = owns ? moveToSection?.(card) : null;
    const toDeck = owns ? moveToDeck?.(card) : null;
    return [
      [
        ...(canPlayPronunciation(card)
          ? [
              {
                id: "play" as const,
                label: t`Play pronunciation`,
                icon: "pronunciation" as const,
                onSelect: () => play(card),
              },
            ]
          : []),
        {
          id: "important",
          label: card.important ? t`Unmark important` : t`Mark important`,
          icon: "important",
          onSelect: () => void writes.setImportant(card, !card.important),
        },
        ...(owns
          ? [
              {
                id: "edit" as const,
                label: t`Edit card`,
                icon: "edit" as const,
                onSelect: () =>
                  router.push({
                    pathname: "/edit-card",
                    params: { card: card.id, deck: card.deckId, field: "term" },
                  }),
              },
            ]
          : []),
      ],
      [
        ...(toSection
          ? [
              {
                id: "move_section" as const,
                label: t`Move to section…`,
                icon: "section" as const,
                onSelect: toSection,
              },
            ]
          : []),
        ...(toDeck
          ? [
              {
                id: "move_deck" as const,
                label: t`Move to deck…`,
                icon: "deck" as const,
                onSelect: toDeck,
              },
            ]
          : []),
      ],
      owns
        ? [
            {
              id: "archive",
              label: t`Archive card`,
              icon: "archive",
              destructive: true,
              onSelect: () => void archive(card),
            },
          ]
        : [],
    ];
  };
}

type Moving = { deckId: string; cardId: string; to: "section" | "deck"; at: number };

/** Opens one deck's move sheet for one card, then stays until the next move replaces it. */
function MoveSheet({ deckId, cardId, to }: Moving) {
  const toSection = useMoveToSection(deckId);
  const toDeck = useMoveToDeck(deckId);
  const sections = useSections(deckId).data;
  const ready = to === "deck" || !!sections;
  // biome-ignore lint/correctness/useExhaustiveDependencies: opens once, when its sections are in
  useEffect(() => {
    if (ready) (to === "section" ? toSection : toDeck).open([cardId]);
  }, [ready]);
  return to === "section" ? toSection.sheet : toDeck.sheet;
}

/**
 * Moving cards from a list that spans decks, such as search: which cards can move where, and the
 * sheet for the one being moved. The deck page has its own, for its one deck.
 */
export function useMovesAcrossDecks(deckIds: readonly string[]) {
  const decks = useDecks().data ?? [];
  const owned = new Set(decks.filter((d) => d.role === "owner").map((d) => d.id));
  const sections = useQueries({
    queries: [...new Set(deckIds)]
      .filter((id) => owned.has(id))
      .map((id) => ({ ...sectionsQuery(id), select: (s: Sections) => [id, s.sections.length] })),
  });
  const withSections = new Set(
    sections.flatMap((q) => (q.data && (q.data[1] as number) > 0 ? [q.data[0] as string] : [])),
  );
  const [moving, setMoving] = useState<Moving | null>(null);
  const move = (card: Card, to: Moving["to"]) => () =>
    setMoving({ deckId: card.deckId, cardId: card.id, to, at: Date.now() });
  return {
    owner: (card: Card) => owned.has(card.deckId),
    moveToSection: (card: Card) => (withSections.has(card.deckId) ? move(card, "section") : null),
    // Another deck of the learner's own to move it to.
    moveToDeck: (card: Card) => (owned.size > 1 ? move(card, "deck") : null),
    sheet: moving && <MoveSheet key={`${moving.cardId}-${moving.at}`} {...moving} />,
  };
}
