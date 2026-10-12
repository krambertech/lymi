import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import {
  type Standing,
  standing,
  useDeckCards,
  useDecks,
  useSections,
} from "../../../data/queries";
import { type Palette, usePalette } from "../../../theme/palette";
import type { IconName } from "../../../ui/icons";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { DECK_ACCESSORY } from "../../../ui/tab-bar";

const STATE: Record<Standing, { label: string; icon: IconName; tint: keyof Palette }> = {
  new: { label: "New", icon: "new", tint: "state-new" },
  learning: { label: "Learning", icon: "learning", tint: "state-learning" },
  known: { label: "Known", icon: "known", tint: "state-known" },
};

export default function Deck() {
  const { deck: id } = useLocalSearchParams<{ deck: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const cards = useDeckCards(id);
  const mine = cards.data ?? [];
  const names = new Map(useSections(id).data?.sections.map((s) => [s.id, s.name]));
  const router = useRouter();
  const p = usePalette();
  const due = deck?.due ?? 0;
  const section = (c: (typeof mine)[number]) =>
    (c.card.sectionId && names.get(c.card.sectionId)) || "Unsorted";
  const sections = [...new Set(mine.map(section))];

  return (
    <Screen title={deck?.name ?? "Deck"} back={{ label: "Library", to: "/library" }}>
      <OfflineNote query={cards} />
      {/* From iOS 26 the deck's review rides in the tab bar's accessory instead. */}
      {!DECK_ACCESSORY && due > 0 && (
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
              .filter((c) => section(c) === s)
              .map(({ card: c, state }, i) => {
                const st = STATE[standing(state?.state)];
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
