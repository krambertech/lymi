import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { GlassButton, GlassSurface } from "./glass";
import { Icon } from "./primitives";

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
 * Search sits at the foot of the screen and rides on the keyboard, as iOS 26's own search does: a
 * glass field, then a round glass close. Put it last inside a KeyboardRoom, under the results.
 * Every search on the phone uses it, so they read as one; a control that narrows the results, such
 * as a filter, goes in `after`, between the field and close.
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
  /** Glass controls beside the field, before close. */
  after?: ReactNode;
}) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <View className="flex-row items-center gap-2.5 px-4 pt-2 pb-2">
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
      <GlassButton icon="close" label={t`Close search`} onPress={onCancel} />
    </View>
  );
}
