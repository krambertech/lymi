import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type GoalStatus, useDailyGoal } from "@lymi/client/daily-goal";
import type { StreakOut } from "@lymi/core";
import { useMemo, useState } from "react";
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
import { OnGlass } from "../ui/surface";

const satisfied = (outcome: StreakOut["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

/**
 * The streak, as a sheet over whatever opened it: the run with one plain line about today, today
 * against the goal with the longest run and the days reviewed, then the month a drag further up.
 * The goal is changed only from here, in a sheet of its own. streak.md, phone.md.
 */
export default function Streak() {
  const { summary, flame } = useDay();
  const frost = useFrost();
  return (
    <OnGlass>
      <ScrollView style={{ backgroundColor: frost }} contentContainerClassName="px-5 pt-8 pb-12">
        {summary ? (
          <StreakPanel summary={summary} flame={flame} />
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
  flame,
}: {
  summary: StreakOut;
  flame: ReturnType<typeof useDay>["flame"];
}) {
  const { t } = useLingui();
  const goal = useDailyGoal();
  const connected = useOnline();
  const [choosing, setChoosing] = useState(false);
  const { current, today } = summary;
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
        : today.outcome === "nothing_due"
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
          accessibilityLabel={t`Streak: ${plural(current, { one: "# day in a row", other: "# days in a row" })}`}
        >
          <Flame height={44} state={flame} />
          <View className="flex-row items-baseline gap-2.5">
            <Text
              className="text-5xl font-semibold text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {current}
            </Text>
            <Text className="text-lg font-medium text-text-2">
              {plural(current, { one: "day in a row", other: "days in a row" })}
            </Text>
          </View>
        </View>
        <Text className="text-base text-text-2">{status}</Text>
      </View>

      <Plate className="overflow-hidden">
        <View className="gap-3 ps-5 pe-2 pt-3.5 pb-4">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-1.5">
              {done && <DoneMark />}
              {/* "of" holds only up to the goal; a round past it counts on and still names the goal. */}
              <Text
                className="text-md font-medium text-text"
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
            <IconButton
              icon="edit"
              label={t`Change daily goal`}
              onPress={() => setChoosing(true)}
            />
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

      <Plate className="px-3 pt-2 pb-3">
        <StreakCalendar
          days={byDate}
          today={today.date}
          firstMonth={firstMonth}
          run={run}
          rest={rest}
        />
      </Plate>
      <GoalSheet
        open={choosing}
        onOpenChange={setChoosing}
        value={summary.goal}
        onChange={goal.change}
      />
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
        colour={status === "saved" ? p.muted : p.danger}
      />
      <Text className={`text-base ${status === "saved" ? "text-muted" : "text-danger"}`}>
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
      className="h-1.5 overflow-hidden rounded-full bg-plate-2"
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
        <Icon name={icon} size={14} colour={p.muted} />
        <Text className="text-sm text-muted">{label}</Text>
      </View>
      <Text className="text-md font-medium text-text" style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}
