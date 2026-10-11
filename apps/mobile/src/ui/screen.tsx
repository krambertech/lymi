import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "../brand/flame";
import { useStore } from "../data/store";
import { usePalette } from "../theme/palette";
import { useFontFamily } from "./font";
import { Icon, Press, Text } from "./primitives";

/** Stack options for a tab's own stack: native large titles, or none for the Lymi top bar. */
export function useStackOptions() {
  const { directions } = useStore();
  const p = usePalette();
  const display = useFontFamily(true);
  const body = useFontFamily(false);
  if (directions.chrome !== "native")
    return { headerShown: false, contentStyle: { backgroundColor: p.canvas } };
  return {
    headerShown: true,
    headerTransparent: true,
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTintColor: p.text,
    headerLargeTitleStyle: {
      fontFamily: display,
      fontWeight: "500" as const,
      fontSize: 32,
      color: p.text,
    },
    headerTitleStyle: { fontFamily: body, fontWeight: "500" as const, color: p.text },
    headerBackTitleStyle: { fontFamily: body },
    contentStyle: { backgroundColor: p.canvas },
  };
}

interface Props {
  title: string;
  /** A tab carries the streak and capture; a page carries its own actions and a named back. */
  kind?: "tab" | "page";
  back?: string;
  children: ReactNode;
}

/** Every screen is built with Screen, as on the web: the chrome tells you how to leave. */
export function Screen({ title, kind = "tab", back, children }: Props) {
  const { directions } = useStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const display = useFontFamily(true);

  if (directions.chrome === "native") {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-canvas"
        contentContainerClassName="px-5 pb-16 pt-2 gap-8"
      >
        {/* Stack.Title sets the header fonts itself, so the face is passed to it rather than to the stack. */}
        <Stack.Title
          large
          style={{ fontFamily: display, fontWeight: "500" }}
          largeStyle={{ fontFamily: display, fontWeight: "500", fontSize: 32 }}
        >
          {title}
        </Stack.Title>
        {kind === "tab" && <NativeActions />}
        {children}
      </ScrollView>
    );
  }

  // The bar scrolls with the page, as on the web, so nothing cuts across what the lantern lights.
  // A tab names itself in the bar; a page puts its named back there and its title under it.
  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 gap-7"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 110 }}
      >
        {kind === "tab" ? (
          <View className="-mb-1 h-14 flex-row items-center justify-between">
            <Text
              className="text-3xl font-medium tracking-tight text-text"
              accessibilityRole="header"
            >
              {title}
            </Text>
            <TabActions />
          </View>
        ) : (
          <View className="gap-1">
            <View className="h-14 flex-row items-center">
              <Press
                onPress={() => router.back()}
                className="h-11 flex-row items-center gap-1 -ms-1.5 pe-2"
                accessibilityRole="link"
              >
                <BackChevron />
                <Text className="text-md font-medium text-text-2">{back ?? "Back"}</Text>
              </Press>
            </View>
            <Text
              className="text-3xl font-medium tracking-tight text-text"
              accessibilityRole="header"
            >
              {title}
            </Text>
          </View>
        )}
        {children}
      </ScrollView>
      <StatusFade height={insets.top} />
    </View>
  );
}

/** Content scrolling up softens into the room under the status bar instead of hitting the clock. */
function StatusFade({ height }: { height: number }) {
  const p = usePalette();
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 top-0"
      style={
        {
          height: height + 12,
          experimental_backgroundImage: `linear-gradient(to bottom, ${p.canvas} 55%, ${p.canvas}00)`,
        } as ViewStyle
      }
    />
  );
}

function BackChevron() {
  const p = usePalette();
  return <Icon name="back" size={20} colour={p.text} />;
}

/** The streak pill and capture as native bar items, which iOS 26 seats in glass. */
function NativeActions() {
  const { streak, reviewsToday } = useStore();
  const router = useRouter();
  const p = usePalette();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.View>
        <Press
          onPress={() => router.push("/streak")}
          className="h-9 flex-row items-center gap-1.5 px-2"
          accessibilityLabel={`Streak: ${streak} days in a row`}
        >
          <Flame height={18} state={reviewsToday > 0 || streak > 0 ? "lit" : "out"} />
          <Text className="text-md font-medium text-text" style={{ fontVariant: ["tabular-nums"] }}>
            {streak}
          </Text>
        </Press>
      </Stack.Toolbar.View>
      <Stack.Toolbar.View hidesSharedBackground>
        <Press
          onPress={() => router.push("/capture")}
          className="size-10 items-center justify-center rounded-full bg-amber"
          accessibilityLabel="Add"
        >
          <Icon name="plus" size={20} colour={p["amber-ink"]} strokeWidth={2.25} />
        </Press>
      </Stack.Toolbar.View>
    </Stack.Toolbar>
  );
}

/** The streak and capture, the two things every tab carries. You is a tab here, so no avatar. */
function TabActions() {
  const { streak, reviewsToday, directions } = useStore();
  const router = useRouter();
  const p = usePalette();
  const glass = directions.chrome === "glass" && isGlassEffectAPIAvailable();
  const streakInner = (
    <>
      <Flame height={18} state={reviewsToday > 0 || streak > 0 ? "lit" : "out"} />
      <Text className="text-md font-medium text-text" style={{ fontVariant: ["tabular-nums"] }}>
        {streak}
      </Text>
    </>
  );
  return (
    <View className="flex-row items-center gap-2.5">
      <Press
        onPress={() => router.push("/streak")}
        accessibilityLabel={`Streak: ${streak} days in a row`}
        accessibilityRole="button"
      >
        {glass ? (
          <GlassView
            isInteractive
            glassEffectStyle="regular"
            tintColor={`${p.canvas}59`}
            style={{
              height: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 14,
              borderRadius: 999,
            }}
          >
            {streakInner}
          </GlassView>
        ) : (
          <View className="h-10 flex-row items-center gap-1.5 px-2">{streakInner}</View>
        )}
      </Press>
      <Press
        onPress={() => router.push("/capture")}
        className="size-10 items-center justify-center rounded-full bg-amber"
        accessibilityLabel="Add"
      >
        <Icon name="plus" size={20} colour={p["amber-ink"]} strokeWidth={2.25} />
      </Press>
    </View>
  );
}
