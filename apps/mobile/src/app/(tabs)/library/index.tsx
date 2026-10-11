import type { DeckSummary } from "@lymi/client/api";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { Pressable, View, type ViewStyle } from "react-native";
import { languageName } from "../../../data/languages";
import { standing, useDeckCards, useDecks } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { Plate, RowArrow, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";

/** Library: every deck as a whole-row link. Touch and hold peeks the deck with its actions. */
export default function Library() {
  const decks = useDecks().data ?? [];
  return (
    <Screen title="Library">
      <View className="gap-3">
        {decks.map((d) => (
          <DeckRow key={d.id} deck={d} />
        ))}
      </View>
    </Screen>
  );
}

function DeckRow({ deck: d }: { deck: DeckSummary }) {
  const router = useRouter();
  const p = usePalette();
  const cards = useDeckCards(d.id).data ?? [];
  const known = cards.filter((c) => standing(c.state?.state) === "known").length;
  const language = d.defaultLanguage ? languageName(d.defaultLanguage) : null;
  return (
    <Link href={`/library/${d.id}`} asChild>
      <Link.Trigger>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Plate className="gap-4 p-5">
            <View className="flex-row items-center gap-3">
              <View className="flex-1 gap-0.5">
                <Text className="text-xl font-medium text-text">{d.name}</Text>
                <Text className="text-base text-muted">
                  {language ? `${language} · ${d.total} cards` : `${d.total} cards`}
                </Text>
              </View>
              {d.due > 0 && (
                <View className="h-8 min-w-10 items-center justify-center rounded-full bg-amber-tint px-2.5">
                  <Text className="text-base font-medium text-amber-tint-ink">{d.due}</Text>
                </View>
              )}
              <RowArrow />
            </View>
            <View
              className="h-1.5 overflow-hidden rounded-full bg-plate-2"
              style={{ boxShadow: `inset 0 0 0 1px ${p.edge}` } as ViewStyle}
            >
              <View
                className="h-full rounded-full bg-state-known"
                style={{ width: `${(known / Math.max(1, d.total)) * 100}%` }}
              />
            </View>
            <Text className="text-base text-muted">{known} known</Text>
          </Plate>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction
          title="Review"
          icon="play"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/review?deck=${d.id}`);
          }}
        />
        <Link.MenuAction title="Add a card" icon="plus" onPress={() => router.push("/capture")} />
      </Link.Menu>
    </Link>
  );
}
