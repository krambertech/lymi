import { useLingui } from "@lingui/react/macro";
import {
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Pressable, TextInput, type TextInputProps, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { ForcedStateContext, Icon, Press, Text } from "./primitives";
import { useOnGlass } from "./surface";

interface FieldState {
  label: string | undefined;
  setLabel: (label: string | undefined) => void;
  error: string | undefined;
  setError: (error: string | undefined) => void;
  /** The hint under the control, which VoiceOver reads with it. */
  description: string | undefined;
  setDescription: (description: string | undefined) => void;
  invalid: boolean;
  disabled: boolean;
  /** What pressing the row does, set by a switch so its label presses it too. */
  setPress: (press: (() => void) | undefined) => void;
}

export const FieldContext = createContext<FieldState | null>(null);

interface FieldProps {
  /** A switch sits beside its label, and the whole row presses it. */
  orientation?: "vertical" | "horizontal";
  /** Invalid when the message sits somewhere else; a FieldError with a message does this itself. */
  invalid?: boolean;
  /** Reaches the control. */
  disabled?: boolean;
  children: ReactNode;
}

/**
 * forms.md: one row of a form, a label over one control with its hint or error under it. The parts
 * wire themselves: the label names the control, and an error marks it and takes the hint's place.
 */
export function Field({
  orientation = "vertical",
  invalid = false,
  disabled = false,
  children,
}: FieldProps) {
  const [label, setLabel] = useState<string>();
  const [error, setError] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [press, setPressFn] = useState<(() => void) | undefined>();
  const state = useMemo(
    () => ({
      label,
      setLabel,
      error,
      setError,
      description,
      setDescription,
      invalid: invalid || !!error,
      disabled,
      setPress: (fn: (() => void) | undefined) => setPressFn(() => fn),
    }),
    [label, error, description, invalid, disabled],
  );
  return (
    <FieldContext.Provider value={state}>
      {orientation === "horizontal" ? (
        <Pressable
          onPress={disabled ? undefined : press}
          accessible={false}
          className={`min-h-11 flex-row items-center gap-3 ${disabled ? "opacity-45" : ""}`}
        >
          {children}
        </Pressable>
      ) : (
        <View className={`gap-1.5 ${disabled ? "opacity-45" : ""}`}>{children}</View>
      )}
    </FieldContext.Provider>
  );
}

/** The label and description of a horizontal field, taking the row's room beside its control. */
export function FieldContent({ children }: { children: ReactNode }) {
  return <View className="flex-1 gap-0.5">{children}</View>;
}

/** The field's name above its control; `aside` puts a note at the end of the row, such as Optional. */
export function FieldLabel({ children, aside }: { children: string; aside?: ReactNode }) {
  const field = useContext(FieldContext);
  const setLabel = field?.setLabel;
  useEffect(() => {
    setLabel?.(children);
    return () => setLabel?.(undefined);
  }, [children, setLabel]);
  return (
    <View className="flex-row items-baseline justify-between gap-3 px-1">
      {/* The control carries the label as its name, so the label itself is not read twice. */}
      <Text
        className="text-sm font-medium text-text-2"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {children}
      </Text>
      {aside}
    </View>
  );
}

/** A line under the control that steps aside while the field shows an error. */
export function FieldDescription({ children }: { children: ReactNode }) {
  const field = useContext(FieldContext);
  const setDescription = field?.setDescription;
  const text = typeof children === "string" ? children : undefined;
  useEffect(() => {
    setDescription?.(text);
    return () => setDescription?.(undefined);
  }, [text, setDescription]);
  if (field?.error) return null;
  // A string reaches VoiceOver as the control's hint, so the line itself is not read twice.
  return (
    <Text
      className="px-1 text-base text-muted"
      accessible={text ? false : undefined}
      accessibilityElementsHidden={!!text}
      importantForAccessibility={text ? "no" : "auto"}
    >
      {children}
    </Text>
  );
}

/** How to fix what is wrong. With a message it marks the field and its control invalid. */
export function FieldError({ children }: { children?: string | null | undefined }) {
  const p = usePalette();
  const field = useContext(FieldContext);
  const setError = field?.setError;
  const message = children || undefined;
  useEffect(() => {
    setError?.(message);
    return () => setError?.(undefined);
  }, [message, setError]);
  if (!message) return null;
  return (
    <View className="flex-row items-start gap-1.5 px-1" accessibilityLiveRegion="polite">
      {/* As tall as the text's first line, so the icon centres on it however the line wraps. */}
      <View className="h-[21px] justify-center">
        <Icon name="alert" size={14} colour={p.danger} />
      </View>
      <Text className="flex-1 text-base text-danger">{message}</Text>
    </View>
  );
}

type InputProps = Omit<TextInputProps, "style" | "className" | "editable"> & {
  /** The end of the box, such as Show password. */
  end?: ReactNode;
  /** Several lines, growing with what is typed. */
  multiline?: boolean;
};

/** The control box: 44 pt, 17 pt text, an edge that darkens on focus and turns red when invalid. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { end, multiline = false, onFocus, onBlur, ...props },
  ref,
) {
  const p = usePalette();
  const field = useContext(FieldContext);
  const forced = useContext(ForcedStateContext) === "focused";
  const glass = useOnGlass();
  const [focused, setFocused] = useState(false);
  const edge = field?.invalid
    ? "border-danger"
    : focused || forced
      ? "border-edge-2"
      : "border-edge";
  return (
    <View
      className={`flex-row rounded-md border ${glass ? "bg-glass-plate" : "bg-plate"} ${edge} ${multiline ? "min-h-24 items-start" : "h-11 items-center"}`}
    >
      <TextInput
        ref={ref}
        {...props}
        multiline={multiline}
        editable={!field?.disabled}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={p.muted}
        selectionColor={p.text}
        accessibilityLabel={props.accessibilityLabel ?? field?.label}
        accessibilityHint={field?.error ?? field?.description}
        className={`flex-1 px-3.5 font-sans text-text ${multiline ? "py-2.5" : "h-full"}`}
        style={{ fontSize: 17, textAlignVertical: multiline ? "top" : "center" }}
        maxFontSizeMultiplier={inputCap(17)}
      />
      {end}
    </View>
  );
});

/** More than one line, such as notes; its height follows what is typed. */
export const Textarea = forwardRef<TextInput, Omit<InputProps, "multiline" | "end">>(
  function Textarea(props, ref) {
    return <Input ref={ref} {...props} multiline />;
  },
);

/** A password, with a control at the end of the box to show what was typed. */
export const PasswordInput = forwardRef<TextInput, Omit<InputProps, "end" | "secureTextEntry">>(
  function PasswordInput(props, ref) {
    const { t } = useLingui();
    const p = usePalette();
    const [shown, setShown] = useState(false);
    return (
      <Input
        ref={ref}
        {...props}
        secureTextEntry={!shown}
        end={
          <Press
            onPress={() => setShown((v) => !v)}
            haptic={false}
            className="h-full w-12 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={shown ? t`Hide password` : t`Show password`}
          >
            <Icon name={shown ? "hide" : "show"} size={20} colour={p.muted} />
          </Press>
        }
      />
    );
  },
);
