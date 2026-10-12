import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { hasShelfPage, type Shelf } from "@lymi/core/catalog";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { shelfAddressName, useCatalogue, useShelfLabel } from "../../../../explore/catalogue";
import { ShelfGrid } from "../../../../explore/layouts";
import { CatalogueFailed, CatalogueLoading } from "../../../../explore/states";
import { usePoolColour } from "../../../../explore/tray";
import { EmptyState } from "../../../../ui/empty-state";
import { Press, Text } from "../../../../ui/primitives";
import { BarButton, Screen } from "../../../../ui/screen";

/** The shelves the site has written a line for; every other shelf takes the template's. */
const LEDES: Record<string, MessageDescriptor> = {
  "languages/german": msg`For a trip, your first lessons, or the Goethe A1 to B1 word lists.`,
  "languages/japanese": msg`For reading kana, a first trip, and JLPT N5 and N4 vocabulary.`,
  "subjects/citizenship": msg`For the German, US, Spanish, Czech and Canadian citizenship tests, with the answers and a short note on each.`,
};

/**
 * One shelf as a page of its own, as lymi.app has: its name and what it is for over a still pool
 * of its colour, every deck on it two by two, then the other shelves of its kind. No card sits in
 * the header, so it never reads as one deck's page. explore.md "Shelf pages".
 */
export default function ExploreShelf() {
  const { t } = useLingui();
  const router = useRouter();
  const { key, name } = useLocalSearchParams<{ key: string; name?: string }>();
  const catalogue = useCatalogue();
  const label = useShelfLabel();
  const shelf = catalogue.shelves.find((s) => s.key === key);
  const address = shelf
    ? `${shelf.language ? "languages" : "subjects"}/${shelfAddressName(shelf)}`
    : key;
  const pool = usePoolColour(shelf ? shelfAddressName(shelf) : key);
  const title = shelf ? label(shelf) : (name ?? "");
  return (
    <Screen
      title={title}
      back={{ label: t`Explore`, to: "/explore" }}
      ground={{ colour: pool, shape: "pool" }}
      header={shelf && <ShelfHeader shelf={shelf} title={title} address={address} />}
      actions={
        <BarButton
          icon="search"
          label={t`Search decks`}
          onPress={() => router.push("/explore-search")}
        />
      }
    >
      {catalogue.failed ? (
        <CatalogueFailed onRetry={catalogue.retry} busy={catalogue.retrying} />
      ) : catalogue.loading ? (
        <CatalogueLoading />
      ) : !shelf ? (
        <EmptyState
          kind="start"
          title={t`This shelf has no decks now`}
          body={t`Its decks may have been withdrawn. Every other shelf is still in Explore.`}
          action={{ label: t`Open Explore`, onPress: () => router.navigate("/explore") }}
        />
      ) : (
        <>
          <ShelfGrid decks={shelf.decks} added={catalogue.added} />
          <OtherShelves shelf={shelf} shelves={catalogue.shelves} />
        </>
      )}
    </Screen>
  );
}

function ShelfHeader({
  shelf,
  title,
  address,
}: {
  shelf: Shelf;
  title: string;
  /** As in the site's address: "languages/german" or "subjects/citizenship". */
  address: string;
}) {
  const { t, i18n } = useLingui();
  const written = LEDES[address];
  // Named as the site names it, so the two apps share the sentence and its translations.
  const name = title;
  const lede = written
    ? i18n._(written)
    : shelf.language
      ? t`Ready-made decks for learning ${name}, written by a person and checked card by card.`
      : t({
          message: `Ready-made ${name} decks, written by a person and checked card by card.`,
          context: "subject shelf",
        });
  const cards = shelf.decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  const deckCount = plural(shelf.decks.length, { one: "# deck", other: "# decks" });
  const cardCount = plural(cards, { one: "# card", other: "# cards" });
  return (
    <View className="gap-3 pb-1 pt-10">
      <Text className="text-5xl font-medium tracking-tight text-text" accessibilityRole="header">
        {title}
      </Text>
      <Text className="text-lg text-text-2">{lede}</Text>
      <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
        {t`${deckCount} · ${cardCount}`}
      </Text>
    </View>
  );
}

/** The other shelves of the same kind that have a page, as chips to move across. */
function OtherShelves({ shelf, shelves }: { shelf: Shelf; shelves: Shelf[] }) {
  const { t } = useLingui();
  const router = useRouter();
  const label = useShelfLabel();
  const languages = !!shelf.language;
  const others = shelves.filter(
    (other) => other !== shelf && !!other.language === languages && hasShelfPage(other),
  );
  if (others.length === 0) return null;
  return (
    <View className="gap-3 border-t border-edge pt-5">
      <Text className="px-1 text-sm text-muted" accessibilityRole="header">
        {languages ? t`More languages` : t`Other subjects`}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {others.map((other) => (
          <Press
            key={other.key}
            onPress={() =>
              router.push({
                pathname: "/explore/shelf/[key]",
                params: { key: other.key, name: label(other) },
              })
            }
            accessibilityRole="link"
            className="h-11 flex-row items-center gap-2 rounded-full bg-plate-2 px-4"
          >
            <Text className="text-base font-medium text-text">{label(other)}</Text>
            <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
              {other.decks.length}
            </Text>
          </Press>
        ))}
      </View>
    </View>
  );
}
