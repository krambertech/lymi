import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS } from "@lymi/core";
import * as Haptics from "expo-haptics";
import { type Href, useRouter } from "expo-router";
import { View, type ViewStyle } from "react-native";
import { Flame } from "../../../brand/flame";
import { Lantern } from "../../../brand/lantern";
import { DECKS } from "../../../data/demo";
import { useProgress, useStore } from "../../../data/store";
import { usePalette } from "../../../theme/palette";
import { Button, Icon, Plate, Press, RowArrow, SectionTitle, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { SevenLights } from "../../../ui/seven-lights";

export default function Today() {
  return (
    <Screen title="Today">
      <View className="gap-3">
        <LitDue />
        <StreakPlate />
      </View>
      <Rounds />
      <DecksToReview />
    </Screen>
  );
}

function useDueLine() {
  const { due, reviewsToday, goal, dayDone } = useStore();
  if (due.length > 0)
    return { count: due.length, line: due.length === 1 ? "card due today" : "cards due today" };
  if (reviewsToday >= goal) return { count: reviewsToday, line: "reviews today, goal reached" };
  if (dayDone) return { count: reviewsToday, line: "reviews today, you’re done" };
  return { count: 0, line: "Nothing due today" };
}

function startReview(router: ReturnType<typeof useRouter>, href: Href = "/review") {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push(href);
}

/** The lantern lights the top of the screen; no plate, the room itself is warm there. */
function LitDue() {
  const { due, fed } = useStore();
  const progress = useProgress();
  const router = useRouter();
  const p = usePalette();
  const { count, line } = useDueLine();
  return (
    <View className="items-center gap-5 pb-2">
      <View
        pointerEvents="none"
        className="absolute -inset-x-5 -top-56 bottom-10"
        style={
          {
            experimental_backgroundImage: `radial-gradient(closest-side at 50% 52%, ${p.pool}, transparent 100%)`,
          } as ViewStyle
        }
      />
      <Lantern size={150} progress={progress} fed={fed} style={{ marginTop: 4 }} />
      <View className="items-center gap-0.5">
        <Text
          className="text-6xl font-medium text-text"
          style={{ fontVariant: ["tabular-nums"], letterSpacing: -2 }}
        >
          {count}
        </Text>
        <Text className="text-lg text-text-2">{line}</Text>
      </View>
      <View className="self-stretch">
        {due.length > 0 ? (
          <Button label="Review" variant="primary" size="xl" onPress={() => startReview(router)} />
        ) : (
          <Button label="Add cards" icon="plus" onPress={() => router.push("/capture")} />
        )}
      </View>
    </View>
  );
}

function StreakPlate() {
  const { streak, week, goal, reviewsToday, dayDone } = useStore();
  const router = useRouter();
  const left = Math.max(0, goal - reviewsToday);
  const line = dayDone || left === 0 ? "Today counts" : `${left} reviews to today’s goal`;
  return (
    <Press
      scale={0.98}
      onPress={() => router.push("/streak")}
      accessibilityRole="button"
      accessibilityLabel={`Streak: ${streak} days in a row. ${line}`}
    >
      <Plate className="gap-5 p-5">
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2.5">
            <Flame height={30} state={dayDone || reviewsToday >= goal ? "full" : "lit"} />
            <Text
              className="text-3xl font-medium text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {streak}
            </Text>
            <Text className="text-lg text-text-2">days in a row</Text>
          </View>
          <Text className="text-base text-muted">{line}</Text>
        </View>
        <SevenLights days={week} goal={goal} todayDone={dayDone} />
      </Plate>
    </Press>
  );
}

/** Also on your list: the three rounds, always in this order, each a whole-row link. */
function Rounds() {
  const { forgottenToday, cards } = useStore();
  const router = useRouter();
  const p = usePalette();
  const fresh = cards.filter((c) => c.state === "new").length;
  const rows = [
    {
      n: forgottenToday.length,
      title: "Forgotten today",
      empty: "Nothing forgotten today",
      line: "Graded Forgot today",
      mark: "forgot" as const,
      tint: p["grade-forgot"],
      href: "/review?round=forgotten" as const,
    },
    {
      n: fresh,
      title: "New cards",
      empty: "Add cards from your next lesson",
      line: "Not reviewed yet",
      mark: "new" as const,
      tint: p["state-new"],
      href: "/review?round=new" as const,
    },
    {
      n: 2,
      title: "Often forgotten",
      empty: "No cards you keep forgetting",
      line: `Forgotten on ${SLIPPING_FORGOTTEN_DAYS} of the last ${SLIPPING_RECENT_DAYS} days seen`,
      mark: undefined,
      tint: p.muted,
      href: "/review?round=slipping" as const,
    },
  ];
  return (
    <View>
      <SectionTitle>Also on your list</SectionTitle>
      <View className="gap-3">
        {rows.map((r) => (
          <Press
            key={r.title}
            scale={0.98}
            // An empty tile keeps its place; empty New cards offers Add cards rather than going dead.
            onPress={() =>
              r.n > 0
                ? startReview(router, r.href)
                : r.href === "/review?round=new" && router.push("/capture")
            }
            accessibilityRole="link"
          >
            <Plate className="flex-row items-center gap-4 px-5 py-4">
              <Text
                className={`w-10 text-3xl font-medium ${r.n === 0 ? "text-muted" : "text-text"}`}
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {r.n}
              </Text>
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  {r.mark && <Icon name={r.mark} size={16} colour={r.tint} />}
                  <Text className="text-md font-medium text-text">{r.title}</Text>
                </View>
                <Text className="text-base text-muted">{r.n === 0 ? r.empty : r.line}</Text>
              </View>
              {r.n > 0 && <RowArrow />}
            </Plate>
          </Press>
        ))}
      </View>
    </View>
  );
}

function DecksToReview() {
  const { due } = useStore();
  const router = useRouter();
  const decks = DECKS.map((d) => ({ ...d, due: due.filter((c) => c.deck === d.id).length })).filter(
    (d) => d.due > 0,
  );
  if (decks.length < 2) return null;
  return (
    <View>
      <SectionTitle
        end={
          <Press
            onPress={() => router.navigate("/library")}
            accessibilityRole="link"
            hitSlop={12}
            className="py-1"
          >
            <Text className="text-base text-muted">Library</Text>
          </Press>
        }
      >
        Decks to review
      </SectionTitle>
      <Plate className="overflow-hidden">
        {decks.map((d, i) => (
          <Press
            key={d.id}
            scale={0.99}
            onPress={() => startReview(router, `/review?deck=${d.id}`)}
            accessibilityRole="link"
          >
            <View
              className={`flex-row items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-edge" : ""}`}
            >
              <View className="h-8 min-w-10 items-center justify-center rounded-full bg-amber-tint px-2.5">
                <Text
                  className="text-base font-medium text-amber-tint-ink"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {d.due}
                </Text>
              </View>
              <Text className="flex-1 text-md font-medium text-text">{d.name}</Text>
              <RowArrow />
            </View>
          </Press>
        ))}
      </Plate>
    </View>
  );
}
