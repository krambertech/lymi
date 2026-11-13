import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { InsightsOut } from "@lymi/core";
import { useState } from "react";
import { type TextStyle, View, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { clear, usePalette } from "../theme/palette";
import { TEXT_END } from "../theme/type";
import { Text } from "../ui/primitives";
import { StateIcon, stateMarks } from "../ui/state-mark";

// The web's Insights figures, drawn for touch. insights.md: every figure is ink at graded opacity
// over a plate-nested well; a lit day, today's bar and Recall's last point are the only amber.

/** A local date as a Date at noon UTC, so formatting it in UTC can never slip a day. */
export const asDate = (date: string) => new Date(`${date}T12:00:00Z`);

const TABULAR: TextStyle = { fontVariant: ["tabular-nums"] };

/** Ink at an opacity, as a hex colour React Native can paint. */
function ink(colour: string, opacity: number) {
  return `${colour.slice(0, 7)}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export interface TrendPoint {
  at: string;
  /** When the bucket starts, so a week away is a gap rather than two weeks drawn side by side. */
  t: number;
  value: number;
  /** The end labels under the plot: "3 Aug", "Aug". */
  short: string;
}

/** A line needs three points to have a shape; below that the caller draws the sample. */
export const TREND_MIN_POINTS = 3;

const PLOT_H = 58;
const PAD_Y = 12;
const GUTTER = 40;
const PAD_END = 8;

/** Catmull-Rom through every point, clamped per segment so the curve never overshoots a value. */
function curve(pts: { x: number; y: number }[]): string {
  const first = pts[0];
  if (!first) return "";
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    if (!p0 || !p1 || !p2 || !p3) continue;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const c1y = Math.max(lo, Math.min(hi, p1.y + (p2.y - p0.y) / 6));
    const c2y = Math.max(lo, Math.min(hi, p2.y - (p3.y - p1.y) / 6));
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${c1y.toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Recall over time with the 90% the schedule aims for behind it. The scale never starts at zero:
 * retention lives between about 70% and 100%, and a zero baseline flattens every real change.
 */
export function TrendLine({
  points,
  target,
  targetLabel,
  label,
}: {
  points: TrendPoint[];
  target: number;
  targetLabel: string;
  label: string;
}) {
  const { i18n } = useLingui();
  const p = usePalette();
  const [w, setW] = useState(0);
  const values = points.map((pt) => pt.value);
  const lo = Math.min(...values, target) - 0.05;
  const hi = Math.max(...values, target) + 0.05;
  const span = Math.max(0.14, hi - lo);
  const floor = Math.max(0, Math.min(lo, 1 - span));
  const t0 = points[0]?.t ?? 0;
  const elapsed = (points.at(-1)?.t ?? 0) - t0;
  const x = (t: number) =>
    elapsed === 0
      ? (GUTTER + w - PAD_END) / 2
      : GUTTER + ((t - t0) / elapsed) * (w - PAD_END - GUTTER);
  const y = (v: number) => PLOT_H - PAD_Y - ((v - floor) / span) * (PLOT_H - PAD_Y * 2);
  const xy = points.map((pt) => ({ x: x(pt.t), y: y(pt.value) }));
  const last = xy.at(-1);
  const lastValue = points.at(-1)?.value;
  const ty = y(target);

  return (
    <View
      className="w-full"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <View style={{ height: PLOT_H }}>
        {w > 0 && (
          <Svg width={w} height={PLOT_H}>
            <Line
              x1={GUTTER}
              x2={w - PAD_END}
              y1={ty}
              y2={ty}
              stroke={p["edge-strong"]}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {xy.length > 1 && (
              <Path
                d={curve(xy)}
                fill="none"
                stroke={ink(p.ink, 0.55)}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {xy.slice(0, -1).map((pt, i) => (
              <Circle key={points[i]?.at} cx={pt.x} cy={pt.y} r={2} fill={ink(p.ink, 0.45)} />
            ))}
            {last && <Circle cx={last.x} cy={last.y} r={3.5} fill={p.amber} />}
          </Svg>
        )}
        <Text
          className="absolute start-0 text-2xs text-ink-muted"
          style={[TABULAR, { top: ty - 8 }]}
        >
          {targetLabel}
        </Text>
      </View>
      <View className="h-4 flex-row justify-between" style={{ marginStart: GUTTER }}>
        <Text className="text-2xs text-ink-muted">{points[0]?.short}</Text>
        {lastValue !== undefined && points.length > 1 && (
          <Text className="text-2xs text-ink-muted">
            {points.at(-1)?.short}{" "}
            <Text className="text-2xs font-medium text-ink" style={TABULAR}>
              {i18n.number(lastValue, { style: "percent" })}
            </Text>
          </Text>
        )}
      </View>
    </View>
  );
}

/** Past this, single marks are thinner than the gaps between them, so the tally draws shares. */
const COUNTABLE = 60;

/** One mark per graded review while there are too few weeks for a trend; forgotten in heavier ink. */
export function RecallTally({ passed, failed }: { passed: number; failed: number }) {
  const { t } = useLingui();
  const p = usePalette();
  const graded = passed + failed;
  if (graded === 0) return null;
  const tone = (ok: boolean) => ink(p.ink, ok ? 0.5 : 0.85);
  const marks =
    graded > COUNTABLE
      ? [
          { ok: true, grow: passed },
          { ok: false, grow: failed },
        ].filter((m) => m.grow > 0)
      : Array.from({ length: graded }, (_, i) => ({ ok: i < passed, grow: 1 }));
  return (
    <View
      className="h-7 w-full flex-row"
      style={{ gap: graded > COUNTABLE ? 4 : 3 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t`${passed} remembered, ${failed} forgotten`}
    >
      {marks.map((m, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: a mark is a count, with no identity beyond its place
          key={i}
          className="rounded-[3px]"
          style={{
            flexGrow: m.grow,
            flexBasis: 0,
            maxWidth: graded > COUNTABLE ? undefined : 14,
            backgroundColor: tone(m.ok),
          }}
        />
      ))}
    </View>
  );
}

/**
 * Thirty days lit or not, with consecutive lit days joined into one capsule: a run whose length
 * you can see instead of marks you have to count. Never graded by volume; the day grid does that.
 */
export function RunStrip({
  days,
  height = 40,
}: {
  days: { date: string; lit: boolean }[];
  height?: number;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const runs: { from: number; to: number; lit: boolean }[] = [];
  days.forEach((d, i) => {
    const last = runs.at(-1);
    if (last?.lit && d.lit) last.to = i;
    else runs.push({ from: i, to: i, lit: d.lit });
  });
  const lit = days.filter((d) => d.lit).length;
  return (
    <View
      className="w-full flex-row"
      style={{ height, gap: 2 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t`Reviewed on ${lit} of the last ${plural(days.length, { one: "# day", other: "# days" })}`}
    >
      {runs.map((r) => (
        <View
          key={days[r.from]?.date ?? r.from}
          style={
            {
              flexGrow: r.to - r.from + 1,
              flexBasis: 0,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: 5,
              borderBottomRightRadius: 5,
              backgroundColor: r.lit ? p.amber : p["plate-nested"],
              borderWidth: r.lit ? 0 : 1,
              borderColor: p.edge,
              experimental_backgroundImage: r.lit
                ? `linear-gradient(to bottom, ${p["lit-sheen"]}, ${clear(p["lit-sheen"])} 70%)`
                : undefined,
            } as ViewStyle
          }
        />
      ))}
    </View>
  );
}

/** One row per state: its mark and word, a bar against all cards, and the count. */
export function CardStates({ cards }: { cards: InsightsOut["cards"] }) {
  const { i18n } = useLingui();
  const p = usePalette();
  const total = Math.max(cards.total, 1);
  return (
    <View className="w-full gap-2">
      {(["new", "learning", "known"] as const).map((k) => (
        <View key={k} className="flex-row items-center gap-3">
          <View className="w-[108px] flex-row items-center gap-1.5">
            <StateIcon state={k} size={16} />
            <Text className="text-sm text-ink-secondary" numberOfLines={1}>
              {i18n._(stateMarks[k].groupLabel)}
            </Text>
          </View>
          <View className="h-2 flex-1 overflow-hidden rounded-full bg-plate-nested">
            <View
              className="h-full rounded-full"
              style={{
                width: `${(cards[k] / total) * 100}%`,
                backgroundColor: p[stateMarks[k].tint],
              }}
            />
          </View>
          <Text className="w-10 text-sm font-medium text-ink" style={[TABULAR, TEXT_END]}>
            {i18n.number(cards[k])}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The cards in each of the three states as one bar, for a figure too small for three rows. */
export function CardShares({
  cards,
  height = 10,
}: {
  cards: InsightsOut["cards"];
  height?: number;
}) {
  const p = usePalette();
  return (
    <View
      className="w-full flex-row overflow-hidden rounded-full bg-plate-nested"
      style={{ height, gap: 2 }}
    >
      {(["known", "learning", "new"] as const)
        .filter((k) => cards[k] > 0)
        .map((k) => (
          <View
            key={k}
            style={{ flexGrow: cards[k], flexBasis: 0, backgroundColor: p[stateMarks[k].tint] }}
          />
        ))}
    </View>
  );
}

/**
 * The next seven days as bars on a baseline, each with its count. Amber marks today, the day the
 * learner can act on, never the heaviest day, which the sentence under the chart names.
 */
export function ForecastBars({
  forecast,
  height = 74,
  compact = false,
}: {
  forecast: InsightsOut["forecast"];
  height?: number;
  /** Bars alone, for a figure too small to carry a count and a day under each. */
  compact?: boolean;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const weekday = (date: string) => i18n.date(asDate(date), { weekday: "short", timeZone: "UTC" });
  const max = Math.max(1, ...forecast.map((d) => d.count));
  const name = (date: string, i: number) => (i === 0 ? t`Today` : weekday(date));
  return (
    <View
      className="w-full flex-row"
      style={{ height, gap: compact ? 3 : 6 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={forecast.map((d, i) => `${name(d.date, i)} ${d.count}`).join(", ")}
    >
      {forecast.map((d, i) => (
        <View key={d.date} className="flex-1 gap-1">
          {!compact && (
            <Text
              className={`text-center text-2xs ${i === 0 ? "font-medium text-ink" : d.count > 0 ? "text-ink-muted" : "text-ink-faint"}`}
              style={TABULAR}
            >
              {i18n.number(d.count)}
            </Text>
          )}
          <View className="flex-1 justify-end border-b border-edge">
            <View
              style={{
                height: d.count > 0 ? `${Math.max(6, (d.count / max) * 100)}%` : 0,
                borderTopLeftRadius: compact ? 2 : 4,
                borderTopRightRadius: compact ? 2 : 4,
                backgroundColor: i === 0 ? p.amber : ink(p.ink, 0.35),
              }}
            />
          </View>
          {!compact && (
            <Text
              className={`text-center text-2xs ${i === 0 ? "font-medium text-ink" : "text-ink-muted"}`}
              numberOfLines={1}
            >
              {i === 0 ? name(d.date, i) : weekday(d.date).slice(0, 2)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
