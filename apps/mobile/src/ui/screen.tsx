import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { type Href, useIsPreview, useRouter } from "expo-router";
import { Fragment, type ReactElement, type ReactNode, useState } from "react";
import {
  I18nManager,
  type ListRenderItem,
  RefreshControl,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
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

/** A long list the page holds, drawn as it scrolls into view rather than all at once. */
export interface ScreenList<T> {
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  /** Whatever else a row reads, so a change to it draws the rows again. */
  extraData?: unknown;
  /** Under the list, such as room for a pinned toolbar. */
  footer?: ReactElement | false | null;
}

interface Props<T> {
  title: string;
  /** A tab carries the streak and capture; a page carries its own actions and a named back. */
  kind?: "tab" | "page";
  /** Where a page goes back to: its parent, named, whatever the history holds. */
  back?: { label: string; to: Href };
  /** Buttons pinned at the bar's end; on a tab they take the place of the streak and capture. */
  actions?: ReactNode;
  /**
   * A page's own header in place of its large title, such as a published deck's cards and name;
   * the title then shows only in the bar, once the header has scrolled under it.
   */
  header?: ReactNode;
  /**
   * A colour of the page's own under its header, such as a deck's hue: `fade` runs it up under the
   * bar and lets it fade out below the header, `pool` lays it as a still pool of light behind it.
   */
  ground?: { colour: string; shape: "fade" | "pool" };
  /**
   * Where the page's name ends inside `header`, from its top. The bar's title then arrives as that
   * name slides under the bar, rather than once the whole header has gone.
   */
  titleAt?: number;
  /** The bar's actions arrive with the bar's title, as the header's own button scrolls away. */
  actionsArrive?: boolean;
  /** A sentence under a page's large title that says what the page is for, held close to the title. */
  description?: string;
  /** Called as the end of a long page comes near, so a list loads on as it is read. */
  onEndReached?: () => void;
  /** Pulling the page down calls this and shows iOS's spinner until it settles, as Mail refreshes. */
  onRefresh?: () => Promise<unknown>;
  /** Told once each time the page scrolls past this content offset, or back above it. */
  past?: { y: number; onChange: (past: boolean) => void } | undefined;
  /** Rows under `children`, virtualized so a deck of thousands opens as fast as a short one. */
  list?: ScreenList<T> | undefined;
  children: ReactNode;
}

/** A long-press preview shows a screen's height of a list, and sits inside the page it was raised from. */
const PREVIEW_ROWS = 12;
const NO_SEPARATORS = {
  highlight: () => {},
  unhighlight: () => {},
  updateProps: () => {},
};

/** How close to the end of a page, in points, a list starts loading what comes next. */
const END_NEAR = 600;
/** How far the page scrolls before the bar is compact: the large title's line has gone under it. */
const TITLE_GONE = 44;
/** A page's title docked in the bar, centred at text-md against the large title's text-3xl. */
const SMALL = 17 / 34;
/** A tab's title stays at the start, larger, as iOS's inline large title does: text-xl. */
const INLINE_LARGE = 22 / 34;
/** What a title in the bar leaves on each side: a back, or two round actions and their gap. */
const BAR_SIDE = 120;
/** A title travelling into the bar may run wider, since it shrinks as it goes. */
const TRAVEL_SIDE = 96;

/**
 * Every screen is built with Screen, as on the web: the chrome tells you how to leave. The bar is
 * pinned with its actions, as iOS keeps its own. Scrolling, the large title travels into the bar
 * and shrinks, a page's named back folds into a round glass back, and what scrolls beneath softens
 * into the room. phone.md "Navigation".
 */
export function Screen<T = never>({
  title,
  kind = "page",
  back,
  actions,
  header: own,
  ground,
  titleAt,
  actionsArrive = false,
  description,
  onEndReached,
  onRefresh,
  past,
  list,
  children,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  // A long-press preview has no status bar to clear and nothing in it can be tapped, so it has no bar row.
  const preview = useIsPreview();
  const top = preview ? 0 : insets.top;
  const row = preview ? 24 : 56;
  const router = useRouter();
  const { t } = useLingui();
  const p = usePalette();
  const y = useSharedValue(0);
  const [compact, setCompact] = useState(false);
  const hasEnd = !!onEndReached;
  const endJS = () => onEndReached?.();
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    if (
      hasEnd &&
      e.contentSize.height - e.layoutMeasurement.height - e.contentOffset.y < END_NEAR
    ) {
      runOnJS(endJS)();
    }
  });
  const pastY = past?.y ?? Number.POSITIVE_INFINITY;
  const pastChange = past?.onChange;
  const tellPast = (now: boolean) => pastChange?.(now);
  useAnimatedReaction(
    () => y.value > pastY,
    // The first value is reported too, so a page already scrolled says so when the point moves.
    (now, was) => {
      if (now !== was) runOnJS(tellPast)(now);
    },
    [pastY, pastChange],
  );
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
  // A page title too long for one line wraps in the page, and the bar's title fades in as it leaves.
  const [wraps, setWraps] = useState(false);
  const header =
    own ??
    (wraps ? (
      <Text className="text-3xl font-medium tracking-tight text-text" accessibilityRole="header">
        {title}
      </Text>
    ) : undefined);
  const restY = kind === "tab" ? top + (row - box.h) / 2 : top + row - 4;
  const dock = kind === "tab" ? INLINE_LARGE : SMALL;
  const dockY = top + (row - box.h * dock) / 2;
  const travel = Math.max(restY - dockY, TITLE_GONE);
  const [headerHeight, setHeaderHeight] = useState(0);
  const rtl = I18nManager.isRTL;
  // A worklet copies what it closes over, so it reads a flag rather than the header's elements.
  const hasHeader = !!header;
  // The header's content starts 8 pt below the bar, so its name is under the bar 8 pt sooner.
  const named = titleAt === undefined ? undefined : titleAt + 8;
  const moving = useAnimatedStyle(() => {
    if (hasHeader) {
      // The header holds the name at rest; the bar's title arrives as the header leaves.
      const w = Math.min(box.w * dock, screen - 2 * BAR_SIDE);
      const x = (screen - w) / 2;
      return {
        // Until the header is measured the bar's title stays hidden, so it never flashes in.
        opacity: !headerHeight
          ? 0
          : interpolate(
              y.value,
              // A short header, such as a card's term, still starts with the bar's title hidden.
              named !== undefined
                ? [Math.max(named - 40, 0), Math.max(named, 10)]
                : [Math.max(headerHeight - 80, 0), Math.max(headerHeight - 30, 10)],
              [0, 1],
              Extrapolation.CLAMP,
            ),
        transformOrigin: rtl ? "right top" : "left top",
        transform: [{ translateX: rtl ? -x : x }, { translateY: dockY }, { scale: dock }],
      };
    }
    const k = interpolate(y.value, [0, travel], [0, 1], Extrapolation.CLAMP);
    const w = Math.min(box.w * dock, screen - 2 * TRAVEL_SIDE);
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
  const [arrived, setArrived] = useState(false);
  useAnimatedReaction(
    () => headerHeight > 0 && y.value > headerHeight - 65,
    (now, was) => {
      if (now !== was) runOnJS(setArrived)(now);
    },
  );
  const side = useAnimatedStyle(() => {
    if (actionsArrive) {
      const k = interpolate(
        y.value,
        [headerHeight - 90, headerHeight - 40],
        [0, 1],
        Extrapolation.CLAMP,
      );
      return { opacity: headerHeight ? k : 0, transform: [{ scale: 0.7 + 0.3 * k }] };
    }
    // A tab's streak and capture stay one size as the page scrolls.
    return { opacity: 1, transform: [{ scale: 1 }] };
  });
  // Nothing crosses what the lantern lights at rest; the band only gathers once content moves.
  const band = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const bar = top + row;
  // Over a page's own colour the bar takes that colour, so it never lays a grey band across it.
  const roof = ground?.colour ?? p.canvas;
  const trailing = kind === "tab" ? <TabActions own={actions} /> : actions;
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh
    ? () => {
        setRefreshing(true);
        onRefresh().finally(() => setRefreshing(false));
      }
    : undefined;

  const scroll = {
    className: "flex-1",
    contentContainerStyle: { paddingTop: bar, paddingBottom: insets.bottom + 110 },
    onScroll,
    scrollEventThrottle: 16,
    // The pinned bar already clears the status bar; iOS's own tab bar would add the inset again.
    contentInsetAdjustmentBehavior: "never",
    refreshControl: refresh && (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={refresh}
        tintColor={p.muted}
        progressViewOffset={bar}
      />
    ),
  } as const;
  const content = (
    <>
      {header ? (
        <View
          className="-mx-5 px-5 pb-7"
          // A preview has no bar to clear, so its header starts near the top, as a page's title does.
          style={{ marginTop: -bar, paddingTop: preview ? 12 : bar + 8 }}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height - bar)}
        >
          {ground && <Ground {...ground} height={bar + headerHeight} />}
          {header}
        </View>
      ) : (
        /* Holds the title's place in the page; the title itself travels in the bar above. */
        <View
          className={kind === "tab" ? "-mt-14 h-14" : "-mt-1"}
          style={kind === "page" ? { height: box.h } : undefined}
          accessible
          accessibilityRole="header"
          accessibilityLabel={title}
        />
      )}
      {kind === "page" && !own && (
        <Text
          className="absolute text-3xl font-medium tracking-tight opacity-0"
          style={{ width: screen - 40 }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          onTextLayout={(e) => setWraps(e.nativeEvent.lines.length > 1)}
        >
          {title}
        </Text>
      )}
      {/* Pulled up from the page's 28 pt gap to 8 pt, so it reads as the title's own line. */}
      {description && <Text className="-mt-5 text-base text-text-2">{description}</Text>}
      {children}
    </>
  );

  return (
    <View className="flex-1 bg-canvas">
      {list && !preview ? (
        <Animated.FlatList
          {...scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ ...scroll.contentContainerStyle, paddingHorizontal: 20 }}
          ListHeaderComponent={<View className="gap-7">{content}</View>}
          ListFooterComponent={list.footer || null}
          // `data` is read only, as FlatList itself never changes it.
          data={list.data as T[]}
          renderItem={list.renderItem}
          keyExtractor={list.keyExtractor}
          extraData={list.extraData}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={9}
        />
      ) : (
        <Animated.ScrollView
          {...scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 gap-7"
        >
          {content}
          {/* A preview is drawn inside its page's own scroll view, where a list cannot nest. */}
          {list && (
            // Its rows meet the page's content as the list's own do, without the page's gap.
            <View className="-mt-7">
              {list.data.slice(0, PREVIEW_ROWS).map((item, index) => (
                <Fragment key={list.keyExtractor(item)}>
                  {list.renderItem({ item, index, separators: NO_SEPARATORS })}
                </Fragment>
              ))}
            </View>
          )}
        </Animated.ScrollView>
      )}
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 top-0"
        style={[
          {
            height: bar + 20,
            // Solid under the bar, softening only below it, so nothing reads through the title.
            experimental_backgroundImage: `linear-gradient(to bottom, ${roof} ${Math.round((bar / (bar + 20)) * 100)}%, ${roof}00)`,
          } as ViewStyle,
          band,
        ]}
      />
      {/* Over a page's own ground the clock sits on the ground at rest; the room gathers on scroll. */}
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 top-0"
        style={ground ? band : undefined}
      >
        <StatusFade height={top} colour={roof} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        className="absolute start-0 top-0"
        // With a header the name shows only in the bar, so it shortens to clear the bar's buttons.
        style={[{ maxWidth: hasHeader ? (screen - 2 * BAR_SIDE) / dock : screen - 40 }, moving]}
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
      {!preview && (
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 top-0 h-14 flex-row items-center justify-between gap-3 px-5"
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
          <Animated.View
            className="shrink-0"
            style={side}
            // Actions that have not arrived yet are out of reach of a finger and of VoiceOver.
            pointerEvents={actionsArrive && !arrived ? "none" : "auto"}
            accessibilityElementsHidden={actionsArrive && !arrived}
            importantForAccessibility={actionsArrive && !arrived ? "no-hide-descendants" : "auto"}
          >
            {trailing}
          </Animated.View>
        </View>
      )}
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
  const { width: screen, fontScale } = useWindowDimensions();
  // A long name stops short of the bar's actions, so they are never pushed off the screen.
  const widest = Math.round(screen * 0.42);
  // Measured again when the name or the text size changes, so it is never clipped to a stale width.
  const measuring = `${label}:${fontScale}`;
  const [measured, setMeasured] = useState({ for: "", width: 0 });
  const width = measured.for === measuring ? measured.width : 0;
  const name = useAnimatedStyle(() => {
    const k = interpolate(y.value, [8, TITLE_GONE], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - k, width: width ? width * (1 - k) : undefined };
  });
  const chevron = <Icon name="back" size={20} colour={p.text} />;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      className="-ms-2 shrink"
    >
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
            style={{ maxWidth: widest }}
            onLayout={(e) => {
              if (!width) setMeasured({ for: measuring, width: e.nativeEvent.layout.width });
            }}
          >
            {label}
          </Text>
        </Animated.View>
      </View>
    </Press>
  );
}

/** How far a page's ground spreads past the bottom of its header before it has faded out. */
const SPREAD = 220;
/** Pulling past the top shows the ground, not the room, so the header never comes unstuck. */
const OVERSCROLL = 800;

/** A page's own colour behind its header, faded out rather than cut off. */
function Ground({
  colour,
  shape,
  height,
}: {
  colour: string;
  shape: "fade" | "pool";
  height: number;
}) {
  const total = (shape === "fade" ? OVERSCROLL : 0) + height + SPREAD;
  const solid = Math.round(((total - SPREAD - height * 0.45) / total) * 100);
  const image =
    shape === "fade"
      ? `linear-gradient(to bottom, ${colour} ${solid}%, ${colour}00 100%)`
      : `radial-gradient(90% 60% at 30% 35%, ${colour}, ${colour}73 55%, ${colour}00 88%)`;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0"
      style={
        {
          top: shape === "fade" ? -OVERSCROLL : 0,
          height: total,
          experimental_backgroundImage: image,
        } as ViewStyle
      }
    />
  );
}

