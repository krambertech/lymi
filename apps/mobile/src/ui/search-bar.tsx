import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { GlassSurface } from "./glass";
import { Icon, Press, Text } from "./primitives";

/** Long enough to skip the letters of a word being typed, short enough to feel live. */
const SETTLE = 250;

/** The text as typed, and the trimmed text once typing settles, which is what a query should ask. */
export function useSearchText(initial = "") {
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState(initial.trim());
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SETTLE);
    return () => clearTimeout(timer);
  }, [text]);
  return { text, setText, query };
}

/**
 * Search takes the top bar while it is open, as iOS's own search does: a glass field with the
 * keyboard up, then Cancel. Every search on the phone uses it, so they read as one; anything that
 * narrows the results, such as filters, sits after the field.
 */
export function SearchBar({
  value,
  onChange,
  placeholder,
  onCancel,
  after,
}: {
  value: string;
  onChange: (text: string) => void;
  /** What is searched, as "Search all cards". It is the field's name for VoiceOver too. */
  placeholder: string;
  onCancel: () => void;
  /** Glass controls beside the field, before Cancel. */
  after?: ReactNode;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center gap-3 px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
      <GlassSurface
        tint="room"
        style={{
          flex: 1,
          height: 44,
          borderRadius: 22,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 14,
        }}
      >
        <Icon name="search" size={18} colour={p.muted} />
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={p.muted}
          accessibilityLabel={placeholder}
          // What is searched is mostly in the language being learned, which the dictionary gets wrong.
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          selectionColor={p.text}
          className="flex-1 font-sans text-text"
          style={{ fontSize: 17 }}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </GlassSurface>
      {after}
      <Press onPress={onCancel} accessibilityRole="button" hitSlop={8}>
        <Text className="text-md font-medium text-text">{t`Cancel`}</Text>
      </Press>
    </View>
  );
}
