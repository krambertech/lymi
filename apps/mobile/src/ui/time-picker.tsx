import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle, labelsHidden } from "@expo/ui/swift-ui/modifiers";
import { useRoom } from "../theme/palette";

export interface TimePickerProps {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
}

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