/** Content scrolling up softens into the room under the status bar instead of hitting the clock. */
function StatusFade({ height, colour }: { height: number; colour: string }) {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 top-0"
      style={
        {
          height: height + 12,
          experimental_backgroundImage: `linear-gradient(to bottom, ${colour} 55%, ${colour}00)`,
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
  fill,
  onPress,
}: {
  icon: IconName;
  /** What pressing does, for VoiceOver. */
  label: string;
  /** The tab's standing action. */
  amber?: boolean;
  /** A mark that is set, such as a card's star, drawn filled in this colour. */
  fill?: string;
  onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <Press onPress={onPress} drawn={40} accessibilityRole="button" accessibilityLabel={label}>
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
          colour={fill ?? (amber ? p["amber-ink"] : p.text)}
          filled={!!fill}
          strokeWidth={amber ? 2.25 : 2}
        />
      </GlassSurface>
    </Press>
  );
}

/** A word in the bar, such as Edit and Done, as glass of the icon buttons' height. */
export function BarText({
  label,
  strong = false,
  onPress,
}: {
  label: string;
  /** Done, which ends a mode: set heavier, as iOS sets it. */
  strong?: boolean;
  onPress: () => void;
}) {
  return (
    <Press onPress={onPress} accessibilityRole="button">
      <GlassSurface
        tint="room"
        style={{ height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" }}
      >
        <Text className={`text-md text-text ${strong ? "font-semibold" : "font-medium"}`}>
          {label}
        </Text>
      </GlassSurface>
    </Press>
  );
}

/** One of a bar group's buttons; `on` marks one that is narrowing the page, as a chosen filter. */
export interface BarGroupItem {
  icon: IconName;
  /** What pressing does, for VoiceOver. */
  label: string;
  on?: boolean;
  /** Drawn filled in this colour, as a set Important star is. */
  fill?: string;
  onPress: () => void;
}

/**
 * Related bar buttons share one glass capsule, as iOS groups a toolbar's items, so Explore's filter
 * and search read as one control.
 */
export function BarGroup({ items }: { items: BarGroupItem[] }) {
  const p = usePalette();
  return (
    <GlassSurface
      tint="room"
      style={{ height: 40, borderRadius: 20, flexDirection: "row", paddingHorizontal: 2 }}
    >
      {items.map((item) => (
        <Press
          key={item.icon}
          onPress={item.onPress}
          drawn={40}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: item.on }}
          className="h-10 w-11 items-center justify-center"
        >
          <Icon
            name={item.icon}
            size={19}
            colour={item.fill ?? p.text}
            filled={!!item.fill}
            strokeWidth={item.on ? 2.5 : 2}
          />
          {item.on && <View className="absolute end-2.5 top-2 size-2 rounded-full bg-amber" />}
        </Press>
      ))}
    </GlassSurface>
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
