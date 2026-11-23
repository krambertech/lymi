import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { unisolate } from "@lymi/core";
import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { type Href, useIsPreview, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  Fragment,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from "react";
import {
  type FlatList,
  I18nManager,
  type ListRenderItem,
  Platform,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "../brand/flame";
import { useDay } from "../data/queries";
import { useGlass } from "../theme/glass";
import { usePalette } from "../theme/palette";
import { ActionMenu } from "./action-menu";
import { GlassSurface } from "./glass";
import type { IconName } from "./icons";
import { Icon, Press, Text } from "./primitives";

export interface ScreenList<T> {
  data: readonly T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  extraData?: unknown;
  footer?: ReactElement | false | null;
  ref?: RefObject<FlatList<T> | null>;
  onScrollToIndexFailed?: (info: { index: number; averageItemLength: number }) => void;
}

interface BaseProps {
  title: string;
  titleLang?: string | null;
  actions?: ReactNode;
  ground?: { colour: string; shape: "fade" | "pool" };
  description?: string;
  onEndReached?: () => void;
  onRefresh?: () => Promise<unknown>;
  past?: { y: number; onChange: (past: boolean) => void } | undefined;
  children: ReactNode;
}

type KindProps =
  | { kind: "tab"; back?: undefined }
  | { kind?: "page"; back?: { label: string; to: Href } };

type HeaderProps =
  | { header?: ReactElement | undefined; titleAt?: undefined; actionsArrive?: undefined }
  | { header: ReactElement; titleAt?: number; actionsArrive?: boolean };

type ScrollerProps<T> =
  | { list?: ScreenList<T> | undefined; scrollKey?: undefined }
  | { list?: undefined; scrollKey?: string | number };

type Props<T> = BaseProps & KindProps & HeaderProps & ScrollerProps<T>;

const PREVIEW_ROWS = 12;
const NO_SEPARATORS = {
  highlight: () => {},
  unhighlight: () => {},
  updateProps: () => {},
};

const END_ROOM = Platform.OS === "android" ? 64 : undefined;
const END_NEAR = 600;
const TITLE_GONE = 44;
const TITLE_TRAVEL = 96;
const SETTLE = Easing.out(Easing.quad);
const SMALL = 17 / 34;
const INLINE_LARGE = 22 / 34;
const BAR_SIDE = 120;
const TRAVEL_SIDE = 96;
const MATERIAL_BAR = Platform.OS === "android";
const DOCK_START = 64;

export function Screen<T = never>({
  title,
  titleLang,
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
  scrollKey,
  list,
  children,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const preview = useIsPreview();
  const top = preview ? 0 : insets.top;
  const row = preview ? 24 : 56;
  const router = useRouter();
  const { t } = useLingui();
  const p = usePalette();
  const y = useSharedValue(0);
  const scroller = useAnimatedRef<Animated.ScrollView>();
  // oxlint-disable react-hooks/exhaustive-deps -- the key is the trigger.
  useEffect(() => {
    if (scrollKey !== undefined) scroller.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);
  // oxlint-enable react-hooks/exhaustive-deps
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
  const { width: screen } = useWindowDimensions();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [wraps, setWraps] = useState(false);
  const header =
    own ??
    (wraps ? (
      <Text
        className="text-3xl font-medium tracking-tight text-ink"
        accessibilityRole="header"
        lang={titleLang}
      >
        {title}
      </Text>
    ) : undefined);
  const restY = kind === "tab" ? top + (row - box.h) / 2 : top + row - 4;
  const dock = kind === "tab" ? INLINE_LARGE : SMALL;
  const dockY = top + (row - box.h * dock) / 2;
  const travel = Math.max(restY - dockY, TITLE_TRAVEL);
  const [headerHeight, setHeaderHeight] = useState(0);
  const rtl = I18nManager.isRTL;
  const hasHeader = !!header;
  const named = titleAt === undefined ? undefined : titleAt + 8;
  const origin = rtl ? "right top" : "left top";
  const headerX = MATERIAL_BAR
    ? DOCK_START
    : (screen - Math.min(box.w * dock, screen - 2 * BAR_SIDE)) / 2;
  const rest: ViewStyle = hasHeader
    ? {
        opacity: headerHeight ? 1 : 0,
        transformOrigin: origin,
        transform: [
          { translateX: rtl ? -headerX : headerX },
          { translateY: dockY },
          { scale: dock },
        ],
      }
    : {
        opacity: box.w ? 1 : 0,
        transform: [{ translateX: rtl ? -20 : 20 }, { translateY: restY }],
      };
  const moving = useAnimatedStyle(() => {
    if (hasHeader) {
      return {
        opacity: interpolate(
          y.value,
          named !== undefined
            ? [Math.max(named - 40, 0), Math.max(named, 10)]
            : [Math.max(headerHeight - 80, 0), Math.max(headerHeight - 30, 10)],
          [0, 1],
          Extrapolation.CLAMP,
        ),
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
      };
    }
    const k = SETTLE(interpolate(y.value, [0, travel], [0, 1], Extrapolation.CLAMP));
    const w = Math.min(box.w * dock, screen - 2 * TRAVEL_SIDE);
    const x = kind === "tab" ? 0 : ((MATERIAL_BAR ? DOCK_START : (screen - w) / 2) - 20) * k;
    return {
      opacity: 1,
      transformOrigin: origin,
      transform: [
        { translateX: rtl ? -x : x },
        { translateY: (dockY - restY) * k },
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
    return { opacity: 1, transform: [{ scale: 1 }] };
  });
  const band = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const bar = top + row;
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
    contentContainerStyle: { paddingTop: bar, paddingBottom: END_ROOM ?? insets.bottom + 110 },
    onScroll,
    scrollEventThrottle: 16,
    contentInsetAdjustmentBehavior: "never",
    refreshControl: refresh && (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={refresh}
        tintColor={p["ink-muted"]}
        progressViewOffset={bar}
      />
    ),
  } as const;
  const content = (
    <>
      {header ? (
        <View
          className="-mx-5 px-5 pb-7"
          style={{ marginTop: -bar, paddingTop: preview ? 12 : bar + 8 }}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height - bar)}
        >
          {ground && <Ground {...ground} height={bar + headerHeight} />}
          {header}
        </View>
      ) : (
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
          lang={titleLang}
        >
          {title}
        </Text>
      )}
      {description && <Text className="-mt-5 text-base text-ink-secondary">{description}</Text>}
      {children}
    </>
  );

  return (
    <View className="flex-1 bg-canvas">
      {list && !preview ? (
        <Animated.FlatList
          ref={list.ref}
          onScrollToIndexFailed={list.onScrollToIndexFailed}
          {...scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ ...scroll.contentContainerStyle, paddingHorizontal: 20 }}
          ListHeaderComponent={<View className="gap-7">{content}</View>}
          ListFooterComponent={list.footer || null}
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
          ref={scroller}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerClassName="px-5 gap-7"
        >
          {content}
          {list && (
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
      {Platform.OS === "ios" ? (
        <SoftEdge height={bar} colour={roof} y={y} />
      ) : (
        <>
          <Animated.View
            pointerEvents="none"
            className="absolute inset-x-0 top-0"
            style={[
              {
                height: bar + 20,
                experimental_backgroundImage: `linear-gradient(to bottom, ${roof} ${Math.round((bar / (bar + 20)) * 100)}%, ${roof}00)`,
              } as ViewStyle,
              band,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            className="absolute inset-x-0 top-0"
            style={ground ? band : undefined}
          >
            <StatusFade height={top} colour={roof} />
          </Animated.View>
        </>
      )}
      <View
        pointerEvents="none"
        className="absolute start-0 top-0"
        style={[
          {
            maxWidth: hasHeader
              ? (MATERIAL_BAR ? screen - DOCK_START - BAR_SIDE : screen - 2 * BAR_SIDE) / dock
              : screen - 40,
          },
          rest,
        ]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Animated.View style={moving}>
          <Text
            className="text-3xl font-medium tracking-tight text-ink"
            numberOfLines={1}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
            }}
            lang={titleLang}
          >
            {title}
          </Text>
        </Animated.View>
      </View>
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
  const widest = Math.round(screen * 0.42);
  const measuring = `${label}:${fontScale}`;
  const [measured, setMeasured] = useState({ for: "", width: 0 });
  const width = measured.for === measuring ? measured.width : 0;
  const name = useAnimatedStyle(() => {
    const k = interpolate(y.value, [8, TITLE_GONE], [0, 1], Extrapolation.CLAMP);
    return { opacity: 1 - k, width: width ? width * (1 - k) : undefined };
  });
  const chevron = MATERIAL_BAR ? (
    <ArrowLeft size={24} color={p.ink} strokeWidth={2} />
  ) : (
    <Icon name="back" size={20} colour={p.ink} />
  );
  if (MATERIAL_BAR) {
    return (
      <Press
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={unisolate(label)}
        className="-ms-2"
      >
        <View className="size-11 items-center justify-center">{chevron}</View>
      </Press>
    );
  }
  return (
    <Press
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={unisolate(label)}
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
            className="text-md font-medium text-ink-secondary"
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

const SPREAD = 220;
const OVERSCROLL = 800;

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

const EDGE_FADE = 28;
const EDGE_BLUR = 40;
const EdgeBlur = Animated.createAnimatedComponent(BlurView);

function SoftEdge({
  height,
  colour,
  y,
}: {
  height: number;
  colour: string;
  y: SharedValue<number>;
}) {
  const blur = useAnimatedProps(() => ({
    intensity: interpolate(y.value, [0, 24], [0, EDGE_BLUR], Extrapolation.CLAMP),
  }));
  const tint = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));
  const solid = Math.round((height / (height + EDGE_FADE)) * 100);
  const fade = (from: string) =>
    ({
      ...StyleSheet.absoluteFill,
      experimental_backgroundImage: `linear-gradient(to bottom, ${from} ${solid}%, ${colour}00)`,
    }) as ViewStyle;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 top-0"
      style={{ height: height + EDGE_FADE }}
    >
      <MaskedView style={StyleSheet.absoluteFill} maskElement={<View style={fade(colour)} />}>
        <EdgeBlur animatedProps={blur} tint="default" style={StyleSheet.absoluteFill} />
      </MaskedView>
      <Animated.View style={[fade(`${colour}b3`), tint]} />
    </View>
  );
}

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

export function BarButton({
  icon,
  label,
  amber = false,
  fill,
  onPress,
}: {
  icon: IconName;
  label: string;
  amber?: boolean;
  fill?: string;
  onPress?: () => void;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      drawn={40}
      accessibilityRole="button"
      accessibilityLabel={unisolate(label)}
    >
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
          colour={fill ?? (amber ? p["amber-ink"] : p.ink)}
          filled={!!fill}
          strokeWidth={amber ? 2.25 : 2}
        />
      </GlassSurface>
    </Press>
  );
}

export function BarText({
  label,
  strong = false,
  onPress,
}: {
  label: string;
  strong?: boolean;
  onPress: () => void;
}) {
  return (
    <Press onPress={onPress} accessibilityRole="button">
      <GlassSurface
        tint="room"
        style={{ height: 40, borderRadius: 20, paddingHorizontal: 16, justifyContent: "center" }}
      >
        <Text className={`text-md text-ink ${strong ? "font-semibold" : "font-medium"}`}>
          {label}
        </Text>
      </GlassSurface>
    </Press>
  );
}

export interface BarGroupItem {
  icon: IconName;
  label: string;
  on?: boolean;
  fill?: string;
  onPress: () => void;
}

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
            colour={item.fill ?? p.ink}
            filled={!!item.fill}
            strokeWidth={item.on ? 2.5 : 2}
          />
          {item.on && <View className="absolute end-2.5 top-2 size-2 rounded-full bg-amber" />}
        </Press>
      ))}
    </GlassSurface>
  );
}

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
      <Text className="text-md font-medium text-ink" style={{ fontVariant: ["tabular-nums"] }}>
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
      <ActionMenu
        label={t`Add a card`}
        symbol="plus"
        look="primary"
        onPrimaryAction={() => router.push("/capture")}
        items={[
          { label: t`Add a card`, icon: "plus", onSelect: () => router.push("/capture") },
          { label: t`Smart add`, icon: "ai", onSelect: () => router.push("/smart-add") },
          { label: t`New deck`, icon: "deck", onSelect: () => router.push("/new-deck") },
        ]}
      />
    </View>
  );
}
