import type { Ref } from "react";
import type { TextInput as TextInputType } from "react-native";
import { TextInput } from "react-native";
import Animated from "react-native-reanimated";
import { CROSSFADE } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Text } from "../ui/primitives";

/** A line under the term, the meaning or the notes: its name over it and no box, at one edge. */
export function ComposerField({
  ref,
  value,
  onChange,
  label,
  placeholder,
  limit,
  newline = false,
  onNext,
}: {
  ref?: Ref<TextInputType>;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  limit: number | null;
  /** Return starts a new line, as in notes, instead of adding the card. */
  newline?: boolean;
  /** Return adds the card. */
  onNext?: () => void;
}) {
  const p = usePalette();
  return (
    <Animated.View entering={CROSSFADE}>
      <FieldName>{label}</FieldName>
      <TextInput
        ref={ref}
        value={value}
        maxLength={limit ?? undefined}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.muted}
        accessibilityLabel={label}
        // It wraps as it fills; Return adds the card, or in notes starts a new line.
        multiline
        submitBehavior={newline ? "newline" : "submit"}
        returnKeyType={newline ? "default" : "done"}
        onSubmitEditing={newline ? undefined : onNext}
        selectionColor={p.text}
        className="min-h-9 py-1.5 font-sans text-text"
        style={{ fontSize: 17 }}
        maxFontSizeMultiplier={inputCap(17)}
      />
    </Animated.View>
  );
}

/** A field's name over its line, so a filled line still says what it holds. */
export function FieldName({ children }: { children: string }) {
  return (
    // The input below carries the same name, so VoiceOver and TalkBack read it once.
    <Text
      className="text-sm font-medium text-muted"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {children}
    </Text>
  );
}
