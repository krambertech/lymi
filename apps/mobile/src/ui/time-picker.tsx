import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { useRoom } from "../theme/palette";

export interface TimePickerProps {
  /** What the time is for, read with it. */
  label: string;
  value: Date;
  onChange: (value: Date) => void;
}

/** iOS's compact time picker, which opens its wheel in place; time-picker.android.tsx is Android's. */
export function TimePicker({ label, value, onChange }: TimePickerProps) {
  const room = useRoom();
  return (
    <Host colorScheme={room} matchContents>
      <DatePicker
        title={label}
        selection={value}
        displayedComponents={["hourAndMinute"]}
        onDateChange={onChange}
        modifiers={[datePickerStyle("compact"), labelsHidden()]}
      />
    </Host>
  );
}
