import "../global.css";
import "../data/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSession } from "../auth/client";
import { usePalette } from "../theme/palette";
import { WidgetSync } from "../widgets/sync";

// A link straight to a review, such as from a widget, still has the tabs under it.
export const unstable_settings = { initialRouteName: "(tabs)" };

const queryClient = new QueryClient();

// The splash stays until the stored session is read, so a signed-in learner never sees sign-in flash past.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Root />
        <WidgetSync />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const dark = useColorScheme() === "dark";
  const p = usePalette();
  const session = useSession();
  const signedIn = Boolean(session.data);
  useEffect(() => {
    if (!session.isPending) SplashScreen.hideAsync();
  }, [session.isPending]);
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.canvas } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="review"
            options={{
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="capture"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              sheetCornerRadius: 30,
              contentStyle: { backgroundColor: p.canvas },
            }}
          />
          <Stack.Screen
            name="streak"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: "fitToContents",
              sheetGrabberVisible: true,
              sheetCornerRadius: 30,
              contentStyle: { backgroundColor: p.canvas },
            }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
