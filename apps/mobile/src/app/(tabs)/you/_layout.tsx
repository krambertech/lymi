import { Stack } from "expo-router";
import { usePalette } from "../../../theme/palette";
import { useStackOptions } from "../../../ui/screen";

export const unstable_settings = { initialRouteName: "index" };

/** Pages push from the side; feedback and the profile, tasks with an end, rise as sheets. phone.md. */
export default function TabStack() {
  const p = usePalette();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="feedback"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1],
          sheetGrabberVisible: true,
          // Opaque at full height, as iOS makes it, so the form's fills keep their contrast.
          contentStyle: { backgroundColor: p.sheet },
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1],
          sheetGrabberVisible: true,
          // Opaque at full height, as iOS makes it, so the form's fills keep their contrast.
          contentStyle: { backgroundColor: p.sheet },
        }}
      />
    </Stack>
  );
}
