import { Stack } from "expo-router";
import { DoorProvider } from "../../auth/door";
import { useHoldLinks } from "../../auth/held-link";
import { usePalette } from "../../theme/palette";

export const unstable_settings = { initialRouteName: "welcome" };

/** Signed out: the welcome screen, and the email screen it pushes. */
export default function AuthLayout() {
  const p = usePalette();
  useHoldLinks();
  return (
    <DoorProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.canvas } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="email" />
      </Stack>
    </DoorProvider>
  );
}
