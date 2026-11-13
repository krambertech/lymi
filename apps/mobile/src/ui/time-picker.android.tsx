import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useLingui } from "@lingui/react/macro";
import { getCalendars } from "expo-localization";
import { useState } from "react";
import { usePalette, useRoom } from "../theme/palette";
import { Press, Text } from "./primitives";
import type { TimePickerProps } from "./time-picker";

/** The time as a chip that opens Material's clock dialog, as Android's own settings set a time. */
export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const { i18n } = useLingui();
  const p = usePalette();
  const room = useRoom();
  const [open, setOpen] = useState(false);
  // The phone's own 12- or 24-hour setting, which the clock dialog follows too.
  const hour12 = !(getCalendars()[0]?.uses24hourClock ?? false);
  const shown = i18n.date(value, { hour: "numeric", minute: "2-digit", hour12 });
  return (
    <>
      <Press
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        className="rounded-lg bg-plate-hover px-3 py-1.5"
      >
        <Text className="text-md text-ink" style={{ fontVariant: ["tabular-nums"] }}>
          {shown}
        </Text>
      </Press>
      {open && (
        <DateTimePicker
          mode="time"
          presentation="dialog"
          value={value}
          is24Hour={!hour12}
          accentColor={p.amber}
          themeVariant={room}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === "set" && date) onChange(date);
          }}
        />
      )}
    </>
  );
}
