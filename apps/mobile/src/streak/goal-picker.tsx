import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { DAILY_GOAL_PRESETS, DailyGoal } from "@lymi/core";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, View } from "react-native";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { IconButton, Text } from "../ui/primitives";

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

/** The stepper moves a goal of one's own in fives, within the goal's bounds. */
const STEP = 5;
const MIN = 1;
const MAX = 200;
/** A run of taps on the stepper saves once, when the taps stop. */
const SETTLE_MS = 700;

interface Props {
  /** The goal now. */
  value: number;
  onChange: (goal: number) => void;
}

/**
 * How many reviews keep the streak each day, changed in place under the goal: four presets and a
 * number of one's own on a stepper. A preset saves on the tap; the stepper once its taps stop. The
 * one place the goal changes. streak.md, CONTEXT.md "Daily goal".
 */
export function GoalEditor({ value, onChange }: Props) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const connected = useOnline();
  const [custom, setCustom] = useState(!isPreset(value));
  const [own, setOwn] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const step = (by: 1 | -1) => {
    const base = custom ? own : value;
    const next = Math.min(
      MAX,
      Math.max(
        MIN,
        by > 0 ? Math.floor(base / STEP) * STEP + STEP : Math.ceil(base / STEP) * STEP - STEP,
      ),
    );
    const goal = DailyGoal.safeParse(next);
    if (!goal.success) return;
    setCustom(true);
    setOwn(goal.data);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(goal.data), SETTLE_MS);
  };
  const row = (last: boolean) =>
    `min-h-[52px] flex-row items-center gap-3 ps-5 pe-3 ${last ? "" : "border-b border-edge"}`;
  const shownOwn = i18n.number(own);
  return (
    <View
      pointerEvents={connected ? "auto" : "none"}
      className={`border-t border-edge ${connected ? "" : "opacity-45"}`}
      accessibilityState={{ disabled: !connected }}
    >
      {DAILY_GOAL_PRESETS.map((n) => {
        const chosen = !custom && value === n;
        return (
          <Pressable
            key={n}
            onPress={() => {
              setCustom(false);
              setOwn(n);
              if (value !== n) onChange(n);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen }}
            className={row(false)}
            style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
          >
            <View className="flex-1 gap-0.5 py-2">
              <Text className={`text-md text-text ${chosen ? "font-medium" : ""}`}>
                {i18n._(GOAL_NAMES[n])}
              </Text>
              <Text className="text-sm text-muted">
                {plural(n, { one: "# review", other: "# reviews" })}
              </Text>
            </View>
            {chosen && <Icon name="check" size={20} colour={p.text} strokeWidth={2.25} />}
          </Pressable>
        );
      })}
      <View
        className={row(true)}
        accessibilityRole="adjustable"
        accessibilityLabel={t`Your own goal`}
        accessibilityValue={{
          text: plural(own, { one: "# review a day", other: "# reviews a day" }),
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === "increment" ? 1 : -1)}
      >
        <View className="flex-1 gap-0.5 py-2">
          <Text className={`text-md text-text ${custom ? "font-medium" : ""}`}>{t`Your own`}</Text>
          <Text className="text-sm text-muted">
            {plural(own, { one: "review a day", other: "reviews a day" })}
          </Text>
        </View>
        <View
          className="flex-row items-center gap-1"
          importantForAccessibility="no-hide-descendants"
        >
          <IconButton icon="minus" label={t`Fewer`} size="sm" onPress={() => step(-1)} />
          <Text
            className="min-w-10 text-center text-lg font-medium text-text"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {shownOwn}
          </Text>
          <IconButton icon="plus" label={t`More`} size="sm" onPress={() => step(1)} />
        </View>
      </View>
      {!connected && (
        <Text className="px-5 pb-3 text-base text-muted">{t`Changing the goal needs a connection.`}</Text>
      )}
    </View>
  );
}
