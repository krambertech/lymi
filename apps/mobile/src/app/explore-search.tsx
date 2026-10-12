import { useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCatalogue, useCatalogueSearch, useShelfLabel } from "../explore/catalogue";
import { DeckList, ShelfList } from "../explore/layouts";
import { CatalogueFailed, CatalogueLoading } from "../explore/states";
import { KeyboardRoom } from "../ui/keyboard";
import { SectionTitle, Text } from "../ui/primitives";
import { SearchBar, useSearchText } from "../ui/search-bar";

/**
 * Search Explore, from its bar. The field waits at the foot with the keyboard up and the screen
 * above it empty; the catalogue is already on the phone, so shelves whose name matches, then
 * decks, fill in as the words are typed.
 */
export default function ExploreSearch() {
  const { t } = useLingui();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const catalogue = useCatalogue();
  const label = useShelfLabel();
  // A link can open search with its text already in, as `lymi://explore-search?q=…`.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { text, setText } = useSearchText(q);
  const query = text.trim();
  const { shelves, decks: hits } = useCatalogueSearch(catalogue.shelves, query);
  const shelfOf = useMemo(() => {
    const at = new Map<string, string>();
    for (const shelf of catalogue.shelves)
      for (const deck of shelf.decks) at.set(deck.slug, label(shelf));
    return (deck: PublicDeckSummary) => at.get(deck.slug) ?? "";
  }, [catalogue.shelves, label]);

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
          {query && catalogue.failed ? (
            <CatalogueFailed onRetry={catalogue.retry} busy={catalogue.retrying} />
          ) : query && catalogue.loading ? (
            <CatalogueLoading />
          ) : null}
          {query &&
            !catalogue.loading &&
            !catalogue.failed &&
            hits.length === 0 &&
            shelves.length === 0 && (
              <Text className="px-1 text-base text-muted">
                {t`No decks match “${query}”. Try a word from a card, or a language.`}
              </Text>
            )}
          {shelves.length > 0 && (
            <View>
              <SectionTitle>{t`Shelves`}</SectionTitle>
              <ShelfList shelves={shelves} />
            </View>
          )}
          {hits.length > 0 && (
            <View>
              <SectionTitle>{t`Decks`}</SectionTitle>
              <DeckList decks={hits} added={catalogue.added} shelfOf={shelfOf} />
            </View>
          )}
        </ScrollView>
        <SearchBar
          value={text}
          onChange={setText}
          placeholder={t`Search decks`}
          onCancel={() => router.back()}
        />
      </KeyboardRoom>
    </View>
  );
}
