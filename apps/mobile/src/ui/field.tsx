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
import { AccessibilityInfo, Pressable, TextInput, type TextInputProps, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { ForcedStateContext, Icon, Press, Text } from "./primitives";
import { useOnGlass } from "./surface";

interface FieldState {
  label: string | undefined;
  setLabel: (label: string | undefined) => void;
  error: string | undefined;
  setError: (error: string | undefined) => void;
  description: string | undefined;
  setDescription: (description: string | undefined) => void;
  invalid: boolean;
  disabled: boolean;
  setPress: (press: (() => void) | undefined) => void;
}

export const FieldContext = createContext<FieldState | null>(null);

interface FieldProps {
  orientation?: "vertical" | "horizontal";
  invalid?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

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

export function FieldContent({ children }: { children: ReactNode }) {
  return <View className="flex-1 gap-0.5">{children}</View>;
}

export function FieldLabel({ children, aside }: { children: string; aside?: ReactNode }) {
  const field = useContext(FieldContext);
  const setLabel = field?.setLabel;
  useEffect(() => {
    setLabel?.(children);
    return () => setLabel?.(undefined);
  }, [children, setLabel]);
  return (
    <View className="flex-row items-baseline justify-between gap-3 px-1">
      <Text
        className="text-sm font-medium text-ink-secondary"
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

export function FieldDescription({ children }: { children: ReactNode }) {
  const field = useContext(FieldContext);
  const setDescription = field?.setDescription;
  const text = typeof children === "string" ? children : undefined;
  useEffect(() => {
    setDescription?.(text);
    return () => setDescription?.(undefined);
  }, [text, setDescription]);
  if (field?.error) return null;
  return (
    <Text
      className="px-1 text-base text-ink-muted"
      accessible={text ? false : undefined}
      accessibilityElementsHidden={!!text}
      importantForAccessibility={text ? "no" : "auto"}
    >
      {children}
    </Text>
  );
}

export function FieldError({
  children,
  flush = false,
}: {
  children?: string | null | undefined;
  flush?: boolean;
}) {
  const p = usePalette();
  const field = useContext(FieldContext);
  const setError = field?.setError;
  const message = children || undefined;
  useEffect(() => {
    setError?.(message);
    return () => setError?.(undefined);
  }, [message, setError]);
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  if (!message) return null;
  return (
    <View
      className={`flex-row items-start gap-1.5 ${flush ? "" : "px-1"}`}
      accessibilityLiveRegion="polite"
    >
      <View className="h-[21px] justify-center">
        <Icon name="alert" size={14} colour={p.danger} />
      </View>
      <Text className="flex-1 text-base text-danger">{message}</Text>
    </View>
  );
}

type InputProps = Omit<TextInputProps, "style" | "className" | "editable"> & {
  end?: ReactNode;
  multiline?: boolean;
};

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
      ? "border-edge-strong"
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
        placeholderTextColor={p["ink-muted"]}
        selectionColor={p.ink}
        accessibilityLabel={props.accessibilityLabel ?? field?.label}
        accessibilityHint={field?.error ?? field?.description}
        className={`flex-1 px-3.5 font-sans text-ink ${multiline ? "py-2.5" : "h-full"}`}
        style={{ fontSize: 17, textAlignVertical: multiline ? "top" : "center" }}
        maxFontSizeMultiplier={inputCap(17)}
      />
      {end}
    </View>
  );
});

export const Textarea = forwardRef<TextInput, Omit<InputProps, "multiline" | "end">>(
  function Textarea(props, ref) {
    return <Input ref={ref} {...props} multiline />;
  },
);

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
            <Icon name={shown ? "hide" : "show"} size={20} colour={p["ink-muted"]} />
          </Press>
        }
      />
    );
  },
);
