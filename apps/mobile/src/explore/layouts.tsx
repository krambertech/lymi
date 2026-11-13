import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { exploreDeckQuery } from "@lymi/client/queries";
import { isolate } from "@lymi/core";
import { hasShelfPage, type PublicDeckSummary, type Shelf } from "@lymi/core/catalog";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, Plate, Press, RowArrow, Text } from "../ui/primitives";
import { RowMenu, type RowMenuItem } from "../ui/row-menu";
import { toast } from "../ui/toast-host";
import { shelfAddressName, useAddDeck, useAddFailure, useShelfLabel } from "./catalogue";
import { DeckTray, usePoolColour, useTrayColour } from "./tray";

/** The page's own gutter, which a sideways row bleeds through to the screen's edges. */
const GUTTER = 20;

/** Cards and sections on one line, or that the deck is already in Library. */
export function DeckMeta({ deck, added }: { deck: PublicDeckSummary; added: boolean }) {
  const p = usePalette();
  const { t } = useLingui();
  if (added) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Icon name="check" size={14} colour={p["state-known"]} strokeWidth={2.5} />
        <Text className="text-sm font-medium text-ink-secondary">{t`In Library`}</Text>
      </View>
    );
  }
  const cards = plural(deck.cardCount, { one: "# card", other: "# cards" });
  const sections = plural(deck.sectionCount, { one: "# section", other: "# sections" });
  return (
    <Text className="text-sm text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
      {deck.sectionCount > 0 ? t`${cards} · ${sections}` : cards}
    </Text>
  );
}

const deckHref = (deck: Pick<PublicDeckSummary, "slug" | "name">) =>
  ({ pathname: "/explore/[slug]", params: { slug: deck.slug, name: deck.name } }) as const;

export function useOpenDeck() {
  const router = useRouter();
  return (deck: Pick<PublicDeckSummary, "slug" | "name">) => router.push(deckHref(deck));
}

/**
 * A deck's long-press menu in Explore: its page peeks, and the menu adds it to Library, or opens
 * it there once it is in. Adding needs a connection, and says so when there is none.
 */
function useDeckMenu() {
  const { t } = useLingui();
  const router = useRouter();
  const failure = useAddFailure();
  const add = useAddDeck(() => undefined);
  return (deck: PublicDeckSummary, deckId: string | undefined): RowMenuItem[] => {
    const name = deck.name;
    const openInLibrary = (id: string) => router.navigate(`/library/${id}` as Href);
    return deckId
      ? [
          {
            id: "open",
            label: t`Open in Library`,
            icon: "library",
            onSelect: () => openInLibrary(deckId),
          },
        ]
      : [
          {
            id: "add_to_library",
            label: t`Add to Library`,
            icon: "plus",
            onSelect: () =>
              add.mutate(
                { slug: deck.slug, edition: deck.meaningLanguage },
                {
                  onSuccess: ({ deckId: id }) =>
                    toast.add({
                      id: `add-deck-${deck.slug}`,
                      title: t`Added “${{ name: isolate(name) }}” to Library`,
                      action: { label: t`Open`, onPress: () => openInLibrary(id) },
                    }),
                  onError: (e) => toast.add({ error: true, title: failure(e) }),
                },
              ),
          },
        ];
  };
}

/** Starts reading a deck's page as the finger lands, so it is often there by the time it opens. */
export function useWarmDeck() {
  const qc = useQueryClient();
  return (slug: string) => void qc.prefetchQuery(exploreDeckQuery(slug));
}

/** A deck as a shelf shows it: its card in a tray, its name, and its counts. */
export function DeckTile({
  deck,
  width,
  added,
  deckId,
}: {
  deck: PublicDeckSummary;
  width: number;
  added: boolean;
  /** The learner's copy, once it is in Library. */
  deckId?: string | undefined;
}) {
  const warm = useWarmDeck();
  const menu = useDeckMenu();
  return (
    <View style={{ width }}>
      <RowMenu
        surface="explore_deck"
        href={deckHref(deck)}
        onPressIn={() => warm(deck.slug)}
        label={deck.name}
        preview="page"
        items={menu(deck, deckId)}
      >
        <View className="gap-2.5 bg-canvas">
          <DeckTray deck={deck} cw={width * 0.7} />
          <View className="gap-0.5 px-0.5">
            <Text className="text-md font-medium leading-snug text-ink" numberOfLines={2}>
              {deck.name}
            </Text>
            <DeckMeta deck={deck} added={added} />
          </View>
        </View>
      </RowMenu>
    </View>
  );
}

/** A shelf's heading, with the way to its page when it has one and its count when it has not. */
function ShelfHeader({ shelf }: { shelf: Shelf }) {
  const p = usePalette();
  const { t } = useLingui();
  const label = useShelfLabel()(shelf);
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xl font-medium text-ink" accessibilityRole="header" numberOfLines={1}>
        {label}
      </Text>
      {hasShelfPage(shelf) ? (
        <Press
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
          <Text className="text-base font-medium text-ink-secondary">{t`See all`}</Text>
          <Text className="text-base text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {shelf.decks.length}
          </Text>
          <Icon name="forward" size={18} colour={p["ink-muted"]} strokeWidth={2.5} />
        </Press>
      ) : (
        <Text className="text-base text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {plural(shelf.decks.length, { one: "# deck", other: "# decks" })}
        </Text>
      )}
    </View>
  );
}

