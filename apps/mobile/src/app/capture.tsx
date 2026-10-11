import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Switch, TextInput, View } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DECKS } from "../data/demo";
import { useStore } from "../data/store";
import { usePalette } from "../theme/palette";
import { useFontFamily } from "../ui/font";
import { Button, Icon, Text } from "../ui/primitives";
import { Segmented } from "../ui/segmented";

/** Capture: a word while the lesson is fresh. The term is the only field you must fill. */
export default function Capture() {
  const { addCard } = useStore();
  const router = useRouter();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [deck, setDeck] = useState(DECKS[0]?.id ?? "");
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [enrich, setEnrich] = useState(true);
  const [error, setError] = useState(false);
  const meaningRef = useRef<TextInput>(null);
  const termFont = useFontFamily(true);
  const bodyFont = useFontFamily(false);
  const keyboard = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - insets.bottom) }],
  }));

  const save = () => {
    if (!term.trim()) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    addCard({ term: term.trim(), meaning: meaning.trim(), deck });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View className="flex-1 bg-canvas px-5 pt-6" style={{ paddingBottom: insets.bottom + 12 }}>
      <View className="flex-row items-center justify-between pb-4">
        <Text className="text-2xl font-medium text-text" accessibilityRole="header">
          Add a word
        </Text>
      </View>

      <Segmented
        label="Deck"
        value={deck}
        options={DECKS.map((d) => ({ value: d.id, label: d.name }))}
        onChange={setDeck}
      />

      <View className="gap-2.5 pt-4">
        <View
          className={`rounded-lg border bg-plate px-4 pb-3 pt-2.5 ${error ? "border-danger" : "border-edge"}`}
        >
          <Text className="text-sm font-medium text-muted">Word or phrase</Text>
          <TextInput
            autoFocus
            value={term}
            onChangeText={(v) => {
              setTerm(v);
              setError(false);
            }}
            placeholder="igatsema"
            placeholderTextColor={p.faint}
            returnKeyType="next"
            onSubmitEditing={() => meaningRef.current?.focus()}
            autoCapitalize="none"
            // A word in the language being learned: the device's dictionary only gets it wrong.
            autoCorrect={false}
            spellCheck={false}
            selectionColor={p.text}
            className="text-text"
            style={{
              fontFamily: termFont,
              fontSize: 30,
              lineHeight: 36,
              fontWeight: "500",
              letterSpacing: -0.6,
              paddingVertical: 2,
            }}
            accessibilityLabel="Word or phrase"
          />
        </View>
        {error && (
          <View className="flex-row items-center gap-1.5 px-1">
            <Icon name="alert" size={14} colour={p.danger} />
            <Text className="text-base text-danger">Add the word first.</Text>
          </View>
        )}
        <View className="rounded-lg border border-edge bg-plate px-4 pb-3 pt-2.5">
          <Text className="text-sm font-medium text-muted">Meaning</Text>
          <TextInput
            ref={meaningRef}
            value={meaning}
            onChangeText={setMeaning}
            placeholder="Leave it empty and the AI fills it in"
            placeholderTextColor={p.faint}
            returnKeyType="done"
            selectionColor={p.text}
            onSubmitEditing={save}
            className="text-text"
            style={{ fontFamily: bodyFont, fontSize: 17, lineHeight: 24, paddingVertical: 4 }}
            accessibilityLabel="Meaning"
          />
        </View>
        <View className="flex-row items-center gap-3 rounded-lg border border-edge bg-plate px-4 py-3">
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-md font-medium text-text">Fill in the rest</Text>
              <View className="h-[18px] justify-center rounded-full bg-ai-soft px-1.5">
                <Text className="text-2xs font-semibold text-ai">AI</Text>
              </View>
            </View>
            <Text className="text-base text-muted">Example and notes, marked as AI.</Text>
          </View>
          <Switch
            value={enrich}
            onValueChange={setEnrich}
            trackColor={{ true: p.amber, false: p["plate-2"] }}
          />
        </View>
      </View>

      <View className="flex-1" />
      {/* While typing, Add rides on the keyboard so it is never under it. */}
      <Animated.View style={lift}>
        <Button label="Add" variant="primary" size="xl" onPress={save} />
      </Animated.View>
    </View>
  );
}
