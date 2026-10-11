import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { DECKS } from "../../../data/demo";
import { type Card, useStore } from "../../../data/store";
import { type Palette, usePalette } from "../../../theme/palette";
import type { IconName } from "../../../ui/icons";
import { Button, Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";

const STATE: Record<Card["state"], { label: string; icon: IconName; tint: keyof Palette }> = {
  new: { label: "New", icon: "new", tint: "state-new" },
  learning: { label: "Learning", icon: "learning", tint: "state-learning" },
  known: { label: "Known", icon: "known", tint: "state-known" },
};

export default function Deck() {
  const { deck: id } = useLocalSearchParams<{ deck: string }>();
  const { cards } = useStore();
  const router = useRouter();
  const p = usePalette();
  const deck = DECKS.find((d) => d.id === id);
  const mine = cards.filter((c) => c.deck === id);
  const due = mine.filter((c) => c.due).length;
  const sections = [...new Set(mine.map((c) => c.section ?? "Unsorted"))];

  return (
    <Screen title={deck?.name ?? "Deck"} kind="page" back="Library">
      {due > 0 && (
        <Button
          label={`Review ${due} due`}
          variant="primary"
          size="xl"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/review?deck=${id}`);
          }}
        />
      )}
      {sections.map((s) => (
        <View key={s}>
          <SectionTitle>{s}</SectionTitle>
          <Plate className="overflow-hidden">
            {mine
              .filter((c) => (c.section ?? "Unsorted") === s)
              .map((c, i) => {
                const st = STATE[c.state];
                return (
                  <View
                    key={c.id}
                    className={`flex-row items-center gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-edge" : ""}`}
                  >
                    <View className="flex-1 gap-0.5">
                      <Text className="text-lg font-medium text-text">{c.term}</Text>
                      <Text className="text-base text-muted" numberOfLines={1}>
                        {c.meaning || "No meaning yet"}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5" accessibilityLabel={st.label}>
                      <Icon name={st.icon} size={16} colour={p[st.tint]} />
                      <Text className="text-base text-text-2">{st.label}</Text>
                    </View>
                  </View>
                );
              })}
          </Plate>
        </View>
      ))}
    </Screen>
  );
}
