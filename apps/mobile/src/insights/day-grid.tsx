import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { InsightsOut } from "@lymi/core";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, type ViewStyle } from "react-native";
import { addDays } from "../streak/calendar";
import { type Palette, usePalette } from "../theme/palette";
import { Text } from "../ui/primitives";
import { asDate } from "./figures";

type Day = InsightsOut["activity"]["days"][number];

/** Days from Monday, so a week is one column whatever weekday the locale starts on. */
const dow = (date: string) => (asDate(date).getUTCDay() + 6) % 7;
const daysBetween = (from: string, to: string) =>
  Math.round((asDate(to).getTime() - asDate(from).getTime()) / 86_400_000);

/** Two months of weeks fit the phone's plate at this size: nine columns of 28 and their gaps. */
const CELL = 28;
const GAP = 4;
const MONTH_ROW = 20;
const YEAR_WEEKS = 52;
const A_MONDAY = "2026-09-07";

/** The seven lights' three steps against the day's own goal, or the goal now when it has none. */
function level(day: Day | undefined, current: number): 0 | 1 | 2 | 3 {
  if (!day || day.attempts <= 0) return 0;
  const goal = day.goal ?? current;
  if (day.attempts >= goal) return 3;
  return day.attempts >= goal / 2 ? 2 : 1;
}

function fill(p: Palette, l: 1 | 2 | 3) {
  return l === 3 ? p.amber : p[`light-${l}`];
}

function monthStartIn(weekStart: string): string | null {
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    if (date.endsWith("-01")) return date;
  }
  return null;
}

interface Props {
  days: Day[];
  today: string;
  firstDay: string;
  goal: number;
}

/**
 * The web's day grid at phone size: a column a week, a row a weekday, at least the last year. Two
 * months show at once; a swipe comes to rest at the start of a month, and it opens on today. A tap
 * says what a day held on the line under the field, which starts on today. insights.md.
 */
