import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type GoalStatus, useDailyGoal } from "@lymi/client/daily-goal";
import { shownOutcome } from "@lymi/client/review-day";
import type { StreakOut } from "@lymi/core";
import { useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, type ViewStyle } from "react-native";
import { Flame } from "../brand/flame";
import { useDay } from "../data/queries";
import { addDays, StreakCalendar } from "../streak/calendar";
import { GoalSheet, useOnline } from "../streak/goal-picker";
import { usePalette } from "../theme/palette";
import { useFrost } from "../ui/glass";
import type { IconName } from "../ui/icons";
import { Icon, IconButton, Plate, Text } from "../ui/primitives";
import { Skeleton } from "../ui/skeleton";
import { useStreakStart } from "../ui/streak-start";
import { OnGlass } from "../ui/surface";

const satisfied = (outcome: StreakOut["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

/**
 * The streak, as a sheet over whatever opened it: the run with one plain line about today, today
 * against the goal with the longest run and the days reviewed, then the month a drag further up.
 * The goal is changed only from here, in a sheet of its own. streak.md, phone.md.
 */
/** Long enough for the streak sheet to glide to full height before the goal's sheet rises over it. */
const RISE_MS = 500;

export default function Streak() {
  const { summary, flame, left } = useDay();
  const frost = useFrost();
  return (
    <OnGlass>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: frost }}
        contentContainerClassName="px-5 pt-8 pb-12"
      >
        {summary ? (
          <StreakPanel summary={summary} flame={flame} due={left ?? 0} />
        ) : (
          <View className="gap-5">
            <Skeleton width={200} height={48} />
            <Skeleton height={140} />
          </View>
        )}
      </ScrollView>
    </OnGlass>
  );
}

function StreakPanel({
  summary,
  due,
  flame,
}: {
  summary: StreakOut;
  /** Cards still due today, which make a day confirmed as nothing due read as open. */
  due: number;
  flame: ReturnType<typeof useDay>["flame"];
}) {
  const { t } = useLingui();
  const goal = useDailyGoal();
  const connected = useOnline();
  const [choosing, setChoosing] = useState(false);
  const navigation = useNavigation();
  // iOS pushes a part-height sheet away when another opens over it, so the streak rises to full
  // height first and the goal's sheet stacks visibly on top. phone.md "Sheets".
  const rising = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (rising.current) clearTimeout(rising.current);
    },
    [],
  );
  const openGoal = () => {
    navigation.setOptions({ sheetAllowedDetents: [1] });
    rising.current = setTimeout(() => setChoosing(true), RISE_MS);
  };
  // Closed, the streak may peek again.
  const closeGoal = (open: boolean) => {
    setChoosing(open);
    if (!open) navigation.setOptions({ sheetAllowedDetents: [0.62, 1] });
  };
  const { current, today } = summary;
  const start = useStreakStart(summary.longest);
  const done = satisfied(today.outcome);
  const byDate = useMemo(() => new Map(summary.days.map((d) => [d.date, d])), [summary.days]);
  const rest = useMemo(() => new Set(summary.restDays), [summary.restDays]);
  // The days of the current run, drawn in from its first one when the streak opens.
  const run = useMemo(() => {
    const dates = new Set<string>();
    const keeps = (date: string) => {
      const d = byDate.get(date);
      return rest.has(date) || (!!d && (d.satisfied || d.outcome === "nothing_due"));
    };
    for (
      let day = done ? today.date : addDays(today.date, -1);
      keeps(day);
      day = addDays(day, -1)
    ) {
      if (byDate.get(day)?.satisfied || rest.has(day)) dates.add(day);
    }
    return dates;
  }, [byDate, rest, done, today.date]);
  const firstMonth = summary.days[0]?.date.slice(0, 7) ?? today.date.slice(0, 7);
  const status =
    today.outcome === "goal_met"
      ? t`Daily goal reached.`
      : today.outcome === "exhausted"
        ? t`You’re done for today.`
        : shownOutcome(today.outcome, due) === "nothing_due"
          ? t`Nothing due today, so your streak is safe.`
          : rest.has(addDays(today.date, -1))
            ? t`Yesterday was a rest day. Reach today’s goal to keep it going.`
            : current > 0
              ? t`Reach today’s goal to keep it going.`
              : t`Reach today’s goal to start a streak.`;

  return (
    <View className="gap-6">
      <View className="gap-1.5">
        <View
          className="flex-row items-center gap-3"
          accessible
          accessibilityRole="header"
          accessibilityLabel={
            current > 0
              ? t`Streak: ${plural(current, { one: "# day in a row", other: "# days in a row" })}`
              : start
          }
        >
          <Flame height={44} state={flame} />
          {current > 0 ? (
            <View className="flex-row items-baseline gap-2.5">
              <Text
                className="text-5xl font-semibold text-ink"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {current}
              </Text>
              <Text className="text-lg font-medium text-ink-secondary">
                {plural(current, { one: "day in a row", other: "days in a row" })}
              </Text>
            </View>
          ) : (
            <Text className="text-2xl font-semibold text-ink">{start}</Text>
          )}
        </View>
        <Text className="text-base text-ink-secondary">{status}</Text>
      </View>

      <Plate className="overflow-hidden">
        <View className="gap-3 ps-5 pe-2 pt-3.5 pb-4">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-1.5">
              {done && <DoneMark />}
              {/* "of" holds only up to the goal; a round past it counts on and still names the goal. */}
              <Text
                className="text-md font-medium text-ink"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {today.attempts > today.goal
                  ? plural(today.attempts, {
                      one: `# review, goal ${today.goal}`,
                      other: `# reviews, goal ${today.goal}`,
                    })
                  : plural(today.goal, {
                      one: `${today.attempts} of # review`,
                      other: `${today.attempts} of # reviews`,
                    })}
              </Text>
            </View>
            <IconButton icon="edit" label={t`Change daily goal`} onPress={openGoal} />
          </View>
          <View className="pe-3">
            <GoalTrack today={today} label={t`Today’s goal`} />
          </View>
        </View>
        <View className="flex-row border-t border-edge">
          <Figure icon="longest" value={summary.longest} label={t`Longest streak`} />
          <View className="w-px bg-edge" />
          <Figure icon="reviewedDays" value={summary.reviewedDays} label={t`Days reviewed`} />
        </View>
      </Plate>

      <GoalLine connected={connected} status={goal.status} />
      <GoalSheet
        open={choosing}
        onOpenChange={closeGoal}
        value={summary.goal}
        onChange={goal.change}
      />

      <Plate className="px-3 pt-2 pb-3">
        <StreakCalendar
          days={byDate}
          today={today.date}
          firstMonth={firstMonth}
          run={run}
          rest={rest}
        />
      </Plate>
    </View>
  );
}

