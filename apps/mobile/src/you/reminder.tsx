import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { useMMKVString } from "react-native-mmkv";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { askPermission, notificationPermission, type Permission } from "../reminders/notifications";
import { useRoom } from "../theme/palette";
import { Button, Text } from "../ui/primitives";
import { RowFace } from "../ui/row";
import { Switch } from "../ui/switch";

/** Where the reminder starts when it is first turned on, as on the web. */
const FIRST_TIME = "19:00";

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
  return {
    time,
    /** iOS has refused Lymi notifications, so only Settings can let the reminder through. */
    blocked: !!time && permission === "denied",
    set: (next: string | null) => store(next ?? undefined),
    /** Turning it on is the moment iOS asks, never the first launch. */
    turn: async (on: boolean) => {
      store(on ? FIRST_TIME : undefined);
      if (on) setPermission(await askPermission());
    },
  };
}

type Reminder = ReturnType<typeof useReminder>;

/** Turns the reminder on or off; each change holds the moment it is made. */
export function ReminderSwitch({ reminder }: { reminder: Reminder }) {
  const { t } = useLingui();
  return (
    <RowFace
      icon="reminder"
      label={t`Remind me to review`}
      control={
        <Switch
          checked={!!reminder.time}
          onCheckedChange={(on) => void reminder.turn(on)}
          accessibilityLabel={t`Remind me to review`}
        />
      }
    />
  );
}

/** The time, on iOS's compact picker, under the switch while the reminder is on. */
export function TimeRow({ reminder }: { reminder: Reminder }) {
  const { t } = useLingui();
  const room = useRoom();
  if (!reminder.time) return null;
  return (
    <RowFace
      icon="time"
      label={t`Time`}
      control={
        <Host colorScheme={room} matchContents>
          <DatePicker
            title={t`Time`}
            selection={toDate(reminder.time)}
            displayedComponents={["hourAndMinute"]}
            onDateChange={(d) => reminder.set(toTime(d))}
            modifiers={[datePickerStyle("compact"), labelsHidden()]}
          />
        </Host>
      }
    />
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