export function DayGrid({ days, today, firstDay, goal }: Props) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const scroller = useRef<ScrollView>(null);
  const [chosen, setChosen] = useState(today);

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const floor = addDays(today, -(YEAR_WEEKS * 7 - 1));
  const start = firstDay < floor ? firstDay : floor;
  const from = addDays(start, -dow(start));
  const to = addDays(today, 6 - dow(today));
  const columns = (daysBetween(from, to) + 1) / 7;

  const groups: { month: string | null; span: number; col: number }[] = [];
  for (let c = 0; c < columns; c++) {
    const starts = monthStartIn(addDays(from, c * 7));
    const last = groups.at(-1);
    if (starts || !last) groups.push({ month: starts?.slice(0, 7) ?? null, span: 1, col: c });
    else last.span++;
  }
  const lead = groups[0];
  if (lead && !lead.month && lead.span > 1)
    lead.month = addDays(from, lead.span * 7 - 1).slice(0, 7);
  const stops = groups.filter((g) => g.month).map((g) => g.col * (CELL + GAP));

  const utc = { timeZone: "UTC" } as const;
  const monthName = new Intl.DateTimeFormat(i18n.locale, { month: "short", ...utc });
  const weekdayNarrow = new Intl.DateTimeFormat(i18n.locale, { weekday: "narrow", ...utc });
  const dayName = new Intl.DateTimeFormat(i18n.locale, { day: "numeric", month: "long", ...utc });

  /** One day in one whole sentence for each way a day can end, as the web's tooltip has. */
  const sentence = (date: string): string => {
    const day = dayName.format(asDate(date));
    if (date > today) return t`${day}: not yet`;
    const entry = byDate.get(date);
    const isToday = date === today;
    const n = entry?.attempts ?? 0;
    const reviews = plural(n, { one: "# review", other: "# reviews" });
    if (entry?.outcome === "nothing_due") {
      return isToday ? t`Today, ${day}: nothing due` : t`${day}: nothing due`;
    }
    if (n === 0) return isToday ? t`Today, ${day}: no reviews yet` : t`${day}: no reviews`;
    if (entry?.outcome === "goal_met") {
      return isToday
        ? t`Today, ${day}: goal reached, ${reviews}`
        : t`${day}: goal reached, ${reviews}`;
    }
    if (entry?.outcome === "exhausted") {
      return isToday
        ? t`Today, ${day}: all due cards reviewed, ${reviews}`
        : t`${day}: all due cards reviewed, ${reviews}`;
    }
    if (entry?.goal == null) {
      if (entry?.satisfied) return isToday ? t`Today, ${day}: ${reviews}` : t`${day}: ${reviews}`;
      return isToday
        ? t`Today, ${day}: ${reviews}, from an import`
        : t`${day}: ${reviews}, from an import`;
    }
    if (isToday) return t`Today, ${day}: ${reviews} of ${entry.goal}`;
    if (n < entry.goal) return t`${day}: ${reviews}, goal missed`;
    return t`${day}: ${reviews}`;
  };

  const field = (CELL + GAP) * columns - GAP;

  return (
    <View className="gap-3">
      <View className="flex-row gap-1.5">
        <View style={{ paddingTop: MONTH_ROW + GAP, gap: GAP }} importantForAccessibility="no">
          {Array.from({ length: 7 }, (_, i) => (
            <View
              key={addDays(A_MONDAY, i)}
              className="items-end justify-center"
              style={{ height: CELL }}
            >
              <Text className="text-2xs text-faint">
                {weekdayNarrow.format(asDate(addDays(A_MONDAY, i)))}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToOffsets={stops}
          snapToEnd
          decelerationRate="fast"
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
          // Room for the chosen day's ring, which reaches past the cell.
          contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 3 }}
          className="flex-1"
        >
          <View style={{ width: field }}>
            <View className="flex-row" style={{ height: MONTH_ROW, marginBottom: GAP }}>
              {groups.map((g) => (
                <View key={g.col} style={{ width: g.span * (CELL + GAP) }}>
                  <Text
                    className={`text-2xs ${g.month === today.slice(0, 7) ? "font-medium text-text-2" : "text-muted"}`}
                    numberOfLines={1}
                  >
                    {g.month ? monthName.format(asDate(`${g.month}-01`)) : ""}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row" style={{ gap: GAP }}>
              {Array.from({ length: columns }, (_, c) => (
                <View key={addDays(from, c * 7)} style={{ gap: GAP }}>
                  {Array.from({ length: 7 }, (_, r) => {
                    const date = addDays(from, c * 7 + r);
                    return (
                      <Cell
                        key={date}
                        p={p}
                        date={date}
                        entry={byDate.get(date)}
                        today={today}
                        goal={goal}
                        chosen={date === chosen}
                        label={sentence(date)}
                        onPress={() => setChosen(date)}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      <Text className="text-base text-text-2" accessibilityLiveRegion="polite">
        {sentence(chosen)}
      </Text>
    </View>
  );
}

function Cell({
  p,
  date,
  entry,
  today,
  goal,
  chosen,
  label,
  onPress,
}: {
  p: Palette;
  date: string;
  entry: Day | undefined;
  today: string;
  goal: number;
  chosen: boolean;
  label: string;
  onPress: () => void;
}) {
  const future = date > today;
  const l = future ? 0 : level(entry, goal);
  // Counted without filling: nothing left to do, or nothing due. The streak keeps those too.
  const kept = !future && (!!entry?.satisfied || entry?.outcome === "nothing_due") && l < 3;
  const box: ViewStyle = {
    width: CELL,
    height: CELL,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: future ? "transparent" : l === 0 ? p["plate-2"] : fill(p, l),
    borderWidth: kept ? 1.5 : 1,
    borderStyle: future ? "dashed" : "solid",
    borderColor: kept ? p.amber : future ? p["edge-2"] : l === 0 ? p.edge : "transparent",
  };
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={2}>
      <View
        style={{
          padding: 2,
          margin: -3,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: chosen ? p["text-2"] : "transparent",
        }}
      >
        <View style={box} />
      </View>
    </Pressable>
  );
}
