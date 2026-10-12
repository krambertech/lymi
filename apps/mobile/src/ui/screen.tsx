import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { type Href, useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { I18nManager, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "../brand/flame";
import { useDay } from "../data/queries";
import { useGlass } from "../theme/glass";
import { usePalette } from "../theme/palette";
import { GlassSurface } from "./glass";
import type { IconName } from "./icons";
import { Icon, Press, Text } from "./primitives";

/** Each tab's stack draws no header: every screen builds its own bar with Screen. */
export function useStackOptions() {
  const p = usePalette();
  return { headerShown: false, contentStyle: { backgroundColor: p.canvas } };
}

interface Props {
  title: string;
  /** A tab carries the streak and capture; a page carries its own actions and a named back. */
  kind?: "tab" | "page";
  /** Where a page goes back to: its parent, named, whatever the history holds. */
  back?: { label: string; to: Href };
  /** Buttons pinned at the bar's end; on a tab they take the place of the streak and capture. */
  actions?: ReactNode;
  children: ReactNode;
}

/** How far the page scrolls before the bar is compact: the large title's line has gone under it. */
const TITLE_GONE = 44;
/** A page's title docked in the bar, centred at text-md against the large title's text-3xl. */
const SMALL = 17 / 34;
/** A tab's title stays at the start, larger, as iOS's inline large title does: text-xl. */
const INLINE_LARGE = 22 / 34;

/**
 * Every screen is built with Screen, as on the web: the chrome tells you how to leave. The bar is
 * pinned with its actions, as iOS keeps its own. Scrolling, the large title travels into the bar
 * and shrinks, a page's named back folds into a round glass back, and what scrolls beneath softens
 * into the room. phone.md "Navigation".
 */
export function Screen({ title, kind = "page", back, actions, children }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLingui();
  const p = usePalette();
  const y = useSharedValue(0);
  const [compact, setCompact] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  useAnimatedReaction(
    () => y.value > TITLE_GONE / 2,
    (now, was) => {
      if (now !== was) runOnJS(setCompact)(now);
    },
  );
  // One title travels: it rides up with the page and shrinks to the bar's size on the way, then
  // stays there.
  const { width: screen } = useWindowDimensions();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const restY = kind === "tab" ? insets.top + (56 - box.h) / 2 : insets.top + 52;
  const dock = kind === "tab" ? INLINE_LARGE : SMALL;
  const dockY = insets.top + (56 - box.h * dock) / 2;
  const travel = Math.max(restY - dockY, TITLE_GONE);
  const rtl = I18nManager.isRTL;
  const moving = useAnimatedStyle(() => {
    const k = interpolate(y.value, [0, travel], [0, 1], Extrapolation.CLAMP);
    const w = Math.min(box.w * dock, screen - 2 * 96);
    // A page centres it between its back and its actions; a tab keeps it at the start, across
    // from the streak and capture, so the bar does not lean to one side.
    const x = kind === "tab" ? 20 : 20 + ((screen - w) / 2 - 20) * k;
    return {
      opacity: box.w ? 1 : 0,
      transformOrigin: rtl ? "right top" : "left top",
      transform: [
        { translateX: rtl ? -x : x },
        { translateY: restY + (dockY - restY) * k },
        { scale: 1 - (1 - dock) * k },
      ],
    };
  });
  const side = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(y.value, [0, TITLE_GONE], [1, 0.92], Extrapolation.CLAMP) }],
  }));
  // Nothing crosses what the lantern lights at rest; the band only gathers once content moves.
  const band = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const bar = insets.top + 56;
  const trailing = kind === "tab" ? <TabActions own={actions} /> : actions;

  return (
    <View className="flex-1 bg-canvas">
      <Animated.ScrollView
        className="flex-1"
        contentContainerClassName="px-5 gap-7"
        contentContainerStyle={{ paddingTop: bar, paddingBottom: insets.bottom + 110 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        // The pinned bar already clears the status bar; iOS's own tab bar would add the inset again.
        contentInsetAdjustmentBehavior="never"
      >
        {/* Holds the title's place in the page; the title itself travels in the bar above. */}
        <View
          className={kind === "tab" ? "-mt-14 h-14" : "-mt-1"}
          style={kind === "page" ? { height: box.h } : undefined}
          accessible
          accessibilityRole="header"
          accessibilityLabel={title}
        />
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 top-0"
        style={[
          {
            height: bar + 20,
            // Solid under the bar, softening only below it, so nothing reads through the title.
            experimental_backgroundImage: `linear-gradient(to bottom, ${p.canvas} ${Math.round((bar / (bar + 20)) * 100)}%, ${p.canvas}00)`,
          } as ViewStyle,
          band,
        ]}
      />
      <StatusFade height={insets.top} />
      <Animated.View
        pointerEvents="none"
        className="absolute start-0 top-0"
        style={[{ maxWidth: screen - 40 }, moving]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text
          className="text-3xl font-medium tracking-tight text-text"
          numberOfLines={1}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
          }}
        >
          {title}
        </Text>
      </Animated.View>
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 h-14 flex-row items-center justify-between px-5"
        style={{ marginTop: insets.top }}
      >
        {kind === "page" ? (
          <Back
            label={back?.label ?? t`Back`}
            compact={compact}
            y={y}
            onPress={() => (back ? router.dismissTo(back.to) : router.back())}
          />
        ) : (
          <View />
        )}
        <Animated.View style={side}>{trailing}</Animated.View>
      </View>
    </View>
  );
}

