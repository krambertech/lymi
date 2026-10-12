import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { DeckSummary } from "@lymi/client/api";
import { cardSearchQuery } from "@lymi/client/queries";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { languageName } from "../data/languages";
import { useDecks } from "../data/queries";
import { KeyboardRoom } from "../ui/keyboard";
import { ListRow } from "../ui/list-row";
import { Plate, Press, SectionTitle, Text } from "../ui/primitives";
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
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { text, setText, query } = useSearchText(q);
  const search = useQuery({ ...cardSearchQuery(query), placeholderData: keepPreviousData });
  const allDecks = useDecks().data ?? [];
  const cards = query ? (search.data?.cards ?? []) : [];
  const needle = query.toLocaleLowerCase(i18n.locale);
  const decks = query
    ? allDecks.filter((d) => d.name.toLocaleLowerCase(i18n.locale).includes(needle))
    : [];
  const nothing = query && !search.isPending && cards.length === 0 && decks.length === 0;

  return (
    <View className="flex-1 bg-canvas">
      <KeyboardRoom>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7 px-5 pb-6"
          contentContainerStyle={{ paddingTop: insets.top + 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
          {query && search.isPending && (
            <View className="gap-3">
              <Skeleton height={64} />
              <Skeleton height={64} />
            </View>
          )}
          {cards.length > 0 && (
            <View>
              <SectionTitle
                end={
                  <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                    {plural(search.data?.total ?? cards.length, {
                      one: "# card",
                      other: "# cards",
                    })}
                  </Text>
                }
              >
                {t`Cards`}
              </SectionTitle>
              <Plate className="overflow-hidden">
                {cards.map((c, i) => {
                  const meaning = c.meaning || t`No meaning yet`;
                  return (
                    <Press
                      key={c.id}
                      scale={0.99}
                      onPress={() => router.push(`/library/${c.deckId}` as Href)}
                      accessibilityRole="link"
                      accessibilityLabel={`${c.term}, ${meaning}, ${c.deckName}`}
                      className={`gap-0.5 py-3.5 ps-5 pe-4 ${i > 0 ? "border-t border-edge" : ""}`}
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
                    </Press>
                  );
                })}
              </Plate>
            </View>
          )}
          {query && search.isError && !search.data && (
            <Text className="px-1 text-base text-muted">
              {t`Searching cards needs a connection. Check it and try again.`}
            </Text>
          )}
          {nothing && !search.isError && (
            <Text className="px-1 text-base text-muted">{t`Nothing matches “${query}”.`}</Text>
          )}
        </ScrollView>
        <SearchBar
          value={text}
          onChange={setText}
          placeholder={t`Search decks and cards`}
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
