import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { DAILY_GOAL_PRESETS, DailyGoal } from "@lymi/core";
import { onlineManager } from "@tanstack/react-query";
import { useRef, useState, useSyncExternalStore } from "react";
import { TextInput, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { FieldError } from "../ui/field";
import { Button, Text } from "../ui/primitives";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";

const GOAL_NAMES: Record<(typeof DAILY_GOAL_PRESETS)[number], MessageDescriptor> = {
  10: msg({ message: "Light", context: "daily goal" }),
  25: msg({ message: "Steady", context: "daily goal" }),
  50: msg({ message: "Keen", context: "daily goal" }),
  100: msg({ message: "Intense", context: "daily goal" }),
};

const isPreset = (n: number) => (DAILY_GOAL_PRESETS as readonly number[]).includes(n);

const online = () => onlineManager.isOnline();
const subscribe = (listener: () => void) => onlineManager.subscribe(listener);

/** Whether a goal can be saved now: it is saved, never queued. */
export const useOnline = () => useSyncExternalStore(subscribe, online);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The goal now. */
  value: number;
  onChange: (goal: number) => void;
}

/**
 * How many reviews keep the streak each day, as a choice list over the streak: four presets and a
 * number of your own. A preset is chosen once the sheet has gone; the number on Done. The one
 * place the goal changes. streak.md, CONTEXT.md "Daily goal".
 */
export function GoalSheet({ open, onOpenChange, value, onChange }: Props) {
  const { t, i18n } = useLingui();
  const connected = useOnline();
  const [custom, setCustom] = useState(!isPreset(value));
  const [draft, setDraft] = useState(isPreset(value) ? "" : String(value));
  const [error, setError] = useState<string | null>(null);
  const chosen = useRef<number | null>(null);
  const input = useRef<TextInput>(null);
  // Each opening starts from the saved goal, so a Custom left unsaved or a change made on the web never lingers.
  const [shown, setShown] = useState(open);
  if (open !== shown) {
    setShown(open);
    if (open) {
      setCustom(!isPreset(value));
      setDraft(isPreset(value) ? "" : String(value));
      setError(null);
    }
  }

  const close = (goal: number | null) => {
    chosen.current = goal;
    onOpenChange(false);
  };
  const commit = () => {
    const parsed = DailyGoal.safeParse(draft.trim() === "" ? Number.NaN : Number(draft));
    if (!parsed.success) return setError(t`Choose a whole number from 1 to 200.`);
    setError(null);
    close(parsed.data);
  };

  return (
    <Sheet
      title={t`Daily goal`}
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        if (chosen.current !== null && chosen.current !== value) onChange(chosen.current);
        chosen.current = null;
      }}
    >
      <Text className="-mt-1 px-4 text-base text-text-2">
        {connected
          ? t`How many reviews a day keep your streak. Every grade counts, even Forgot.`
          : t`Changing the goal needs a connection.`}
      </Text>
      <View
        pointerEvents={connected ? "auto" : "none"}
        className={connected ? "" : "opacity-45"}
        accessibilityState={{ disabled: !connected }}
      >
        <SheetGroup>
          {DAILY_GOAL_PRESETS.map((n) => (
            <SheetRow
              key={n}
              label={i18n._(GOAL_NAMES[n])}
              detail={plural(n, { one: "# review", other: "# reviews" })}
              chosen={!custom && value === n}
              onPress={() => {
                setCustom(false);
                setError(null);
                close(n);
              }}
            />
          ))}
          <SheetRow
            label={t`Custom`}
            chosen={custom}
            onPress={() => {
              setCustom(true);
              if (draft === "") setDraft(String(value));
              requestAnimationFrame(() => input.current?.focus());
            }}
          />
          {custom && (
            <CustomGoal
              ref={input}
              draft={draft}
              error={!!error}
              onDraft={setDraft}
              onDone={commit}
            />
          )}
        </SheetGroup>
      </View>
      <FieldError>{error}</FieldError>
    </Sheet>
  );
}

/** The number of one's own, under Custom: whole reviews from 1 to 200. The number pad has no Return, so it has Save. */
function CustomGoal({
  ref,
  draft,
  error,
  onDraft,
  onDone,
}: {
  ref: React.Ref<TextInput>;
  draft: string;
  error: boolean;
  onDraft: (draft: string) => void;
  onDone: () => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 ps-12 pe-3.5">
      <TextInput
        ref={ref}
        value={draft}
        onChangeText={onDraft}
        onSubmitEditing={onDone}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={3}
        selectTextOnFocus
        accessibilityLabel={t`Reviews a day`}
        placeholderTextColor={p.muted}
        selectionColor={p.text}
        className={`h-9 w-16 rounded-sm border bg-glass-plate px-2.5 text-end font-sans text-text ${error ? "border-danger" : "border-edge-2"}`}
        style={{ fontSize: 17, fontVariant: ["tabular-nums"] }}
        maxFontSizeMultiplier={inputCap(17)}
      />
      <Text className="flex-1 text-md text-text-2">
        {plural(Number(draft) || 0, { one: "review a day", other: "reviews a day" })}
      </Text>
      <Button label={t`Save`} variant="primary" size="sm" onPress={onDone} />
    </View>
  );
}
