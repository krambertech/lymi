import "../global.css";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StoreProvider, useStore } from "../data/store";
import { usePalette } from "../theme/palette";
import { WidgetSync } from "../widgets/sync";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <Root />
        <WidgetSync />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const dark = useColorScheme() === "dark";
  const p = usePalette();
  const { directions } = useStore();
  // A sheet that stops short of the top is glass on iOS 26; a full-height one keeps the room.
  const glassSheet = directions.chrome === "native";
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
            ...(glassSheet ? {} : { sheetCornerRadius: 30 }),
            contentStyle: { backgroundColor: glassSheet ? "transparent" : p.canvas },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
