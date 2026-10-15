import "../global.css";
import { I18nProvider } from "@lingui/react";
import { useUpdateRequired } from "@lymi/client/update-required";
import { useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { registerDevMenuItems } from "expo-dev-menu";
import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSession } from "../auth/client";
import { forgetLearner, persistOptions } from "../data/cache";
import { queryClient } from "../data/client";
import { Sync } from "../data/sync";
import { QuickActionsSync } from "../entry/quick-actions";
import { i18n } from "../i18n";
import { LanguageSync } from "../i18n/sync";
import { cancelReminders, listenForLater } from "../reminders/notifications";
import { ReminderSync } from "../reminders/sync";
import { ShareSync } from "../share/sync";
import { SplashGuard, useGiveUp } from "../splash/guard";
import { Kindling } from "../splash/kindling";
import { replaySplash, useReplays } from "../splash/replay";
import { Analytics } from "../telemetry/analytics";
import { startTelemetry } from "../telemetry/posthog";
import { usePalette } from "../theme/palette";
import { FloatingBarHost } from "../ui/floating-bar";
import { clearToasts, ToastHost } from "../ui/toast-host";
import { useWelcoming } from "../welcome/gate";
import { clearWidgets, WidgetSync } from "../widgets/sync";

startTelemetry();

// A reminder's In an hour wakes the app without a screen, so it is answered before any renders.
listenForLater();

// A link straight to a review, such as from a widget, still has the tabs under it.
export const unstable_settings = { initialRouteName: "(tabs)" };

// The launch screen stays until Kindling has drawn the same frame over the app, so nothing flashes.
SplashScreen.preventAutoHideAsync();

// In a development build the dev menu opens the design system, as the web has /design, and replays the splash.
if (__DEV__) {
  void registerDevMenuItems([
    { name: "Design system", callback: () => router.push("/design") },
    { name: "Replay the splash", callback: replaySplash },
  ]);
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Today, Library and each deck open as of the last sync, even with no connection. */}
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <I18nProvider i18n={i18n}>
          <KeyboardProvider>
            <Root />
          </KeyboardProvider>
        </I18nProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const dark = useColorScheme() === "dark";
  const p = usePalette();
  const session = useSession();
  const learnerId = session.data?.user.id;
  const signedIn = Boolean(session.data);
  // A new account goes from sign-in straight into Welcome: sign-in stays up until the account is
  // read, so Today never shows first. Undefined while that read is under way.
  const welcoming = useWelcoming(learnerId);
  const entered = signedIn && welcoming !== undefined;
  // A 426 from any request: this release is too old for the API, so nothing else can work.
  const update = useUpdateRequired();
  // A cold start mounts this once; a return from the background does not, so the splash never replays.
  const [kindling, setKindling] = useState(true);
  const replays = useReplays();
  useEffect(() => {
    if (replays > 0) setKindling(true);
  }, [replays]);
  const shown = useCallback(() => SplashScreen.hideAsync(), []);
  const done = useCallback(() => setKindling(false), []);
  // The splash lands on Today's lantern, or Welcome's when signed out, chosen from the session since the
  // route can still read Welcome for a moment after it is read. A link into anywhere else has none.
  const path = usePathname();
  const landsOnFirst = !signedIn || ["/", "/today", "/welcome"].includes(path);
  const first = !landsOnFirst || welcoming ? "elsewhere" : signedIn ? "today" : "welcome";
  const lands =
    (session.isPending || (signedIn && welcoming === undefined)) && !update
      ? undefined
      : update
        ? "elsewhere"
        : first;
  const giveUp = useCallback(() => {
    void SplashScreen.hideAsync();
    setKindling(false);
  }, []);
  useGiveUp(kindling, lands !== undefined, giveUp);
  // Signed out, or a session that lapsed: whoever signs in next starts with nothing of this learner's,
  // and the widgets, which outlive the app, stop showing them.
  const qc = useQueryClient();
  const signedOut = !session.isPending && !signedIn;
  useEffect(() => {
    if (!signedOut) return;
    forgetLearner(qc);
    clearToasts();
    clearWidgets();
    void cancelReminders();
  }, [signedOut, qc]);
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
      {!session.isPending && !update && <ShareSync signedIn={signedIn} />}
      <Analytics learnerId={signedOut ? null : learnerId} />
      <QuickActionsSync />
      {learnerId && !update && (
        <>
          <Sync learnerId={learnerId} />
          <WidgetSync />
          <ReminderSync />
        </>
      )}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.canvas } }}>
        {/* First, so a link opened while it shows lands on it rather than on a refused screen. */}
        <Stack.Protected guard={!!update}>
          <Stack.Screen name="update" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!update && !entered}>
          <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        </Stack.Protected>
        {/* Welcome is the only signed-in screen until it is done, and the first one a new account
            lands on, so it comes before the deck links; it fades in place, as sign-in does. */}
        <Stack.Protected guard={!update && entered && !!welcoming}>
          <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack.Protected>
        {/* A shared deck's link opens signed in or out; signed out, it signs in and comes back. */}
        <Stack.Protected guard={!update}>
          <Stack.Screen name="join/[token]" />
          <Stack.Screen name="add/[slug]" />
        </Stack.Protected>
        <Stack.Protected guard={!update && entered && !welcoming}>
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
          <Stack.Screen
            name="edit-card"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              contentStyle: {
                backgroundColor: isGlassEffectAPIAvailable() ? "transparent" : p.sheet,
              },
            }}
          />
          {/* Over everything, tab bar included, since its field sits where the tab bar does. */}
          <Stack.Screen
            name="search"
            options={{ presentation: "fullScreenModal", animation: "fade" }}
          />
          <Stack.Screen
            name="new-deck"
            options={{
              presentation: "formSheet",
              // A full sheet, so its Language and How cards are asked sheets stack over it; iOS hides a
              // part-height sheet under a new one. phone.md "Sheets".
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: p.sheet },
            }}
          />
          <Stack.Screen
            name="series"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: "fitToContents",
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: p.sheet },
            }}
          />
          <Stack.Screen
            name="series-decks"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
              contentStyle: {
                backgroundColor: isGlassEffectAPIAvailable() ? "transparent" : p.sheet,
              },
            }}
          />
          <Stack.Screen
            name="series-order"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: "fitToContents",
              // A row dragged down would otherwise close the sheet; Close is the way out.
              gestureEnabled: false,
              contentStyle: { backgroundColor: p.sheet },
            }}
          />
          {/* Peeks at the run and today, and drags up for the month. phone.md. */}
          {/* Over everything, tab bar included, since its field sits where the tab bar does. */}
          <Stack.Screen
            name="explore-search"
            options={{ presentation: "fullScreenModal", animation: "fade" }}
          />
          {/* Opens on inviting and the join link, and drags up for everyone in the deck. */}
          <Stack.Screen
            name="share"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [0.62, 1],
              sheetGrabberVisible: true,
              contentStyle: {
                backgroundColor: isGlassEffectAPIAvailable() ? "transparent" : p.sheet,
              },
            }}
          />
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
      {signedIn && !update && <FloatingBarHost />}
      {signedIn && !update && <ToastHost />}
      {kindling && (
        <SplashGuard key={replays} onFail={giveUp}>
          <Kindling lands={lands} onShown={shown} onDone={done} />
        </SplashGuard>
      )}
    </ThemeProvider>
  );
}
