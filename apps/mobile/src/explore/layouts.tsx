import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { hasShelfPage, type PublicDeckSummary, type Shelf } from "@lymi/core/catalog";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { Button, Icon, Plate, Press, Text } from "../ui/primitives";
import { useShelfLabel } from "./catalogue";
import { DeckTray } from "./tray";

export interface LayoutProps {
  shelves: Shelf[];
  added: Record<string, string>;
  imageBase: string;
  onAdd: (deck: PublicDeckSummary) => void;
  adding: string | undefined;
}

/** The page's own gutter, which a sideways row bleeds through to the screen's edges. */
const GUTTER = 20;

function DeckMeta({
  deck,
  added,
  small,
}: {
  deck: PublicDeckSummary;
  added: boolean;
  small?: boolean;
}) {
  const p = usePalette();
  const { t } = useLingui();
  const size = small ? "text-sm" : "text-base";
  if (added) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Icon name="check" size={small ? 14 : 16} colour={p["state-known"]} strokeWidth={2.5} />
        <Text className={`${size} font-medium text-text-2`}>{t`In Library`}</Text>
      </View>
    );
  }
  const cards = plural(deck.cardCount, { one: "# card", other: "# cards" });
  const sections = plural(deck.sectionCount, { one: "# section", other: "# sections" });
  return (
    <Text className={`${size} text-muted`} style={{ fontVariant: ["tabular-nums"] }}>
      {deck.sectionCount > 0 ? `${cards} · ${sections}` : cards}
    </Text>
  );
}

function useOpen() {
  const router = useRouter();
  return (deck: PublicDeckSummary) =>
    router.push({ pathname: "/explore/[slug]", params: { slug: deck.slug, name: deck.name } });
}

/** A shelf's heading, with the way to its page when it has one and its count when it has not. */
function ShelfHeader({ shelf }: { shelf: Shelf }) {
  const p = usePalette();
  const { t } = useLingui();
  const label = useShelfLabel()(shelf);
  const router = useRouter();
  const page = hasShelfPage(shelf);
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xl font-medium text-text" accessibilityRole="header" numberOfLines={1}>
        {label}
      </Text>
      {page ? (
        <Press
          scale={0.97}
          onPress={() =>
            router.push({
              pathname: "/explore/shelf/[key]",
              params: { key: shelf.key, name: label },
            })
          }
          accessibilityRole="link"
          accessibilityLabel={t`See all ${label} decks`}
          className="-me-1 h-11 flex-row items-center gap-1 ps-2"
        >
          <Text className="text-base font-medium text-text-2">{t`See all`}</Text>
          <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {shelf.decks.length}
          </Text>
          <Icon name="forward" size={18} colour={p.muted} strokeWidth={2.5} />
        </Press>
      ) : (
        <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {plural(shelf.decks.length, { one: "# deck", other: "# decks" })}
        </Text>
      )}
    </View>
  );
}

// A. Each shelf is a row that swipes sideways, as the App Store's are, two decks and a bit in view.

