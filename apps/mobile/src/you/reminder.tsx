import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { getCalendars } from "expo-localization";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { useMMKVString } from "react-native-mmkv";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { useDay } from "../data/queries";
import { askPermission, notificationPermission, type Permission } from "../reminders/notifications";
import { useRoom } from "../theme/palette";
import { Button, Text } from "../ui/primitives";
import { Sheet, SheetGroup } from "../ui/sheet";
import { Switch } from "../ui/switch";

/** Where the reminder starts when it is first turned on, as on the web. */
const FIRST_TIME = "19:00";

/** Prototype only: which settings layout to draw, while Kateryna picks one. */
export const REMINDER_LAYOUT: "sheet" | "preview" | "inline" = "sheet";

const toDate = (time: string) => {
  const [h = 19, m = 0] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const toTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Whether iOS lets Lymi notify, read again whenever the app comes back from Settings. */
function usePermission() {
  const [permission, setPermission] = useState<Permission | undefined>();
  const read = useCallback(() => void notificationPermission().then(setPermission), []);
  useEffect(() => {
    read();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => listener.remove();
  }, [read]);
  return [permission, setPermission] as const;
}

/**
 * The daily reminder on this phone: off, or a local time as `HH:MM`. It is kept on the device, as
 * the web keeps one per browser, and `ReminderSync` schedules it.
 */
export function useReminder() {
  const [stored, store] = useMMKVString(DEVICE_KEYS.reminder, deviceStore);
  const time = stored ?? null;
  const [permission, setPermission] = usePermission();
  const { i18n } = useLingui();
  return {
    time,
    /** iOS has refused Lymi notifications, so only Settings can let the reminder through. */
    blocked: !!time && permission === "denied",
    /** In the app's language, on the phone's own 12- or 24-hour clock, as the wheel shows it. */
    label: time
      ? i18n.date(toDate(time), {
          hour: "numeric",
          minute: "2-digit",
          hour12: !getCalendars()[0]?.uses24hourClock,
        })
      : null,
    set: (next: string | null) => store(next ?? undefined),
    /** Turning it on is the moment iOS asks, never the first launch. */
    turn: async (on: boolean) => {
      store(on ? FIRST_TIME : undefined);
      if (on) setPermission(await askPermission());
    },
  };
}

type Reminder = ReturnType<typeof useReminder>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder;
}

/** Turns the reminder on or off and sets its time; each change holds the moment it is made. */
export function ReminderSheet({ open, onOpenChange, reminder }: Props) {
  const { t } = useLingui();
  return (
    <Sheet title={t`Daily reminder`} open={open} onOpenChange={onOpenChange}>
      {REMINDER_LAYOUT === "preview" ? (
        <NotificationPreview />
      ) : (
        <Text className="-mt-1 px-4 text-base text-text-2">{t`Only on days with cards due.`}</Text>
      )}
      <SheetGroup>
        <ReminderSwitch reminder={reminder} />
        {reminder.time && <TimeWheel reminder={reminder} />}
      </SheetGroup>
      {reminder.blocked && <Blocked />}
    </Sheet>
  );
}

export function ReminderSwitch({ reminder }: { reminder: Reminder }) {
  const { t } = useLingui();
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 ps-4 pe-3.5">
      <Text className="flex-1 text-md text-text" accessible={false}>
        {t`Remind me to review`}
      </Text>
      <Switch
        checked={!!reminder.time}
        onCheckedChange={(on) => void reminder.turn(on)}
        accessibilityLabel={t`Remind me to review`}
      />
    </View>
  );
}

function TimeWheel({ reminder }: { reminder: Reminder }) {
  const { t } = useLingui();
  const room = useRoom();
  if (!reminder.time) return null;
  return (
    <Host colorScheme={room} matchContents style={{ alignSelf: "center" }}>
      <DatePicker
        title={t`Time`}
        selection={toDate(reminder.time)}
        displayedComponents={["hourAndMinute"]}
        onDateChange={(d) => reminder.set(toTime(d))}
        modifiers={[datePickerStyle("wheel"), labelsHidden()]}
      />
    </Host>
  );
}

/** A time row with iOS's compact picker, for the reminder drawn on the page itself. */
export function TimeRow({ reminder }: { reminder: Reminder }) {
  const { t } = useLingui();
  const room = useRoom();
  if (!reminder.time) return null;
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 ps-4 pe-3">
      <Text className="flex-1 text-md text-text" accessible={false}>
        {t`Time`}
      </Text>
      <Host colorScheme={room} matchContents>
        <DatePicker
          title={t`Time`}
          selection={toDate(reminder.time)}
          displayedComponents={["hourAndMinute"]}
          onDateChange={(d) => reminder.set(toTime(d))}
          modifiers={[datePickerStyle("compact"), labelsHidden()]}
        />
      </Host>
    </View>
  );
}

/** iOS refused notifications: say so and open Lymi's page in Settings, the one place to allow them. */
export function Blocked() {
  const { t } = useLingui();
  return (
    <View className="gap-3 px-4">
      <Text className="text-base text-text-2">
        {t`Notifications are off for Lymi. Turn them on in Settings to get the reminder.`}
      </Text>
      <View className="flex-row">
        <Button label={t`Open Settings`} size="sm" onPress={() => void Linking.openSettings()} />
      </View>
    </View>
  );
}

/** The reminder as it will arrive, with today's count, so the setting shows what it sends. */
function NotificationPreview() {
  const { t } = useLingui();
  const { left } = useDay();
  const due = Math.max(left ?? 0, 1);
  return (
    <View className="gap-1 rounded-xl bg-glass-plate px-4 py-3" accessible>
      <Text className="text-sm font-medium text-muted">{t`Lymi`}</Text>
      <Text className="text-md font-medium text-text">
        {plural(due, { one: "# card to review", other: "# cards to review" })}
      </Text>
      <Text className="text-base text-text-2">{t`Review whenever you have a moment.`}</Text>
      <Text className="pt-1 text-sm text-muted">{t`Only on days with cards due.`}</Text>
    </View>
  );
}
