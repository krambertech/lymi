import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { DeckSummary } from "@lymi/client/api";
import { cardSearchQuery } from "@lymi/client/queries";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCardMenu, useMovesAcrossDecks } from "../card/card-menu";
import { CardPeek, peekHeight, usePeekSize } from "../card/card-peek";
import { languageName } from "../data/languages";
import { useDecks } from "../data/queries";
import { useOnline } from "../streak/goal-picker";
import { EmptyState } from "../ui/empty-state";
import { DISMISS_ON_DRAG, KeyboardRoom } from "../ui/keyboard";
import { ListRow } from "../ui/list-row";
import { useLoadFailed } from "../ui/load-failed";
import { Plate, Press, SectionTitle, Text } from "../ui/primitives";
import { RowMenu } from "../ui/row-menu";
import { SearchBar, useSearchText } from "../ui/search-bar";
import { Skeleton } from "../ui/skeleton";

/**
 * Search across Library, from its bar. The field waits at the foot with the keyboard up and the
 * screen above it empty; typing fills it with the decks whose name matches, then the cards whose
 * term, meaning, example or notes do, newest first.
 */
export default function Search() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // A link can open search with its text already in, as `lymi://search?q=…`.
  // A deck's search opens with `?deck=` and looks only in that deck.
  const { q, deck: deckId } = useLocalSearchParams<{ q?: string; deck?: string }>();
  const { text, setText, query } = useSearchText(q);
  const search = useInfiniteQuery({
    ...cardSearchQuery(query, deckId),
    placeholderData: keepPreviousData,
  });
  const allDecks = useDecks().data ?? [];
  const cards = query ? (search.data?.pages.flatMap((page) => page.cards) ?? []) : [];
  // Only the first page knows the whole count, and only when the search is exact.
  const total = search.data?.pages[0]?.total ?? null;
  const more = !!query && search.hasNextPage;
  const needle = query.toLocaleLowerCase(i18n.locale);
  const decks =
    query && !deckId
      ? allDecks.filter((d) => d.name.toLocaleLowerCase(i18n.locale).includes(needle))
      : [];
  const moves = useMovesAcrossDecks(cards.map((c) => c.deckId));
  const cardMenu = useCardMenu(moves);
  const peek = usePeekSize();
  const unread = useLoadFailed(search);
  const failed = !!query && unread;
  const nothing =
    query && !failed && !search.isPending && !more && cards.length === 0 && decks.length === 0;
  const online = useOnline();
  // Matched decks keep the page, so a search that could not reach cards sits in a plate below them.
  const missed = (
    <EmptyState
      kind={online ? "failed" : "offline"}
      size={decks.length > 0 ? "inline" : "page"}
      fill={decks.length === 0}
      title={online ? t`Couldn’t search cards` : t`Searching cards needs a connection`}
      body={
        online
          ? t`Check your connection and try again.`
          : deckId
            ? undefined
            : t`Deck names still match without one.`
      }
      action={{
        label: t`Try again`,
        onPress: () => void search.refetch(),
        busy: search.isFetching,
      }}
    />
  );

  return (
    <View className="flex-1 bg-canvas">
      <KeyboardRoom>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7 px-5 pb-6"
          // Grows to the room above the keyboard, so an empty state centres there and never under it.
          contentContainerStyle={{ paddingTop: insets.top + 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={DISMISS_ON_DRAG}
        >
          {decks.length > 0 && (
            <View>
              <SectionTitle>{t`Decks`}</SectionTitle>
              <Plate className="overflow-hidden">
                {decks.map((d, i) => (
                  <DeckHit key={d.id} deck={d} first={i === 0} />
                ))}
              </Plate>
            </View>
          )}
          {query && search.isPending && !failed && (
            <View className="gap-3">
              <Skeleton height={64} />
              <Skeleton height={64} />
            </View>
          )}
          {cards.length > 0 && (
            <View>
              <SectionTitle
                end={
                  <Text className="text-base text-muted">
                    {total === null && more
                      ? t`More than ${cards.length}`
                      : plural(total ?? cards.length, { one: "# card", other: "# cards" })}
                  </Text>
                }
              >
                {t`Cards`}
              </SectionTitle>
              <Plate className="overflow-hidden">
                {cards.map((c, i) => {
                  const meaning = c.meaning || t`No meaning yet`;
                  return (
                    <RowMenu
                      key={c.id}
                      surface="card_row"
                      href={`/library/card/${c.id}?deck=${c.deckId}` as Href}
                      label={`${c.term}, ${meaning}, ${c.deckName}`}
                      items={cardMenu(c)}
                      preview={{
                        node: <CardPeek card={c} deckName={c.deckName} />,
                        width: peek.width,
                        height: peekHeight(c, peek.width, peek.scale),
                      }}
                    >
                      <View
                        className={`gap-0.5 bg-plate py-3.5 ps-5 pe-4 ${i > 0 ? "border-t border-edge" : ""}`}
                      >
                        <View className="flex-row items-baseline gap-3">
                          <Text className="flex-1 text-md font-medium text-text" numberOfLines={2}>
                            {c.term}
                          </Text>
                          <Text className="max-w-[40%] text-sm text-muted" numberOfLines={1}>
                            {c.deckName}
                          </Text>
                        </View>
                        <Text className="text-base text-text-2" numberOfLines={2}>
                          {meaning}
                        </Text>
                      </View>
                    </RowMenu>
                  );
                })}
              </Plate>
            </View>
          )}
          {/* A page can come back short, or empty, with more after it, so more is offered by the cursor. */}
          {more && (
            <Press
              onPress={() => void search.fetchNextPage()}
              disabled={search.isFetchingNextPage}
              accessibilityRole="button"
              className="h-11 items-center justify-center self-center px-4"
            >
              <Text className="text-md font-medium text-text-2">
                {search.isFetchingNextPage ? t`Loading…` : t`Show more`}
              </Text>
            </Press>
          )}
          {failed &&
            (decks.length > 0 ? (
              <View>
                <SectionTitle>{t`Cards`}</SectionTitle>
                <Plate>{missed}</Plate>
              </View>
            ) : (
              missed
            ))}
          {nothing && (
            <EmptyState
              fill
              kind="noMatch"
              title={deckId ? t`No cards match “${query}”` : t`No decks or cards match “${query}”`}
              body={t`Try another word, or part of one.`}
              action={{ label: t`Clear search`, onPress: () => setText("") }}
            />
          )}
        </ScrollView>
        {moves.sheet}
        <SearchBar
          value={text}
          onChange={setText}
          placeholder={deckId ? t`Search this deck` : t`Search decks and cards`}
          onCancel={() => router.back()}
        />
      </KeyboardRoom>
    </View>
  );
}

function DeckHit({ deck: d, first }: { deck: DeckSummary; first: boolean }) {
  const { t } = useLingui();
  const router = useRouter();
  const language = d.defaultLanguage ? languageName(d.defaultLanguage) : null;
  const size =
    d.total === 0 ? t`No cards yet` : plural(d.total, { one: "# card", other: "# cards" });
  return (
    <ListRow
      first={first}
      title={d.name}
      line={language ? `${language} · ${size}` : size}
      count={d.due > 0 ? d.due : undefined}
      countLabel={plural(d.due, { one: "# card due", other: "# cards due" })}
      end="open"
      onPress={() => router.push(`/library/${d.id}` as Href)}
    />
  );
}
