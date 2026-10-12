import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { exploreDeckQuery } from "@lymi/client/queries";
import { type ExploreDeckOut, publisherAvatarPath } from "@lymi/core/catalog";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, useWindowDimensions, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { API_URL } from "../../../auth/client";
import { useAddDeck } from "../../../explore/catalogue";
import { DeckHand, handOf } from "../../../explore/deck-hand";
import { DeckTile } from "../../../explore/layouts";
import { useCoverColour } from "../../../explore/tray";
import { usePalette } from "../../../theme/palette";
import { GlassSurface } from "../../../ui/glass";
import { OnTheWeb } from "../../../ui/on-the-web";
import { Button, Icon, Plate, Press, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { Skeleton } from "../../../ui/skeleton";

/**
 * A published deck in the app: its cards fanned on its colour, who made it, its name and what it
 * is for, and Add; then what it teaches in order, every card, and More like this. Adding keeps the
 * learner here and the fan gathers under a check. docs/design/explore.md "In the product".
 */
export default function ExploreDeck() {
  const { t } = useLingui();
  const { slug, name } = useLocalSearchParams<{ slug: string; name?: string }>();
  const query = useQuery(exploreDeckQuery(slug));
  const ground = useCoverColour(slug);
  const back = { label: t`Explore`, to: "/explore" as const };

  if (query.isError) {
    return (
      <Screen title={name ?? t`Deck`} back={back}>
        <OnTheWeb
          icon="explore"
          title={t`Couldn’t open this deck`}
          line={t`It may have been withdrawn, or the connection dropped.`}
          action={t`Open on the web`}
          path={`/explore/${encodeURIComponent(slug)}`}
        />
      </Screen>
    );
  }
  if (!query.data) {
    return (
      <Screen
        title={name ?? ""}
        back={back}
        ground={{ colour: ground, shape: "fade" }}
        header={<HeaderSkeleton />}
      >
        <Skeleton height={160} />
      </Screen>
    );
  }
  return <DeckPage data={query.data} ground={ground} back={back} />;
}

function HeaderSkeleton() {
  return (
    <View className="items-center gap-4 pt-2">
      <Skeleton width={200} height={150} />
      <Skeleton width={220} height={28} />
      <Skeleton height={44} />
    </View>
  );
}

type Data = ExploreDeckOut;

function DeckPage({
  data,
  ground,
  back,
}: {
  data: Data;
  ground: string;
  back: { label: string; to: "/explore" };
}) {
  const { t } = useLingui();
  const router = useRouter();
  const { deck, related } = data;
  const [deckId, setDeckId] = useState(data.deckId);
  const add = useAddDeck((_slug, id) => setDeckId(id));
  const sections = deck.sections.filter((section) => section.name !== null);
  const hand = handOf(deck);
  const cards = plural(deck.cardCount, { one: "# card", other: "# cards" });
  const sectionCount = plural(sections.length, { one: "# section", other: "# sections" });

  const header = (
    <View className="items-center gap-5">
      {hand.length > 0 && <DeckHand cards={hand} gathered={!!deckId} ground={ground} />}
      <View className="items-center gap-2.5">
        <View className="flex-row items-center gap-2">
          <PublisherMark slug={deck.slug} name={deck.publisher} avatar={deck.publisherAvatar} />
          <Text className="text-sm text-text-2" style={{ fontVariant: ["tabular-nums"] }}>
            {sections.length > 0
              ? t`By ${deck.publisher} · ${cards} · ${sectionCount}`
              : t`By ${deck.publisher} · ${cards}`}
          </Text>
        </View>
        <Text className="text-center text-2xl font-medium tracking-tight text-text">
          {deck.name}
        </Text>
        <Text className="text-center text-md text-text-2">{deck.summary}</Text>
      </View>
      <View className="self-stretch">
        {deckId ? (
          <Button
            label={t`Open in Library`}
            size="lg"
            onPress={() => router.navigate(`/library/${deckId}`)}
          />
        ) : (
          <Button
            label={t`Add to Library`}
            size="lg"
            icon="plus"
            loading={add.isPending}
            onPress={() => add.mutate({ slug: deck.slug, edition: deck.meaningLanguage })}
          />
        )}
      </View>
    </View>
  );

  return (
    <Screen
      title={deck.name}
      back={back}
      ground={{ colour: ground, shape: "fade" }}
      header={header}
      actionsArrive
      actions={
        <BarAdd
          added={!!deckId}
          busy={add.isPending}
          onAdd={() => add.mutate({ slug: deck.slug, edition: deck.meaningLanguage })}
          onOpen={() => deckId && router.navigate(`/library/${deckId}`)}
        />
      }
    >
      {sections.length > 0 && (
        <View className="gap-3">
          <Text className="px-1 text-lg font-medium text-text" accessibilityRole="header">
            {t`What you learn, in order`}
          </Text>
          <Plate className="overflow-hidden">
            {sections.map((section, at) => (
              <View
                key={section.name}
                className={`min-h-[52px] flex-row items-center gap-3 px-4 py-3 ${at > 0 ? "border-t border-edge" : ""}`}
              >
                <Text className="w-5 text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                  {at + 1}
                </Text>
                <Text className="flex-1 text-md text-text" numberOfLines={1}>
                  {section.name}
                </Text>
                <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                  {plural(section.cards.length, { one: "# card", other: "# cards" })}
                </Text>
              </View>
            ))}
          </Plate>
          <Text className="px-1 text-sm text-muted">
            {t`You start with the first section. The next opens as you learn this one.`}
          </Text>
        </View>
      )}

      <View className="gap-3">
        <Text className="px-1 text-lg font-medium text-text" accessibilityRole="header">
          {t`Every card`}
        </Text>
        <View className="gap-2">
          {deck.sections.map((section) => (
            <SectionCards key={section.name ?? "loose"} section={section} />
          ))}
        </View>
      </View>

      {related.length > 0 && <MoreLikeThis related={related} />}
    </Screen>
  );
}

/**
 * Add, carried into the bar once the header's button has scrolled away: a glass capsule whose plus
 * turns into a check when the deck arrives, and then opens it in Library.
 */
function BarAdd({
  added,
  busy,
  onAdd,
  onOpen,
}: {
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onOpen: () => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <Press
      onPress={added ? onOpen : busy ? undefined : onAdd}
      accessibilityRole="button"
      accessibilityLabel={added ? t`Open in Library` : t`Add to Library`}
      accessibilityState={{ busy }}
    >
      {/* A fresh glass for each state: iOS drops the effect when a live glass view changes shape. */}
      <GlassSurface
        key={added ? "added" : "add"}
        tint="room"
        style={{
          height: 40,
          minWidth: 40,
          borderRadius: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: added ? 0 : 14,
        }}
      >
        {busy ? (
          <ActivityIndicator color={p.text} />
        ) : added ? (
          // Once the deck is in, the bar keeps only the check, so it never crowds the title.
          <Animated.View key="added" entering={ZoomIn.springify().damping(12)}>
            <Icon name="check" size={20} colour={p["state-known"]} strokeWidth={2.75} />
          </Animated.View>
        ) : (
          <Animated.View
            key="add"
            entering={ZoomIn.springify().damping(14)}
            className="flex-row items-center gap-1.5"
          >
            <Icon name="plus" size={18} colour={p.text} strokeWidth={2.5} />
            <Text className="text-base font-medium text-text">{t`Add`}</Text>
          </Animated.View>
        )}
      </GlassSurface>
    </Press>
  );
}

/** A section's cards behind a disclosure: the full list is for checking, so it starts closed. */
function SectionCards({ section }: { section: Data["deck"]["sections"][number] }) {
  const { t } = useLingui();
  const p = usePalette();
  const [open, setOpen] = useState(false);
  return (
    <Plate className="overflow-hidden">
      <Press
        scale={0.99}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="min-h-[52px] flex-row items-center gap-3 px-4 py-3"
      >
        <Text className="flex-1 text-md text-text" numberOfLines={1}>
          {section.name ?? t`Cards outside a section`}
        </Text>
        <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {plural(section.cards.length, { one: "# card", other: "# cards" })}
        </Text>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <Icon name="down" size={18} colour={p.muted} />
        </View>
      </Press>
      {open &&
        section.cards.map((card, at) => (
          <View
            // biome-ignore lint/suspicious/noArrayIndexKey: the deck's order, and a term can repeat.
            key={at}
            className="gap-0.5 border-t border-edge px-4 py-2.5"
          >
            <Text className="text-md text-text">{card.term}</Text>
            {card.meaning && <Text className="text-base text-text-2">{card.meaning}</Text>}
          </View>
        ))}
    </Plate>
  );
}

/** The decks most like this one that are not in Library yet, as a row that swipes sideways. */
function MoreLikeThis({ related }: { related: Data["related"] }) {
  const { t } = useLingui();
  const { width } = useWindowDimensions();
  const tile = Math.round((width - 40 - 12) / 2.15);
  return (
    <View className="gap-3">
      <Text className="px-1 text-lg font-medium text-text" accessibilityRole="header">
        {t`More like this`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {related.map((deck) => (
          <DeckTile key={deck.slug} deck={deck} width={tile} added={false} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Who published the deck: their photo, the app's tile for Lymi, or a letter on a dark plate. */
function PublisherMark({
  slug,
  name,
  avatar,
}: {
  slug: string;
  name: string;
  avatar: string | null;
}) {
  const [failed, setFailed] = useState(false);
  if (avatar && !failed) {
    return (
      <Image
        source={{ uri: `${API_URL}${publisherAvatarPath(slug, avatar)}` }}
        onError={() => setFailed(true)}
        className="size-5 rounded-full"
      />
    );
  }
  if (name.trim().toLowerCase() === "lymi") {
    return (
      <Image source={require("../../../../assets/icon.png")} className="size-5 rounded-[5px]" />
    );
  }
  return (
    <View className="size-5 items-center justify-center rounded-full bg-text">
      <Text className="text-2xs font-semibold text-canvas">
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
