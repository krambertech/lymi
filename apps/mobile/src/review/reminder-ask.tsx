import { useLingui } from "@lingui/react/macro";
import { type DayPart, reminderChoices } from "@lymi/client/first-review";
import { type LucideIcon, Moon, Sun, Sunrise } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { notificationPermission } from "../reminders/notifications";
import { captureEvent } from "../telemetry/posthog";
import { useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Button, Plate, Press, Text } from "../ui/primitives";
import { useReminder } from "../you/reminder";

// The reminder question at a review's end, asked once on a phone. docs/design/onboarding.md "On the phone".

type Answer = "remind" | "not_now";

/**
 * Whether this review's end asks about the reminder, and the question's state. It asks only where
 * iOS can still be asked: the reminder is off, this phone has not put the question before, and
 * notifications were never allowed or refused.
 */
export function useReminderAsk() {
  const reminder = useReminder();
  const settled = () =>
    !!deviceStore.getString(DEVICE_KEYS.reminder) ||
    !!deviceStore.getBoolean(DEVICE_KEYS.reminderAsked);
  // Unknown until iOS answers, so the end never shows Done and then swaps it for Next.
  const [able, setAble] = useState<boolean | undefined>(() => (settled() ? false : undefined));
  const [choices] = useState(() => reminderChoices(new Date()));
  const [part, setPart] = useState<DayPart>(choices.part);
  const [busy, setBusy] = useState(false);
  // Shown and not yet answered, so leaving by X or a pull counts as closed.
  const open = useRef<DayPart | null>(null);

  useEffect(() => {
    if (able !== undefined) return;
    let live = true;
    void notificationPermission().then(
      (permission) => live && setAble(permission === "undetermined"),
      () => live && setAble(false),
    );
    return () => {
      live = false;
    };
  }, [able]);

  useEffect(
    () => () => {
      if (open.current)
        captureEvent("reminder_ask_left", {
          answer: "closed",
          part: open.current,
          reminder: "off",
        });
    },
    [],
  );

  const leave = (answer: Answer, on: boolean) => {
    open.current = null;
    captureEvent("reminder_ask_left", { answer, part, reminder: on ? "on" : "off" });
  };

  return {
    able,
    times: choices.times,
    time: choices.times[part],
    part,
    busy,
    choose: (next: DayPart) => {
      setPart(next);
      if (open.current) open.current = next;
    },
    /** The question is on screen, so this phone never puts it again. */
    shown: () => {
      deviceStore.set(DEVICE_KEYS.reminderAsked, true);
      open.current = part;
    },
    /** iOS asks from this press; the reminder is on only when it is allowed. */
    remind: async () => {
      setBusy(true);
      const answer = await reminder.turnOnAt(choices.times[part]).catch(() => "denied" as const);
      leave("remind", answer === "granted");
    },
    decline: () => leave("not_now", false),
  };
}

export type ReminderAsk = ReturnType<typeof useReminderAsk>;

/** The question and the day's three times, one chosen, under the end's lantern. */
export function ReminderQuestion({ ask }: { ask: ReminderAsk }) {
  const { t } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  // Next, which held VoiceOver's focus, has gone, so the question takes it.
  const heading = useRef<View>(null);
  useEffect(() => {
    const node = findNodeHandle(heading.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);
  // Drawn from Lucide here, not the icon set: a new entry there is a new native symbol, which an
  // over-the-air update cannot carry.
  const parts: { part: DayPart; label: string; icon: LucideIcon }[] = [
    { part: "morning", label: t`Morning`, icon: Sunrise },
    { part: "lunch", label: t`Lunch`, icon: Sun },
    { part: "evening", label: t`Evening`, icon: Moon },
  ];
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(280)} className="w-full gap-6">
      <View className="items-center gap-2">
        <View ref={heading} accessible accessibilityRole="header">
          <Text className="text-center text-2xl font-medium text-ink">
            {t`When should we remind you?`}
          </Text>
        </View>
        <Text className="text-center text-md text-ink-secondary">
          {t`One reminder, only on days with cards.`}
        </Text>
      </View>
      <View className="gap-2.5">
        <View
          className="flex-row gap-2.5"
          accessibilityRole="radiogroup"
          accessibilityLabel={t`Reminder time`}
        >
          {parts.map(({ part, label, icon: PartIcon }) => {
            const chosen = part === ask.part;
            const time = ask.times[part];
            return (
              <View key={part} className="flex-1">
                <Press
                  onPress={() => ask.choose(part)}
                  scale={0.98}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: chosen }}
                  accessibilityLabel={`${label}, ${time}`}
                >
                  <Plate
                    className="h-24 items-center justify-center gap-0.5 px-1"
                    style={chosen ? { borderColor: p.ink, borderWidth: 1.5 } : undefined}
                  >
                    <View className="mb-1">
                      <PartIcon
                        size={20}
                        color={chosen ? p.ink : p["ink-muted"]}
                        strokeWidth={1.75}
                      />
                    </View>
                    <Text className="text-md font-medium text-ink">{label}</Text>
                    <Text
                      className="text-sm text-ink-secondary"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {time}
                    </Text>
                  </Plate>
                </Press>
              </View>
            );
          })}
        </View>
        <Text className="text-center text-sm text-ink-muted">
          {t`Your phone will ask to allow notifications.`}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Remind me and Not now, at the foot where the end's Done was. */
export function ReminderWays({ ask, onDone }: { ask: ReminderAsk; onDone: () => void }) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const time = ask.time;
  return (
    <Animated.View entering={reduce ? undefined : FadeIn.duration(280)} className="gap-3">
      <Button
        label={t`Remind me at ${time}`}
        icon="reminder"
        variant="primary"
        size="lg"
        loading={ask.busy}
        onPress={() => void ask.remind().then(onDone)}
      />
      <Button
        label={t`Not now`}
        variant="ghost"
        size="lg"
        disabled={ask.busy}
        onPress={() => {
          ask.decline();
          onDone();
        }}
      />
    </Animated.View>
  );
}
