import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { chosenReview, type DeckRow } from "@lymi/client/deck-list";
import { CHOSEN_LIMIT } from "@lymi/core";
import { ARRIVE } from "@lymi/design";
import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { springIn, useReduceMotion } from "../theme/motion";
import { useFloatingBar } from "../ui/floating-bar";
import type { MenuItem } from "../ui/menu";
import { setDeckSelecting } from "../ui/tab-bar";
import type { useCardBatch, useMoveToDeck } from "./card-batch";
import type { useMoveToSection } from "./move-to-section";
import { SelectionToolbar } from "./selection";
import type { useTagCards } from "./tag-cards";

/**
 * Select cards on a card list: the chosen cards, the toolbar that floats over the tab bar while
 * choosing, and what can be done to them. A deck page and a section page share it, so both offer
 * the same actions in the same order.
 */
export function useCardSelection({
  deckId,
  scoped = false,
  rows,
  shown,
  owner,
  batch,
  tagCards,
  moveToSection,
  moveToDeck,
}: {
  deckId: string;
  /** A section's page, which shares the deck's id but not its Review accessory. */
  scoped?: boolean;
  /** Every card in the deck, which Review reads the chosen ones from. */
  rows: readonly DeckRow[];
  /** The cards the list shows, in its order, which Select all chooses. */
  shown: readonly DeckRow[];
  owner: boolean;
  batch: ReturnType<typeof useCardBatch>;
  tagCards: ReturnType<typeof useTagCards>;
  moveToSection: ReturnType<typeof useMoveToSection>;
  moveToDeck: ReturnType<typeof useMoveToDeck>;
}) {
  const { t } = useLingui();
  const router = useRouter();
  const reduce = useReduceMotion();
  // The cards chosen with Select cards, or null when the list is not choosing.
  const [selection, setSelected] = useState<ReadonlySet<string> | null>(null);
  const done = useCallback(() => setSelected(null), []);
  // A section's Select cards starts with that section's cards chosen.
  const start = useCallback((ids?: Iterable<string>) => setSelected(new Set(ids)), []);
  const choosing = !!selection;
  // What Review takes from the chosen cards, due ones first, as the web's selection does.
  const reviewable = useMemo(
    () => (selection ? chosenReview(rows, selection, Date.now()) : []),
    [rows, selection],
  );
  const dueChosen = reviewable.filter((r) => r.due).length;
  const reviewChosen = (kind: "due" | "all") => {
    // One review takes at most CHOSEN_LIMIT, and the list is due first, so the cap keeps those.
    const ids = reviewable
      .filter((r) => kind === "all" || r.due)
      .slice(0, CHOSEN_LIMIT)
      .map((r) => r.id);
    done();
    router.push(`/review?deck=${deckId}&cards=${ids.join(",")}` as Href);
  };
  const unmarked = !!selection && rows.some((r) => selection.has(r.card.id) && !r.card.important);
  const limit = CHOSEN_LIMIT;
  const reviewAll = reviewable.length;
  const actions: MenuItem[][] = selection
    ? [
        [
          ...(dueChosen > 0
            ? [
                {
                  label:
                    dueChosen > limit
                      ? t`Review ${limit} of ${dueChosen} due`
                      : plural(dueChosen, { one: "Review # due", other: "Review # due" }),
                  icon: "play" as const,
                  onSelect: () => reviewChosen("due"),
                },
              ]
            : []),
          // Review all is the same list as Review due when every chosen card is due.
          ...(reviewAll > dueChosen
            ? [
                {
                  label:
                    reviewAll > limit
                      ? t`Review ${limit} of ${reviewAll}`
                      : plural(reviewAll, { one: "Review all #", other: "Review all #" }),
                  icon: "play" as const,
                  onSelect: () => reviewChosen("all"),
                },
              ]
            : []),
        ],
        [
          {
            // Its own message, since Ukrainian and Russian say it of several cards.
            label: unmarked
              ? t({ message: "Mark important", context: "chosen cards" })
              : t({ message: "Unmark important", context: "chosen cards" }),
            icon: "important" as const,
            onSelect: () => {
              const ids = [...selection];
              done();
              void batch.important(ids, unmarked);
            },
          },
        ],
        // Changing the cards themselves stays the owner's.
        ...(owner
          ? [
              [
                {
                  label: t`Tags`,
                  icon: "tags" as const,
                  onSelect: () => tagCards.open([...selection], done),
                },
                {
                  label: t`Move to section`,
                  icon: "section" as const,
                  onSelect: () => moveToSection.open([...selection], done),
                },
                ...(moveToDeck.canMove
                  ? [
                      {
                        label: t`Move to deck`,
                        icon: "deck" as const,
                        onSelect: () => moveToDeck.open([...selection], done),
                      },
                    ]
                  : []),
              ],
              [
                {
                  label: t`Archive`,
                  icon: "archive" as const,
                  destructive: true,
                  onSelect: () => {
                    done();
                    void batch.archive([...selection]);
                  },
                },
              ],
            ]
          : []),
      ].filter((group) => group.length > 0)
    : [];
  useEffect(() => {
    if (scoped) return;
    setDeckSelecting(deckId, choosing);
    return () => setDeckSelecting(deckId, false);
  }, [deckId, scoped, choosing]);
  useFloatingBar(
    selection && (
      <Animated.View
        // It slides rather than fades: glass that starts transparent never draws its effect.
        entering={reduce ? undefined : springIn(new SlideInDown(), ARRIVE)}
        exiting={reduce ? undefined : SlideOutDown.duration(200)}
      >
        <SelectionToolbar
          count={selection.size}
          total={shown.length}
          onAll={() => setSelected(new Set(shown.map((r) => r.card.id)))}
          onClear={() => setSelected(new Set())}
          onDone={done}
          actions={actions}
        />
      </Animated.View>
    ),
  );
  const toggle = useCallback(
    (cardId: string) =>
      setSelected((prev) => {
        if (!prev) return prev;
        const next = new Set(prev);
        if (!next.delete(cardId)) next.add(cardId);
        return next;
      }),
    [],
  );
  return { selection, start, toggle };
}
