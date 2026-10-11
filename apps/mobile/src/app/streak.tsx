import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "../brand/flame";
import { useDay } from "../data/queries";
import { usePalette } from "../theme/palette";
import { useFrost } from "../ui/glass";
import { Plate, Text } from "../ui/primitives";
import { Segmented } from "../ui/segmented";
import { SevenLights } from "../ui/seven-lights";
import { OnGlass } from "../ui/surface";

/** The streak: the run, one plain line about today, today against the goal, and the goal itself. */
export default function Streak() {
  const { t } = useLingui();
  const { streak, reviewsToday, goal, week, dayDone, flame } = useDay();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const frost = useFrost();
  const [choice, setChoice] = useState(String(goal));
  const left = Math.max(0, goal - reviewsToday);
  const share = Math.min(1, reviewsToday / goal);
  return (
    <OnGlass>
      <View
        className="gap-6 px-5 pt-8"
        style={{ backgroundColor: frost, paddingBottom: insets.bottom + 16 }}
      >
        <View className="gap-1.5">
          <View className="flex-row items-center gap-3">
            <Flame height={34} state={flame} />
            <Text
              className="text-4xl font-medium text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {streak}
            </Text>
            <Text className="text-xl text-text-2">
              {plural(streak, { one: "day in a row", other: "days in a row" })}
            </Text>
          </View>
          <Text className="text-md text-muted">
            {dayDone || left === 0
              ? t`Today counts.`
              : plural(left, {
                  one: "# more review and today counts.",
                  other: "# more reviews and today counts.",
                })}
          </Text>
        </View>
        <Plate className="gap-5 p-5">
          <SevenLights days={week} goal={goal} todayDone={dayDone} />
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-base text-text-2">{t`Today`}</Text>
              <Text className="text-base text-text-2" style={{ fontVariant: ["tabular-nums"] }}>
                {t`${reviewsToday} of ${goal}`}
              </Text>
            </View>
            <View
              className="h-2 overflow-hidden rounded-full bg-plate-2"
              style={{ boxShadow: `inset 0 0 0 1px ${p.edge}` } as ViewStyle}
            >
              <View className="h-full rounded-full bg-amber" style={{ width: `${share * 100}%` }} />
            </View>
          </View>
        </Plate>
        <View className="gap-2">
          <Text className="px-1 text-md font-medium text-text">{t`Daily goal`}</Text>
          <Segmented
            label={t`Daily goal`}
            value={choice}
            options={["10", "25", "50", "100"].map((v) => ({ value: v, label: v }))}
            onChange={setChoice}
          />
          <Text className="px-1 text-base text-muted">
            {t`Reviews a day. Finishing everything due also counts.`}
          </Text>
        </View>
      </View>
    </OnGlass>
  );
}
