import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { CardHit, DeckSummary } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import { type UseQueryResult, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Alert, View } from "react-native";
import { useArchivedCards, useArchivedDecks } from "../../../data/queries";
import { EmptyState } from "../../../ui/empty-state";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, Press, SectionTitle, Text } from "../../../ui/primitives";
import { Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Skeleton } from "../../../ui/skeleton";

type Item = { kind: "deck"; deck: DeckSummary } | { kind: "card"; card: CardHit };

const idOf = (item: Item) => (item.kind === "deck" ? item.deck.id : item.card.id);

/**
 * Archived decks and cards, each restored where it stands. A restored row keeps its place with
 * Undo until the page is left, as the web's toast offers Undo, so a mistaken tap is one tap back.
 */
export default function Archived() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const decks = useArchivedDecks();
  const cards = useArchivedCards();
  const [restored, setRestored] = useState<ReadonlyMap<string, Item>>(() => new Map());
  // Where each row first stood, so one restored here keeps its place while the lists drop it.
  const order = useRef(new Map<string, number>());

  const hold = (item: Item, on: boolean) =>
    setRestored((m) => {
      const next = new Map(m);
      if (on) next.set(idOf(item), item);
      else next.delete(idOf(item));
      return next;
    });
  const act = async (item: Item, restore: boolean) => {
    const id = idOf(item);
    hold(item, restore);
    try {
      if (item.kind === "deck") await (restore ? writes.restoreDeck(id) : writes.archiveDeck(id));
      else await (restore ? writes.restoreCard(id) : writes.archiveCard(id));
      // A restore moves an item between every list that counts it, so all of them refetch.
      for (const key of [["decks"], ["cards"], ["series"], ["queue"]]) {
        void qc.invalidateQueries({ queryKey: key });
      }
    } catch (e) {
      hold(item, !restore);
      Alert.alert(t`Couldn’t save that.`, e instanceof Error ? e.message : undefined);
    }
  };

  const items = (kind: Item["kind"]): Item[] => {
    const listed: Item[] =
      kind === "deck"
        ? (decks.data ?? []).map((deck) => ({ kind, deck }))
        : (cards.data?.pages ?? [])
            .flatMap((page) => page.cards)
            .map((card) => ({ kind: "card" as const, card }));
    const ids = new Set(listed.map(idOf));
    const held = [...restored.values()].filter((i) => i.kind === kind && !ids.has(idOf(i)));
    for (const i of listed)
      if (!order.current.has(idOf(i))) order.current.set(idOf(i), order.current.size);
    const at = (i: Item) => order.current.get(idOf(i)) ?? 0;
    return [...listed, ...held].sort((a, b) => at(a) - at(b));
  };
  const deckItems = items("deck");
  const cardItems = items("card");

  // Each list loads and fails on its own, so one that failed is never read as empty.
  const decksFailed = useLoadFailed(decks);
  const cardsFailed = useLoadFailed(cards as unknown as UseQueryResult);
  const empty = !!decks.data && !!cards.data && deckItems.length === 0 && cardItems.length === 0;

  const row = (item: Item) => {
    const back = restored.has(idOf(item));
    const title = item.kind === "deck" ? item.deck.name : item.card.term;
    const line =
      item.kind === "deck"
        ? plural(item.deck.total, { one: "# card", other: "# cards" })
        : item.card.deckName;
    return (
      <View key={idOf(item)} className="min-h-14 flex-row items-center gap-3 py-2.5 ps-5 pe-3">
        <View className="flex-1 gap-0.5">
          <Text
            className={`text-md font-medium ${back ? "text-muted" : "text-text"}`}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="text-base text-muted" numberOfLines={1}>
            {back ? t`Restored` : line}
          </Text>
        </View>
        <Press
          onPress={() => void act(item, !back)}
          accessibilityRole="button"
          accessibilityLabel={back ? t`Undo restoring ${title}` : t`Restore ${title}`}
          className="h-11 justify-center px-2"
        >
          <Text className="text-base font-medium text-text-2">{back ? t`Undo` : t`Restore`}</Text>
        </Press>
      </View>
    );
  };

  return (
    <Screen title={t`Archived`} back={{ label: t`Library`, to: "/library" }}>
      <OfflineNote query={cards} />
      {decks.isPending && cards.isPending ? (
        <Skeleton height={160} />
      ) : empty ? (
        <EmptyState
          kind="start"
          icon="archive"
          title={t`Nothing archived`}
          body={t`Archived decks and cards wait here, out of your reviews, until you restore them.`}
        />
      ) : (
        <>
          {(deckItems.length > 0 || !decks.data) && (
            <View>
              <SectionTitle>{t`Decks`}</SectionTitle>
              {decksFailed ? (
                <LoadFailed
                  query={decks}
                  size="inline"
                  failed={t`Couldn’t load archived decks`}
                  offline={t`Archived decks need a connection`}
                />
              ) : decks.data ? (
                <Rows>{deckItems.map(row)}</Rows>
              ) : (
                <Skeleton height={56} />
              )}
            </View>
          )}
          {(cardItems.length > 0 || !cards.data) && (
            <View className="gap-3">
              <SectionTitle>{t`Cards`}</SectionTitle>
              {cardsFailed ? (
                <LoadFailed
                  query={cards as unknown as UseQueryResult}
                  size="inline"
                  failed={t`Couldn’t load archived cards`}
                  offline={t`Archived cards need a connection`}
                />
              ) : cards.data ? (
                <Rows>{cardItems.map(row)}</Rows>
              ) : (
                <Skeleton height={56} />
              )}
              {cards.hasNextPage && (
                <Button
                  label={cards.isFetchNextPageError ? t`Try again` : t`Show more`}
                  variant="secondary"
                  loading={cards.isFetchingNextPage}
                  onPress={() => void cards.fetchNextPage()}
                />
              )}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
