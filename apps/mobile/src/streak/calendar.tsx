import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { ReviewDayOutcome } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { useEffect, useState } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { ALWAYS, curve, useReduceMotion } from "../theme/motion";
import { type Palette, usePalette } from "../theme/palette";
import { IconButton, Text } from "../ui/primitives";
import { RestGlyph } from "../ui/rest-glyph";

/** Calendar arithmetic on a local YYYY-MM-DD, which no timezone can shift. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** A local YYYY-MM moved by whole months. */
function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + n, 1)).toISOString().slice(0, 7);
}

/** A local date as a Date at noon UTC, so formatting it in UTC can never slip a day. */
const asDate = (date: string) => new Date(`${date}T12:00:00Z`);

/** Two hex colours mixed, `t` of the first. Opaque, so a band and a ring that overlap stay one colour. */
function mix(a: string, b: string, t: number) {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(channel(a, i) * t + channel(b, i) * (1 - t)));
  return `#${out.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** The faint amber inside a ring and along the band, and a rest day's lighter stretch. streak.md. */
function fills(p: Palette) {
  return { run: mix(p.amber, p.plate, 0.16), rest: mix(p.amber, p.plate, 0.07) };
}

const CELL = 40;
const BAND = 32;
const DRAW_MS = 260;
const POP_MS = 240;

type Day = { attempts: number; satisfied: boolean; outcome: ReviewDayOutcome | null };

interface Props {
  /** The days that had an attempt or a nothing-due confirmation. Missing days had neither. */
  days: Map<string, Day>;
  today: string;
  /** The earliest month worth paging back to: the first review's. */
  firstMonth: string;
  /** The dates of the current run, drawn in from its first day when the streak opens. */
  run: Set<string>;
  /** Past days that fell short but kept the run. */
  rest: Set<string>;
}

/**
 * A month of days, Monday first, as the web's: a day that counted is ringed in amber, and a faint
 * band joins it to the days beside it that kept the run. A nothing-due day carries the band
 * without a ring; a rest day carries it lighter between dashed edges; a day to come wears a
 * dashed ring. streak.md.
 */
export function StreakCalendar({ days, today, firstMonth, run, rest }: Props) {
  const { t, i18n } = useLingui();
  const [month, setMonth] = useState(today.slice(0, 7));
  // Only the month the streak opens on draws its run in; paging shows each month as it is.
  const [drawRun, setDrawRun] = useState(true);
  const [width, setWidth] = useState(0);
  const utc = { timeZone: "UTC" } as const;
  const first = `${month}-01`;
  const lead = (asDate(first).getUTCDay() + 6) % 7;
  const length = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, n) => addDays(first, n)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const weekday = new Intl.DateTimeFormat(i18n.locale, { weekday: "narrow", ...utc });
  const monday = "2026-09-07";
  const heads = Array.from({ length: 7 }, (_, i) => weekday.format(asDate(addDays(monday, i))));
  const title = i18n.date(asDate(first), { month: "long", year: "numeric", ...utc });
  const atStart = month <= firstMonth;
  const atEnd = month >= today.slice(0, 7);
  const keeps = (date: string | null | undefined) => {
    if (date && rest.has(date)) return true;
    const d = date ? days.get(date) : undefined;
    return !!d && (d.satisfied || d.outcome === "nothing_due");
  };
  const restInMonth = [...rest].some((d) => d.startsWith(month));
  const runOrder = [...run].sort();
  const page = (n: number) => {
    setDrawRun(false);
    setMonth(addMonths(month, n));
  };
  const cell = width / 7;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text
          className="ps-1 text-md font-medium text-ink"
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {title}
        </Text>
        <View className="-me-2 flex-row">
          <IconButton
            icon="back"
            label={t`Previous month`}
            disabled={atStart}
            onPress={() => page(-1)}
          />
          <IconButton
            icon="forward"
            label={t`Next month`}
            disabled={atEnd}
            onPress={() => page(1)}
          />
        </View>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View className="flex-row pb-1.5" importantForAccessibility="no-hide-descendants">
          {heads.map((h, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: a weekday's place is its identity.
            <Text key={i} className="flex-1 text-center text-xs font-medium text-ink-muted">
              {h}
            </Text>
          ))}
        </View>
        {width > 0 &&
          weeks.map((week) => (
            <View key={week.find(Boolean) ?? "week"} className="flex-row">
              {week.map((date, i) => {
                if (!date) {
                  // biome-ignore lint/suspicious/noArrayIndexKey: an empty slot has only its place.
                  return <View key={i} style={{ width: cell, height: CELL }} />;
                }
                const at = drawRun && run.has(date) ? runOrder.indexOf(date) : -1;
                return (
                  <DayCell
                    key={date}
                    date={date}
                    entry={days.get(date)}
                    today={today}
                    width={cell}
                    resting={rest.has(date)}
                    joinsBefore={keeps(date) && keeps(week[i - 1])}
                    joinsAfter={keeps(date) && keeps(week[i + 1])}
                    restBefore={keeps(date) && keeps(week[i - 1]) && rest.has(week[i - 1] ?? "")}
                    restAfter={keeps(date) && keeps(week[i + 1]) && rest.has(week[i + 1] ?? "")}
                    delay={at >= 0 ? Math.min(at, 14) * 28 : undefined}
                  />
                );
              })}
            </View>
          ))}
      </View>
      {restInMonth && (
        <View className="flex-row items-center gap-3 pt-1">
          <RestGlyph />
          <Text className="flex-1 text-base text-ink-secondary">
            {t`A rest day keeps the streak through one missed day a week.`}
          </Text>
        </View>
      )}
    </View>
  );
}

interface DayCellProps {
  date: string;
  entry: Day | undefined;
  today: string;
  width: number;
  resting: boolean;
  joinsBefore: boolean;
  joinsAfter: boolean;
  restBefore: boolean;
  restAfter: boolean;
  /** When the run draws in, how far into it this day's part starts. */
  delay: number | undefined;
}

function DayCell({
  date,
  entry,
  today,
  width,
  resting,
  joinsBefore,
  joinsAfter,
  restBefore,
  restAfter,
  delay,
}: DayCellProps) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const fill = fills(p);
  const count = entry?.attempts ?? 0;
  const on = !!entry?.satisfied;
  const isToday = date === today;
  const future = date > today;
  const half = width / 2;
  const top = (CELL - BAND) / 2;
  const day = i18n.date(asDate(date), { day: "numeric", month: "long", timeZone: "UTC" });
  const reviews = plural(count, { one: "# review", other: "# reviews" });
  // Each way a day can end has its own sentence: only one of them met a goal.
  const label = future
    ? t`${day}: not yet`
    : resting
      ? count === 0
        ? t`${day}: rest day`
        : t`${day}: rest day, ${reviews}`
      : entry?.outcome === "nothing_due"
        ? isToday
          ? t`Today, ${day}: nothing due`
          : t`${day}: nothing due`
        : count === 0
          ? isToday
            ? t`Today, ${day}: no reviews yet`
            : t`${day}: no reviews`
          : entry?.outcome === "goal_met"
            ? isToday
              ? t`Today, ${day}: goal reached, ${reviews}`
              : t`${day}: goal reached, ${reviews}`
            : entry?.outcome === "exhausted"
              ? isToday
                ? t`Today, ${day}: all due cards reviewed, ${reviews}`
                : t`${day}: all due cards reviewed, ${reviews}`
              : isToday
                ? t`Today, ${day}: ${reviews}`
                : on
                  ? t`${day}: ${reviews}`
                  : t`${day}: ${reviews}, goal missed`;
  const ring: ViewStyle = {
    position: "absolute",
    top,
    left: half - BAND / 2,
    width: BAND,
    height: BAND,
    borderRadius: BAND / 2,
  };
  return (
    <View
      style={{ width, height: CELL }}
      className="items-center justify-center"
      accessible
      accessibilityLabel={label}
    >
      {resting ? (
        <Draw delay={delay} style={{ position: "absolute", top, left: 0, width, height: BAND }}>
          <RestBand width={width} capStart={!joinsBefore} capEnd={!joinsAfter} p={p} />
        </Draw>
      ) : (
        <>
          {/* Each half runs from this circle's centre to the neighbour's, so the circles cap the band. */}
          {joinsBefore && (
            <Draw delay={delay} style={{ position: "absolute", top, left: -1, width: half + 1 }}>
              {restBefore ? (
                <RestBand width={half + 1} capStart={false} capEnd={false} p={p} />
              ) : (
                <View style={{ height: BAND, backgroundColor: fill.run }} />
              )}
            </Draw>
          )}
          {joinsAfter && (
            <Draw delay={delay} style={{ position: "absolute", top, left: half, width: half + 1 }}>
              {restAfter ? (
                <RestBand width={half + 1} capStart={false} capEnd={false} p={p} />
              ) : (
                <View style={{ height: BAND, backgroundColor: fill.run }} />
              )}
            </Draw>
          )}
        </>
      )}
      {on && (
        <Pop
          delay={delay}
          style={{ ...ring, borderWidth: 2, borderColor: p.amber, backgroundColor: fill.run }}
        />
      )}
      {isToday && !on && (
        <View style={{ ...ring, borderWidth: 1, borderColor: p["edge-strong"] }} />
      )}
      {/* Dashed is the mark for "not here yet", so a day to come never reads as one that was missed. */}
      {future && (
        <View
          style={{ ...ring, borderWidth: 1, borderStyle: "dashed", borderColor: p["edge-strong"] }}
        />
      )}
      <Text
        className={`text-sm ${on ? "font-medium text-ink" : future ? "text-ink-faint" : "text-ink-muted"} ${isToday ? "font-semibold" : ""}`}
        style={{ fontVariant: ["tabular-nums"] }}
        maxFontSizeMultiplier={1.4}
      >
        {asDate(date).getUTCDate()}
      </Text>
    </View>
  );
}

/** A rest day's stretch: the lighter fill between 2 pt dashes, rounded off where nothing kept joins it. */
function RestBand({
  width,
  capStart,
  capEnd,
  p,
}: {
  width: number;
  capStart: boolean;
  capEnd: boolean;
  p: Palette;
}) {
  const r = BAND / 2;
  const x0 = capStart ? width / 2 - r : 0;
  const x1 = capEnd ? width / 2 + r : width;
  const a = capStart ? x0 + r : x0;
  const b = capEnd ? x1 - r : x1;
  const fillPath = [
    `M ${a} 0 H ${b}`,
    capEnd ? `A ${r} ${r} 0 0 1 ${b} ${BAND}` : `V ${BAND}`,
    `H ${a}`,
    capStart ? `A ${r} ${r} 0 0 1 ${a} 0` : `V 0`,
    "Z",
  ].join(" ");
  // The stroke sits 1 pt inside, so its 2 pt dashes stay within the band.
  const s = r - 1;
  const edge = capEnd
    ? `M ${a} 1 H ${b} A ${s} ${s} 0 0 1 ${b} ${BAND - 1} H ${a}`
    : `M ${a} 1 H ${b} M ${b} ${BAND - 1} H ${a}`;
  const edges = capStart ? `${edge} A ${s} ${s} 0 0 1 ${a} 1` : edge;
  return (
    <Svg width={width} height={BAND}>
      <Path d={fillPath} fill={fills(p).rest} />
      <Path d={edges} stroke={p.amber} strokeWidth={2} strokeDasharray="4 3" fill="none" />
    </Svg>
  );
}

/** The run draws across from its first day when the streak opens; Reduce Motion shows it drawn. */
function Draw({
  delay,
  style,
  children,
}: {
  delay: number | undefined;
  style: ViewStyle;
  children: React.ReactNode;
}) {
  const reduce = useReduceMotion();
  const still = delay === undefined || reduce;
  const w = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    w.value = withDelay(
      delay,
      withTiming(1, { duration: DRAW_MS, easing: curve(EASE_OUT), reduceMotion: ALWAYS }),
    );
  }, [still, delay, w]);
  const clip = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={style} pointerEvents="none">
      <Animated.View style={[{ overflow: "hidden" }, clip]}>
        <View style={{ width: style.width as number }}>{children}</View>
      </Animated.View>
    </View>
  );
}

/** A counted day's ring lands with the run, growing from 60% as it fades in. */
function Pop({ delay, style }: { delay: number | undefined; style: ViewStyle }) {
  const reduce = useReduceMotion();
  const still = delay === undefined || reduce;
  const v = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    v.value = withDelay(
      delay,
      withTiming(1, { duration: POP_MS, easing: curve(EASE_OUT), reduceMotion: ALWAYS }),
    );
  }, [still, delay, v]);
  const pop = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: 0.6 + 0.4 * v.value }],
  }));
  return <Animated.View pointerEvents="none" style={[style, pop]} />;
}
