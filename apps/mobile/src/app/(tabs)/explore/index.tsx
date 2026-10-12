import { useLingui } from "@lingui/react/macro";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAddDeck, useCatalogue } from "../../../explore/catalogue";
import { OneShelf, SwipeRows, TwoByTwo } from "../../../explore/layouts";
import { Button, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { Segmented } from "../../../ui/segmented";
import { Skeleton } from "../../../ui/skeleton";

type Layout = "rows" | "shelf" | "grid";
const LAYOUTS = { rows: SwipeRows, shelf: OneShelf, grid: TwoByTwo };

/** Explore: every deck Lymi publishes, a shelf per language and then per subject. explore.md. */
export default function Explore() {
  const { t } = useLingui();
  const catalogue = useCatalogue();
  const { layout: asked, skip } = useLocalSearchParams<{ layout?: Layout; skip?: string }>();
  const [layout, setLayout] = useState<Layout>(asked ?? "rows");
  useEffect(() => {
    if (asked) setLayout(asked);
  }, [asked]);
  const add = useAddDeck(catalogue.sample, (slug) => catalogue.markAdded(slug));
  const Shelves = LAYOUTS[layout];
  return (
    <Screen title={t`Explore`} kind="tab">
      <View className="gap-4">
        <Text className="text-base text-text-2">
          {t`Ready-made decks from Lymi. Add one to study it in your language.`}
        </Text>
        {__DEV__ && (
          <Segmented
            label="Prototype layout"
            value={layout}
            onChange={setLayout}
            options={[
              { value: "rows", label: "A · Rows" },
              { value: "shelf", label: "B · Shelf" },
              { value: "grid", label: "C · Grid" },
            ]}
          />
        )}
      </View>
      {catalogue.failed ? (
        <View className="items-start gap-3">
          <Text className="text-md text-text">{t`Couldn’t load Explore`}</Text>
          <Button label={t`Try again`} size="sm" onPress={catalogue.retry} />
        </View>
      ) : catalogue.loading ? (
        <View className="gap-3">
          <Skeleton width={160} height={28} />
          <Skeleton height={144} />
        </View>
      ) : (
        <Shelves
          shelves={catalogue.shelves.slice(Number(skip ?? 0))}
          added={catalogue.added}
          imageBase={catalogue.imageBase}
          adding={add.isPending ? add.variables?.slug : undefined}
          onAdd={(deck) => add.mutate({ slug: deck.slug, edition: deck.meaningLanguage })}
        />
      )}
    </Screen>
  );
}
