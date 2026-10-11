import { useState } from "react";
import { View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame } from "../brand/flame";
import { useStore } from "../data/store";
import { usePalette } from "../theme/palette";
import { Plate, Text } from "../ui/primitives";
import { Segmented } from "../ui/segmented";
import { SevenLights } from "../ui/seven-lights";

/** The streak: the run, one plain line about today, today against the goal, and the goal itself. */
export default function Streak() {
  const { streak, reviewsToday, goal, week, dayDone, directions } = useStore();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState(String(goal));
  const left = Math.max(0, goal - reviewsToday);
  const share = Math.min(1, reviewsToday / goal);
  return (
    <View
      className={`gap-6 px-5 pt-8 ${directions.chrome === "native" ? "" : "bg-canvas"}`}
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="gap-1.5">
        <View className="flex-row items-center gap-3">
          <Flame height={34} state={dayDone || left === 0 ? "full" : "lit"} />
          <Text
            className="text-4xl font-medium text-text"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {streak}
          </Text>
          <Text className="text-xl text-text-2">days in a row</Text>
        </View>
        <Text className="text-md text-muted">
          {dayDone || left === 0 ? "Today counts." : `${left} more reviews and today counts.`}
        </Text>
      </View>
      <Plate className="gap-5 p-5">
        <SevenLights days={week} goal={goal} todayDone={dayDone} />
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-base text-text-2">Today</Text>
            <Text className="text-base text-text-2" style={{ fontVariant: ["tabular-nums"] }}>
              {reviewsToday} of {goal}
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
        <Text className="px-1 text-md font-medium text-text">Daily goal</Text>
        <Segmented
          label="Daily goal"
          value={choice}
          options={["10", "25", "50", "100"].map((v) => ({ value: v, label: v }))}
          onChange={setChoice}
        />
        <Text className="px-1 text-base text-muted">
          Reviews a day. Finishing everything due also counts.
        </Text>
      </View>
    </View>
  );
}
