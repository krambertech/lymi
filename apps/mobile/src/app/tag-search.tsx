import { useLingui } from "@lingui/react/macro";
import { isolate } from "@lymi/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tagMatches, useTagManager } from "../deck/tag-manager";
import { EmptyState } from "../ui/empty-state";
import { DISMISS_ON_DRAG, KeyboardRoom } from "../ui/keyboard";
import { Plate, SectionTitle } from "../ui/primitives";
import { SearchBar, useSearchText } from "../ui/search-bar";
import { ToastFloor, ToastHost, ToastScope } from "../ui/toast-host";

const TOASTS = "tag-search";

/**
 * Find a tag, from a deck's Tags page once it holds more than fifteen: the phone's search, its field
 * at the foot and the screen above empty until the first letters, then the matching rows with the
 * same ⋯ as the page. iOS presents it over the root, so it shows its own toasts.
 */
export default function TagSearch() {
  return (
    <ToastScope.Provider value={TOASTS}>
      <Search />
      <ToastHost />
    </ToastScope.Provider>
  );
}

function Search() {
  const { t } = useLingui();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { query, row, archivedRow, sheets } = useTagManager(id);
  const { text, setText, query: find } = useSearchText();
  const tags = find ? (query.data?.tags ?? []).filter((tag) => tagMatches(tag, find)) : [];
  const archived = find ? (query.data?.archived ?? []).filter((tag) => tagMatches(tag, find)) : [];

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
          {tags.length > 0 && (
            <View>
              <SectionTitle>{t`In use`}</SectionTitle>
              <Plate className="overflow-hidden">{tags.map((tag, at) => row(tag, at === 0))}</Plate>
            </View>
          )}
          {archived.length > 0 && (
            <View>
              <SectionTitle>{t`Archived tags`}</SectionTitle>
              <Plate className="overflow-hidden">
                {archived.map((tag, at) => archivedRow(tag, at === 0))}
              </Plate>
            </View>
          )}
          {find && query.data && tags.length === 0 && archived.length === 0 && (
            <EmptyState
              fill
              kind="noMatch"
              title={t`No tags match “${{ query: isolate(find) }}”`}
              body={t`Try another word, or part of one.`}
              action={{ label: t`Clear search`, onPress: () => setText("") }}
            />
          )}
        </ScrollView>
        {sheets}
        <ToastFloor>
          <SearchBar
            value={text}
            onChange={setText}
            placeholder={t`Find a tag`}
            onCancel={() => router.back()}
          />
        </ToastFloor>
      </KeyboardRoom>
    </View>
  );
}
