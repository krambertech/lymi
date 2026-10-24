import { useLingui } from "@lingui/react/macro";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { useDecks } from "../../../data/queries";
import { useTagManager } from "../../../deck/tag-manager";
import { EmptyState } from "../../../ui/empty-state";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { SEARCHED_PAST } from "../../../ui/menu";
import { Plate, SectionTitle } from "../../../ui/primitives";
import { BarButton, Screen } from "../../../ui/screen";
import { Skeleton } from "../../../ui/skeleton";

/**
 * A deck's tags, for its owner, as the web's Tags page: each in use with its count and its commands
 * in its ⋯, then the archived ones with Restore. Past fifteen, Find a tag opens the phone's search.
 */
export default function DeckTagsPage() {
  const { t } = useLingui();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const { query, row, archivedRow, sheets } = useTagManager(id);
  const loadFailed = useLoadFailed(query);
  const back = {
    label: deck?.name ?? t`Deck settings`,
    to: `/library/deck-settings?id=${id}` as Href,
  };
  const title = t`Tags`;

  if (!query.data) {
    return (
      <Screen title={title} back={back}>
        {loadFailed ? (
          <LoadFailed
            query={query}
            failed={t`Couldn’t load tags`}
            offline={t`Tags need a connection`}
          />
        ) : (
          <Skeleton height={160} />
        )}
      </Screen>
    );
  }

  const { tags, archived } = query.data;
  const nothing = tags.length === 0 && archived.length === 0;
  return (
    <Screen
      title={title}
      back={back}
      description={
        nothing ? undefined : t`The tags on this deck’s cards. Changes here stay in this deck.`
      }
      onRefresh={() => query.refetch()}
      actions={
        tags.length + archived.length > SEARCHED_PAST && (
          <BarButton
            icon="search"
            label={t`Find a tag`}
            onPress={() => router.push(`/tag-search?id=${id}` as Href)}
          />
        )
      }
    >
      {nothing ? (
        <EmptyState
          kind="start"
          icon="tags"
          title={t`No tags yet`}
          body={t`Tags you put on this deck’s cards show here, to rename, merge or archive.`}
        />
      ) : (
        <>
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
        </>
      )}
      {sheets}
    </Screen>
  );
}
