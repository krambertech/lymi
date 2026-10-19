import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { DAILY_GOAL_PRESETS, DailyGoal } from "@lymi/core";
import { onlineManager } from "@tanstack/react-query";
import { useRef, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { IconButton, Text } from "../ui/primitives";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";

export const GOAL_NAMES: Record<(typeof DAILY_GOAL_PRESETS)[number], MessageDescriptor> = {
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

/** The stepper moves a goal of one's own in fives, within the goal's bounds. */
const STEP = 5;
const MIN = 1;
const MAX = 200;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The goal now. */
  value: number;
  onChange: (goal: number) => void;
}

/**
 * How many reviews keep the streak each day, as a choice list over the streak: four presets and a
 * number of one's own on a stepper, so no keyboard rises. A choice saves once the sheet has gone.
 * The one place the goal changes. streak.md, CONTEXT.md "Daily goal".
 */
export function GoalSheet({ open, onOpenChange, value, onChange }: Props) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const connected = useOnline();
  const [custom, setCustom] = useState(!isPreset(value));
  const [own, setOwn] = useState(value);
  const chosen = useRef<number | null>(null);
  // Each opening starts from the saved goal, so a change made on the web never lingers.
  const [shown, setShown] = useState(open);
  if (open !== shown) {
    setShown(open);
    if (open) {
      setCustom(!isPreset(value));
      setOwn(value);
      chosen.current = null;
    }
  }
  // Read through a ref, so a held − or + steps from where the last press left it.
  const current = useRef(value);
  current.current = custom ? own : value;
  const step = (by: 1 | -1) => {
    const base = current.current;
    // Onto the next five, so 7 steps to 10 and 5 rather than 12 and 2.
    const next =
      by > 0 ? Math.floor(base / STEP) * STEP + STEP : Math.ceil(base / STEP) * STEP - STEP;
    const goal = DailyGoal.safeParse(Math.min(MAX, Math.max(MIN, next)));
    if (!goal.success) return;
    current.current = goal.data;
    setCustom(true);
    setOwn(goal.data);
    chosen.current = goal.data;
  };

  return (
    <Sheet
      title={t`Daily goal`}
      description={
        connected
          ? t`Reviews a day to keep your streak. Forgot counts too.`
          : t`Changing the goal needs a connection.`
      }
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        if (chosen.current !== null && chosen.current !== value) onChange(chosen.current);
        chosen.current = null;
      }}
    >
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
                chosen.current = n;
                onOpenChange(false);
              }}
            />
          ))}
          <View
            className="min-h-[52px] flex-row items-center gap-3 ps-4 pe-2"
            // One adjustable element: a swipe up or down steps, as iOS's own steppers do.
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={t`Your own goal`}
            accessibilityValue={{
              text: plural(own, { one: "# review a day", other: "# reviews a day" }),
            }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
          >
            <View className="w-5 items-center">
              {custom && <Icon name="check" size={20} colour={p.text} strokeWidth={2.25} />}
            </View>
            <View className="flex-1 gap-0.5 py-2.5">
              <Text className={`text-md text-text ${custom ? "font-medium" : ""}`}>
                {t`Your own`}
              </Text>
              <Text className="text-sm text-muted">
                {plural(own, { one: "review a day", other: "reviews a day" })}
              </Text>
            </View>
            <View className="flex-row items-center gap-1" accessibilityElementsHidden>
              <IconButton
                icon="minus"
                label={t`Fewer`}
                size="sm"
                repeat
                disabled={own <= MIN}
                onPress={() => step(-1)}
              />
              <Text
                className="min-w-10 text-center text-lg font-medium text-text"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {i18n.number(own)}
              </Text>
              <IconButton
                icon="plus"
                label={t`More`}
                size="sm"
                repeat
                disabled={own >= MAX}
                onPress={() => step(1)}
              />
            </View>
          </View>
        </SheetGroup>
      </View>
    </Sheet>
  );
}
