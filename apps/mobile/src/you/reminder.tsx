import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { useLingui } from "@lingui/react/macro";
import { getCalendars } from "expo-localization";
import { useState } from "react";
import { View } from "react-native";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { useRoom } from "../theme/palette";
import { Text } from "../ui/primitives";
import { Sheet, SheetGroup } from "../ui/sheet";
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

/**
 * The daily reminder on this phone: off, or a local time as `HH:MM`. It is kept on the device, as
 * the web keeps one per browser; scheduling the notification from it is #510.
 */
export function useReminder() {
  const [time, setTime] = useState(() => deviceStore.getString(DEVICE_KEYS.reminder) ?? null);
  const { i18n } = useLingui();
  return {
    time,
    /** In the app's language, on the phone's own 12- or 24-hour clock, as the wheel shows it. */
    label: time
      ? i18n.date(toDate(time), {
          hour: "numeric",
          minute: "2-digit",
          hour12: !getCalendars()[0]?.uses24hourClock,
        })
      : null,
    set: (next: string | null) => {
      if (next) deviceStore.set(DEVICE_KEYS.reminder, next);
      else deviceStore.remove(DEVICE_KEYS.reminder);
      setTime(next);
    },
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: ReturnType<typeof useReminder>;
}

/** Turns the reminder on or off and sets its time; each change holds the moment it is made. */
export function ReminderSheet({ open, onOpenChange, reminder }: Props) {
  const { t } = useLingui();
  const room = useRoom();
  const { time, set } = reminder;
  return (
    <Sheet title={t`Daily reminder`} open={open} onOpenChange={onOpenChange}>
      <Text className="-mt-1 px-4 text-base text-text-2">{t`Only on days with cards due.`}</Text>
      <SheetGroup>
        <View className="min-h-[52px] flex-row items-center gap-3 ps-4 pe-3.5">
          <Text className="flex-1 text-md text-text" accessible={false}>
            {t`Remind me to review`}
          </Text>
          <Switch
            checked={!!time}
            onCheckedChange={(on) => set(on ? FIRST_TIME : null)}
            accessibilityLabel={t`Remind me to review`}
          />
        </View>
        {time && (
          <Host colorScheme={room} matchContents style={{ alignSelf: "center" }}>
            <DatePicker
              title={t`Time`}
              selection={toDate(time)}
              displayedComponents={["hourAndMinute"]}
              onDateChange={(d) => set(toTime(d))}
              modifiers={[datePickerStyle("wheel"), labelsHidden()]}
            />
          </Host>
        )}
      </SheetGroup>
    </Sheet>
  );
}
