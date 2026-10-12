import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { usePalette } from "../../../theme/palette";
import { useStackOptions } from "../../../ui/screen";

/** You's pages push from the side; feedback is a task with an end, so it rises as a sheet. phone.md. */
export default function TabStack() {
  const p = usePalette();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen
        name="feedback"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [1],
          sheetGrabberVisible: true,
          // Clear, so iOS 26 draws the glass under the screen's own fill; before 26, the sheet colour.
          contentStyle: {
            backgroundColor: isGlassEffectAPIAvailable() ? "transparent" : p.sheet,
          },
        }}
      />
    </Stack>
  );
}