interface ShelvesProps {
  shelves: Shelf[];
  added: Record<string, string>;
}

/** Every shelf as a row that swipes sideways, two decks and a bit in view, as the App Store's do. */
export function ShelfRows({ shelves, added }: ShelvesProps) {
  const { width } = useWindowDimensions();
  const tile = Math.round((width - GUTTER * 2 - 12) / 2.15);
  return (
    <View className="gap-9">
      {shelves.map((shelf) => (
        <View key={shelf.key} className="gap-3">
          <ShelfHeader shelf={shelf} />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={tile + 12}
            snapToAlignment="start"
            style={{ marginHorizontal: -GUTTER }}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}
          >
            {shelf.decks.slice(0, 10).map((deck) => (
              <DeckTile
                key={deck.slug}
                deck={deck}
                width={tile}
                added={!!added[deck.slug]}
                deckId={added[deck.slug]}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

/** Every deck on one shelf, two by two: a filtered Explore and a shelf's own page. */
export function ShelfGrid({
  decks,
  added,
}: {
  decks: PublicDeckSummary[];
  added: Record<string, string>;
}) {
  const { width } = useWindowDimensions();
  const tile = (width - GUTTER * 2 - 12) / 2;
  return (
    <View className="flex-row flex-wrap" style={{ gap: 12, rowGap: 24 }}>
      {decks.map((deck) => (
        <DeckTile
          key={deck.slug}
          deck={deck}
          width={tile}
          added={!!added[deck.slug]}
          deckId={added[deck.slug]}
        />
      ))}
    </View>
  );
}

/** A tray in miniature for a list: the deck's hue with the edge of a card tucked into it. */
function TrayMark({ slug }: { slug: string }) {
  const p = usePalette();
  return (
    <View
      className="h-12 w-14 items-center overflow-hidden rounded-md pt-2"
      style={{ backgroundColor: useTrayColour(slug) }}
    >
      <View
        className="h-12 w-9 gap-1 rounded-sm border border-edge px-1.5 pt-2"
        style={{ backgroundColor: p.plate }}
      >
        <View className="h-1 w-5 rounded-full bg-edge-strong" />
        <View className="h-1 w-3 rounded-full bg-edge-strong" />
      </View>
    </View>
  );
}

/** Decks as one plate of rows, for search results: the tray in miniature, name, shelf and counts. */
export function DeckList({
  decks,
  added,
  shelfOf,
}: {
  decks: PublicDeckSummary[];
  added: Record<string, string>;
  shelfOf: (deck: PublicDeckSummary) => string;
}) {
  const { t } = useLingui();
  const warm = useWarmDeck();
  const menu = useDeckMenu();
  return (
    <Plate className="overflow-hidden">
      {decks.map((deck, i) => (
        <RowMenu
          key={deck.slug}
          surface="explore_deck"
          href={deckHref(deck)}
          onPressIn={() => warm(deck.slug)}
          label={deck.name}
          preview="page"
          items={menu(deck, added[deck.slug])}
        >
          <View
            className={`flex-row items-center gap-3.5 bg-plate py-3 ps-3 pe-4 ${i > 0 ? "border-t border-edge" : ""}`}
          >
            <TrayMark slug={deck.slug} />
            <View className="flex-1 gap-0.5">
              <Text className="text-md font-medium text-ink" numberOfLines={2}>
                {deck.name}
              </Text>
              <Text className="text-sm text-ink-muted" numberOfLines={1}>
                {added[deck.slug] ? t`${shelfOf(deck)} · In Library` : shelfOf(deck)}
              </Text>
            </View>
            <RowArrow />
          </View>
        </RowMenu>
      ))}
    </Plate>
  );
}

export function useOpenShelf() {
  const router = useRouter();
  const label = useShelfLabel();
  return (shelf: Shelf) =>
    hasShelfPage(shelf)
      ? router.push({
          pathname: "/explore/shelf/[key]",
          params: { key: shelf.key, name: label(shelf) },
        })
      : router.navigate({ pathname: "/explore", params: { shelf: shelf.key } });
}

function ShelfMark({ shelf }: { shelf: Shelf }) {
  const p = usePalette();
  return (
    <View
      className="size-12 items-center justify-center rounded-md"
      style={{ backgroundColor: usePoolColour(shelfAddressName(shelf)) }}
    >
      <Icon name="section" size={20} colour={p["ink-secondary"]} />
    </View>
  );
}

/** Shelves as one plate of rows, for search: the shelf's colour, its name and how many decks. */
export function ShelfList({ shelves }: { shelves: Shelf[] }) {
  const label = useShelfLabel();
  const open = useOpenShelf();
  return (
    <Plate className="overflow-hidden">
      {shelves.map((shelf, i) => (
        <Press
          key={shelf.key}
          scale={0.99}
          onPress={() => open(shelf)}
          accessibilityRole="link"
          accessibilityLabel={label(shelf)}
          className={`flex-row items-center gap-3.5 py-3 ps-3 pe-4 ${i > 0 ? "border-t border-edge" : ""}`}
        >
          <ShelfMark shelf={shelf} />
          <View className="flex-1 gap-0.5">
            <Text className="text-md font-medium text-ink">{label(shelf)}</Text>
            <Text className="text-sm text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
              {plural(shelf.decks.length, { one: "# deck", other: "# decks" })}
            </Text>
          </View>
          <RowArrow />
        </Press>
      ))}
    </Plate>
  );
}
