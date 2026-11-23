import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { GlassButton, GlassSurface } from "./glass";
import { Icon } from "./primitives";

const SETTLE = 250;

export function useSearchText(initial = "") {
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState(initial.trim());
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SETTLE);
    return () => clearTimeout(timer);
  }, [text]);
  return { text, setText, query };
}

export function ClearText({ value, onClear }: { value: string; onClear: () => void }) {
  const { t } = useLingui();
  const p = usePalette();
  if (Platform.OS !== "android" || !value) return null;
  return (
    <Pressable
      onPress={onClear}
      accessibilityRole="button"
      accessibilityLabel={t`Clear search`}
      hitSlop={8}
      className="size-7 items-center justify-center"
    >
      <Icon name="close" size={18} colour={p["ink-muted"]} />
    </Pressable>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  onCancel,
  after,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  onCancel: () => void;
  after?: ReactNode;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const closed = useRef(false);
  const close = () => {
    if (closed.current) return;
    closed.current = true;
    onCancel();
  };
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
        <Icon name="search" size={18} colour={p["ink-muted"]} />
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChange}
          onFocus={() => {
            closed.current = false;
          }}
          onBlur={() => {
            if (!value.trim()) close();
          }}
          placeholder={placeholder}
          placeholderTextColor={p["ink-muted"]}
          accessibilityLabel={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          selectionColor={p.ink}
          className="flex-1 font-sans text-ink"
          style={{ fontSize: 17 }}
          maxFontSizeMultiplier={inputCap(17)}
        />
        <ClearText value={value} onClear={() => onChange("")} />
      </GlassSurface>
      {after}
      <GlassButton icon="close" label={t`Close search`} onPress={close} />
    </View>
  );
}
