import { forwardRef, useState } from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon, Press, Text } from "./primitives";

interface Props extends Omit<TextInputProps, "style" | "className"> {
  label: string;
  /** Under the box; it marks the field invalid and takes the hint's place. */
  error?: string | null | undefined;
  hint?: string | undefined;
  /** A password, with a control to show what was typed. */
  secret?: boolean;
}

/** forms.md: the label above, one box, then the hint or the error under it. */
export const Field = forwardRef<TextInput, Props>(function Field(
  { label, error, hint, secret = false, ...input },
  ref,
) {
  const p = usePalette();
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const edge = error ? "border-danger" : focused ? "border-edge-2" : "border-edge";
  return (
    <View className="gap-1.5">
      <Text className="px-1 text-sm font-medium text-text-2">{label}</Text>
      <View className={`h-12 flex-row items-center rounded-md border bg-plate ${edge}`}>
        <TextInput
          ref={ref}
          {...input}
          secureTextEntry={secret && !shown}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          placeholderTextColor={p.muted}
          selectionColor={p.text}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          className="h-full flex-1 px-3.5 font-sans text-text"
          style={{ fontSize: 17 }}
        />
        {secret && (
          <Press
            onPress={() => setShown((v) => !v)}
            haptic={false}
            hitSlop={6}
            className="h-full w-12 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={shown ? "Hide password" : "Show password"}
          >
            <Icon name={shown ? "hide" : "show"} size={20} colour={p.muted} />
          </Press>
        )}
      </View>
      {error ? (
        <View className="flex-row items-start gap-1.5 px-1" accessibilityLiveRegion="polite">
          <View className="pt-0.5">
            <Icon name="alert" size={14} colour={p.danger} />
          </View>
          <Text className="flex-1 text-base text-danger">{error}</Text>
        </View>
      ) : hint ? (
        <Text className="px-1 text-base text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
