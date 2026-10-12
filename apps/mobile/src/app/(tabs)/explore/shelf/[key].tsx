import { useLingui } from "@lingui/react/macro";
import { useLocalSearchParams } from "expo-router";
import { useAddDeck, useCatalogue } from "../../../../explore/catalogue";
import { OneShelf } from "../../../../explore/layouts";
import { Screen } from "../../../../ui/screen";

/** Every deck on one shelf, as the web's shelf page lists them. */
export default function ExploreShelf() {
  const { t } = useLingui();
  const { key, name } = useLocalSearchParams<{ key: string; name?: string }>();
  const catalogue = useCatalogue();
  const add = useAddDeck(catalogue.sample, (slug) => catalogue.markAdded(slug));
  const shelf = catalogue.shelves.filter((s) => s.key === key);
  return (
    <Screen title={name ?? t`Shelf`} back={{ label: t`Explore`, to: "/explore" }}>
      <OneShelf
        shelves={shelf}
        added={catalogue.added}
        imageBase={catalogue.imageBase}
        adding={add.isPending ? add.variables?.slug : undefined}
        onAdd={(deck) => add.mutate({ slug: deck.slug, edition: deck.meaningLanguage })}
      />
    </Screen>
  );
}