export function SwipeRows({ shelves, added, imageBase }: LayoutProps) {
  const { width } = useWindowDimensions();
  const open = useOpen();
  const tile = Math.round((width - GUTTER * 2 - 12) / 2.15);
  return (
    <View className="gap-9">
      {shelves.map((shelf) => (
        <View key={shelf.key} className="gap-3">
          <ShelfHeader shelf={shelf} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={tile + 12}
            snapToAlignment="start"
            style={{ marginHorizontal: -GUTTER }}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}
          >
            {shelf.decks.slice(0, 10).map((deck) => (
              <Press
                key={deck.slug}
                scale={0.98}
                onPress={() => open(deck)}
                accessibilityRole="link"
                accessibilityLabel={deck.name}
                style={{ width: tile }}
                className="gap-2.5"
              >
                <DeckTray deck={deck} cw={tile * 0.7} imageBase={imageBase} />
                <View className="gap-0.5 px-0.5">
                  <Text className="text-md font-medium leading-snug text-text" numberOfLines={2}>
                    {deck.name}
                  </Text>
                  <DeckMeta deck={deck} added={!!added[deck.slug]} small />
                </View>
              </Press>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

// B. One shelf at a time: the shelves as chips, the chosen one's decks as the web's tiles, Add and all.

export function OneShelf({ shelves, added, imageBase, onAdd, adding }: LayoutProps) {
  const { t } = useLingui();
  const label = useShelfLabel();
  const open = useOpen();
  const p = usePalette();
  const [key, setKey] = useState(shelves[0]?.key);
  const shelf = shelves.find((s) => s.key === key) ?? shelves[0];
  if (!shelf) return null;
  return (
    <View className="gap-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -GUTTER }}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }}
        accessibilityRole="tablist"
        accessibilityLabel={t`Shelves`}
      >
        {shelves.map((s) => {
          const on = s.key === shelf.key;
          return (
            <Press
              key={s.key}
              onPress={() => setKey(s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className={`h-10 flex-row items-center gap-1.5 rounded-full px-4 ${on ? "bg-text" : "bg-plate-2"}`}
            >
              <Text className={`text-base font-medium ${on ? "text-canvas" : "text-text"}`}>
                {label(s)}
              </Text>
              <Text
                className="text-sm"
                style={{ color: on ? `${p.canvas}99` : p.muted, fontVariant: ["tabular-nums"] }}
              >
                {s.decks.length}
              </Text>
            </Press>
          );
        })}
      </ScrollView>
      <View className="gap-4">
        {shelf.decks.map((deck) => {
          const isAdded = !!added[deck.slug];
          return (
            <Plate key={deck.slug} className="overflow-hidden">
              <Press
                scale={0.98}
                onPress={() => open(deck)}
                accessibilityRole="link"
                accessibilityLabel={deck.name}
              >
                <DeckTray deck={deck} cw={150} imageBase={imageBase} flush />
                <View className="gap-1 px-4 pt-4">
                  <Text className="text-xl font-medium text-text">{deck.name}</Text>
                  <Text className="text-base text-text-2" numberOfLines={2}>
                    {deck.summary}
                  </Text>
                  {!isAdded && <DeckMeta deck={deck} added={false} small />}
                </View>
              </Press>
              <View className="flex-row px-4 pb-4 pt-3.5">
                {isAdded ? (
                  <DeckMeta deck={deck} added small />
                ) : (
                  <Button
                    label={t`Add`}
                    icon="plus"
                    size="sm"
                    loading={adding === deck.slug}
                    onPress={() => onAdd(deck)}
                  />
                )}
              </View>
            </Plate>
          );
        })}
      </View>
    </View>
  );
}

// C. Two by two: every shelf shows its first four decks in a grid, and See all leads to the rest.

export function TwoByTwo({ shelves, added, imageBase }: LayoutProps) {
  const { width } = useWindowDimensions();
  const open = useOpen();
  const tile = (width - GUTTER * 2 - 12) / 2;
  return (
    <View className="gap-9">
      {shelves.map((shelf) => (
        <View key={shelf.key} className="gap-3">
          <ShelfHeader shelf={shelf} />
          <View className="flex-row flex-wrap" style={{ gap: 12, rowGap: 20 }}>
            {shelf.decks.slice(0, 4).map((deck) => (
              <Press
                key={deck.slug}
                scale={0.98}
                onPress={() => open(deck)}
                accessibilityRole="link"
                accessibilityLabel={deck.name}
                style={{ width: tile }}
                className="gap-2.5"
              >
                <DeckTray deck={deck} cw={tile * 0.68} imageBase={imageBase} />
                <View className="gap-0.5 px-0.5">
                  <Text className="text-md font-medium leading-snug text-text" numberOfLines={2}>
                    {deck.name}
                  </Text>
                  <DeckMeta deck={deck} added={!!added[deck.slug]} small />
                </View>
              </Press>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