/** Whether the last goal change landed, or why it could not. */
function GoalLine({ connected, status }: { connected: boolean; status: GoalStatus | undefined }) {
  const { t } = useLingui();
  const p = usePalette();
  const line =
    status === "saved"
      ? t`Daily goal saved.`
      : status === "error"
        ? connected
          ? t`Couldn’t save the goal. Try again.`
          : t`Changing the goal needs a connection.`
        : null;
  if (!line) return null;
  return (
    <View className="-mt-3 flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
      <Icon
        name={status === "saved" ? "check" : "alert"}
        size={16}
        colour={status === "saved" ? p["ink-muted"] : p.danger}
      />
      <Text className={`text-base ${status === "saved" ? "text-ink-muted" : "text-danger"}`}>
        {line}
      </Text>
    </View>
  );
}

function DoneMark() {
  const p = usePalette();
  return <Icon name="check" size={16} colour={p["amber-text"]} strokeWidth={2.5} />;
}

/**
 * Today's attempts against the goal, in amber because it is the flame's own measure. It measures
 * the goal and nothing else, so a day finished below it stops where its attempts stopped.
 */
function GoalTrack({ today, label }: { today: StreakOut["today"]; label: string }) {
  const p = usePalette();
  const reached = Math.min(today.attempts, today.goal);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: today.goal, now: reached }}
      className="h-1.5 overflow-hidden rounded-full bg-plate-nested"
      style={{ boxShadow: `inset 0 0 0 1px ${p.edge}` } as ViewStyle}
    >
      <View
        className="h-full rounded-full bg-amber"
        style={{ width: `${today.goal > 0 ? (reached / today.goal) * 100 : 0}%` }}
      />
    </View>
  );
}

/** One figure under today, with its icon and the words for it. */
function Figure({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  const p = usePalette();
  return (
    <View
      className="flex-1 gap-0.5 px-5 py-3.5"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View className="flex-row items-center gap-1.5">
        <Icon name={icon} size={14} colour={p["ink-muted"]} />
        <Text className="text-sm text-ink-muted">{label}</Text>
      </View>
      <Text className="text-md font-medium text-ink" style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}
