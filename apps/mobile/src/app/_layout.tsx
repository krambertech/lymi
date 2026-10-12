import "../global.css";
import { I18nProvider } from "@lingui/react";
import { useUpdateRequired } from "@lymi/client/update-required";
import { QueryClientProvider } from "@tanstack/react-query";
import { registerDevMenuItems } from "expo-dev-menu";
import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSession } from "../auth/client";
import { queryClient } from "../data/client";
import { Sync } from "../data/sync";
import { i18n } from "../i18n";
import { LanguageSync } from "../i18n/sync";
import { startExceptionReporting } from "../telemetry/exceptions";
import { usePalette } from "../theme/palette";
import { WidgetSync } from "../widgets/sync";

startExceptionReporting();

// A link straight to a review, such as from a widget, still has the tabs under it.
export const unstable_settings = { initialRouteName: "(tabs)" };

// The splash stays until the stored session is read, so a signed-in learner never sees sign-in flash past.
SplashScreen.preventAutoHideAsync();

// In a development build the dev menu opens the design system, as the web has /design.
if (__DEV__) {
  void registerDevMenuItems([{ name: "Design system", callback: () => router.push("/design") }]);
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider i18n={i18n}>
          <KeyboardProvider>
            <Root />
          </KeyboardProvider>
        </I18nProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const dark = useColorScheme() === "dark";
  const p = usePalette();
  const session = useSession();
  const learnerId = session.data?.user.id;
  const signedIn = Boolean(session.data);
  // A 426 from any request: this release is too old for the API, so nothing else can work.
  const update = useUpdateRequired();
  useEffect(() => {
    if (!session.isPending || update) SplashScreen.hideAsync();
  }, [session.isPending, update]);
  const base = dark ? DarkTheme : DefaultTheme;
  // The navigation theme carries the room, so native chrome never flashes white between tabs.
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: p.canvas,
      card: p.canvas,
      text: p.text,
      border: p.edge,
      primary: p.text,
    },
  };
  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      {!session.isPending && <LanguageSync signedIn={signedIn} />}
      {learnerId && !update && (
        <>
          <Sync learnerId={learnerId} />
          <WidgetSync />
        </>
      )}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.canvas } }}>
        {/* First, so a link opened while it shows lands on it rather than on a refused screen. */}
        <Stack.Protected guard={!!update}>
          <Stack.Screen name="update" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!update && !signedIn}>
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={!update && signedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          {/* Over Today rather than in place of it, so pulling the review's top bar down shows Today. */}
          <Stack.Screen
            name="review"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
          <Stack.Screen
            name="capture"
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
          {/* Peeks at the run and today, and drags up for the month. phone.md. */}
          <Stack.Screen
            name="streak"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [0.62, 1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 30,
              contentStyle: {
                backgroundColor: isGlassEffectAPIAvailable() ? "transparent" : p.sheet,
              },
            }}
          />
        </Stack.Protected>
        {/* The design system is for development builds; release builds redirect it home. */}
        {__DEV__ && <Stack.Screen name="design" />}
      </Stack>
    </ThemeProvider>
  );
}
