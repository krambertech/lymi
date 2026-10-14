import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Shelf } from "@lymi/core/catalog";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useCatalogue, useShelfLabel } from "../../../explore/catalogue";
import { ShelfGrid, ShelfRows } from "../../../explore/layouts";
import { CatalogueEmpty, CatalogueFailed, CatalogueLoading } from "../../../explore/states";
import { Press, Text } from "../../../ui/primitives";
import { BarGroup, Screen } from "../../../ui/screen";
import { Sheet, SheetGroup, SheetHeading, SheetRow } from "../../../ui/sheet";

/**
 * Explore: every deck Lymi publishes, a shelf per language and then per subject, each a row that
 * swipes sideways. The bar's filter narrows the page to one shelf; search opens its own screen.
 * docs/design/explore.md.
 */
export default function Explore() {
  const { t } = useLingui();
  const router = useRouter();
  const catalogue = useCatalogue();
  const label = useShelfLabel();
  // A link can open Explore on one shelf, as `lymi://explore?shelf=language-de`.
  const { shelf: linked } = useLocalSearchParams<{ shelf?: string }>();
  const [filter, setFilter] = useState<string | undefined>(linked);
  useEffect(() => setFilter(linked), [linked]);
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<string | null | undefined>();
  const shelf = catalogue.shelves.find((s) => s.key === filter);

  return (
    <Screen
      title={t`Explore`}
      kind="tab"
      actions={
        <BarGroup
          items={[
            {
              icon: "filter",
              label: t`Show one shelf`,
              on: !!shelf,
              onPress: () => setChoosing(true),
            },
            {
              icon: "search",
              label: t`Search decks`,
              onPress: () => router.push("/explore-search"),
            },
          ]}
        />
      }
    >
      {catalogue.failed ? (
        <CatalogueFailed onRetry={catalogue.retry} busy={catalogue.retrying} />
      ) : catalogue.loading ? (
        <CatalogueLoading />
      ) : shelf ? (
        <View className="gap-4">
          <FilterLine shelf={shelf} label={label(shelf)} onClear={() => setFilter(undefined)} />
          <ShelfGrid decks={shelf.decks} added={catalogue.added} />
        </View>
      ) : catalogue.shelves.length === 0 ? (
        <CatalogueEmpty onLibrary={() => router.navigate("/library")} />
      ) : (
        <ShelfRows shelves={catalogue.shelves} added={catalogue.added} />
      )}
      <ShelfPicker
        open={choosing}
        onOpenChange={setChoosing}
        shelves={catalogue.shelves}
        current={shelf?.key}
        label={label}
        onChoose={(key) => {
          setChosen(key);
          setChoosing(false);
        }}
        // The page changes once the sheet has gone, so nothing moves under it. phone.md "Components".
        onDismiss={() => {
          if (chosen !== undefined) setFilter(chosen ?? undefined);
          setChosen(undefined);
        }}
      />
    </Screen>
  );
}

/** Which shelf the page shows, with the way back to every shelf. */
function FilterLine({
  shelf,
  label,
  onClear,
}: {
  shelf: Shelf;
  label: string;
  onClear: () => void;
}) {
  const { t } = useLingui();
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1 gap-0.5">
        <Text className="text-xl font-medium text-text" accessibilityRole="header">
          {label}
        </Text>
        <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {plural(shelf.decks.length, { one: "# deck", other: "# decks" })}
        </Text>
      </View>
      <Press onPress={onClear} accessibilityRole="button" className="h-11 justify-center ps-2">
        <Text className="text-base font-medium text-text-2">{t`All shelves`}</Text>
      </Press>
    </View>
  );
}

/**
 * The shelves as a choice list: every shelf first, then the subjects, which are few, and the
 * languages under the fold, where dragging the sheet up reaches them.
 */
function ShelfPicker({
  open,
  onOpenChange,
  shelves,
  current,
  label,
  onChoose,
  onDismiss,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shelves: Shelf[];
  current: string | undefined;
  label: (shelf: Shelf) => string;
  onChoose: (key: string | null) => void;
  onDismiss: () => void;
}) {
  const { t } = useLingui();
  const languages = shelves.filter((s) => s.language);
  const subjects = shelves.filter((s) => !s.language);
  const row = (s: Shelf) => (
    <SheetRow
      key={s.key}
      label={label(s)}
      detail={plural(s.decks.length, { one: "# deck", other: "# decks" })}
      chosen={current === s.key}
      onPress={() => onChoose(s.key)}
    />
  );
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={onDismiss}
      title={t`Show`}
      more={
        <>
          <SheetHeading>{t`Languages`}</SheetHeading>
          <SheetGroup>{languages.map(row)}</SheetGroup>
        </>
      }
    >
      <SheetGroup>
        <SheetRow label={t`Every shelf`} chosen={!current} onPress={() => onChoose(null)} />
      </SheetGroup>
      <SheetHeading>{t`Subjects`}</SheetHeading>
      <SheetGroup>{subjects.map(row)}</SheetGroup>
    </Sheet>
  );
}
