import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useLocalSearchParams } from "expo-router";
import { useCatalogue, useShelfLabel } from "../../../../explore/catalogue";
import { ShelfGrid } from "../../../../explore/layouts";
import { Text } from "../../../../ui/primitives";
import { Screen } from "../../../../ui/screen";

/** Every deck on one shelf, two by two, under the shelf's name. explore.md "Shelf pages". */
export default function ExploreShelf() {
  const { t } = useLingui();
  const { key, name } = useLocalSearchParams<{ key: string; name?: string }>();
  const catalogue = useCatalogue();
  const label = useShelfLabel();
  const shelf = catalogue.shelves.find((s) => s.key === key);
  return (
    <Screen
      title={shelf ? label(shelf) : (name ?? t`Shelf`)}
      back={{ label: t`Explore`, to: "/explore" }}
    >
      {shelf && (
        <>
          <Text className="-mt-4 text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {plural(shelf.decks.length, { one: "# deck", other: "# decks" })}
          </Text>
          <ShelfGrid decks={shelf.decks} added={catalogue.added} imageBase={catalogue.imageBase} />
        </>
      )}
    </Screen>
  );
}
