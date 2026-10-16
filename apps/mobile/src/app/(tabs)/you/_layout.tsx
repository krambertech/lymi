import { Stack } from "expo-router";
import { usePalette } from "../../../theme/palette";
import { FULL_SHEET, TabStack } from "../../../ui/stack";

export const unstable_settings = { initialRouteName: "index" };

/** Pages push from the side; feedback and the delete code, tasks with an end, rise as sheets. phone.md. */
export default function Layout() {
  const p = usePalette();
  return (
    <TabStack>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="delete-code"
        options={{
          presentation: "formSheet",
          ...FULL_SHEET,
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: p.sheet },
        }}
      />
      <Stack.Screen
        name="feedback"
        options={{
          presentation: "formSheet",
          ...FULL_SHEET,
          sheetGrabberVisible: true,
          // Opaque at full height, as iOS makes it, so the form's fills keep their contrast.
          contentStyle: { backgroundColor: p.sheet },
        }}
      />
    </TabStack>
  );
}