/** A page's way back: named at rest, folded into a round glass back once the bar is compact. */
function Back({
  label,
  compact,
  y,
  onPress,
}: {
  label: string;
  compact: boolean;
  y: SharedValue<number>;
  onPress: () => void;
}) {
  const p = usePalette();
  const glass = useGlass();
  const [width, setWidth] = useState(0);
  const name = useAnimatedStyle(() => {
    const k = interpolate(y.value, [8, TITLE_GONE], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - k, width: width ? width * (1 - k) : undefined };
  });
  const chevron = <Icon name="back" size={20} colour={p.text} />;
  return (
    <Press onPress={onPress} accessibilityRole="link" accessibilityLabel={label} className="-ms-2">
      <View className="h-11 flex-row items-center">
        {glass ? (
          <GlassView
            isInteractive
            glassEffectStyle={{ style: compact ? "regular" : "none", animate: true }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {chevron}
          </GlassView>
        ) : (
          <View className="size-10 items-center justify-center">{chevron}</View>
        )}
        <Animated.View className="-ms-1.5 overflow-hidden" style={name}>
          <Text
            className="text-md font-medium text-text-2"
            numberOfLines={1}
            ellipsizeMode="clip"
            onLayout={(e) => width || setWidth(e.nativeEvent.layout.width)}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </Press>
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

/** A round glass button in the top bar, the streak's height, so the bar reads as one row. */
export function BarButton({
  icon,
  label,
  amber = false,
  onPress,
}: {
  icon: IconName;
  /** What pressing does, for VoiceOver. */
  label: string;
  /** The tab's standing action. */
  amber?: boolean;
  onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <GlassSurface
        tint={amber ? "amber" : "room"}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={icon}
          size={amber ? 20 : 19}
          colour={amber ? p["amber-ink"] : p.text}
          strokeWidth={amber ? 2.25 : 2}
        />
      </GlassSurface>
    </Press>
  );
}

/**
 * The streak and capture, the two things a tab carries unless it brings its own: Library trades
 * them for search and a plus that also makes decks and series.
 */
function TabActions({ own }: { own?: ReactNode }) {
  const { t } = useLingui();
  const { streak, flame } = useDay();
  const router = useRouter();
  const p = usePalette();
  const glass = isGlassEffectAPIAvailable();
  if (own) return <View className="flex-row items-center gap-2.5">{own}</View>;
  const streakInner = (
    <>
      <Flame height={18} state={flame} />
      <Text className="text-md font-medium text-text" style={{ fontVariant: ["tabular-nums"] }}>
        {streak}
      </Text>
    </>
  );
  return (
    <View className="flex-row items-center gap-2.5">
      <Press
        onPress={() => router.push("/streak")}
        accessibilityLabel={t`Streak: ${plural(streak, { one: "# day in a row", other: "# days in a row" })}`}
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
      {/* Add a word rises as a sheet from below, as every task with an end does. phone.md. */}
      <BarButton icon="plus" label={t`Add a card`} amber onPress={() => router.push("/capture")} />
    </View>
  );
}
