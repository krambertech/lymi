import { type Rating, RETURN_GAPS } from "@lymi/core";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, useColorScheme, View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  Keyframe,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { Lantern } from "../brand/lantern";
import { DECKS } from "../data/demo";
import { type Card, useProgress, useStore } from "../data/store";
import { type Palette, usePalette } from "../theme/palette";
import type { IconName } from "../ui/icons";
import { Button, Icon, LIFT, Press, Text } from "../ui/primitives";
import { SevenLights } from "../ui/seven-lights";

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export default function Review() {
  const store = useStore();
  const params = useLocalSearchParams<{ deck?: string; round?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<string[]>(() => {
    const { cards, forgottenToday } = store;
    if (params.round === "forgotten") return [...forgottenToday];
    if (params.round === "new") return cards.filter((c) => c.state === "new").map((c) => c.id);
    if (params.round === "slipping")
      return cards
        .filter((c) => c.state === "learning")
        .slice(0, 2)
        .map((c) => c.id);
    return cards.filter((c) => c.due && (!params.deck || c.deck === params.deck)).map((c) => c.id);
  });
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = store.cards.find((c) => c.id === queue[0]);
  const finished = !card;

  const grade = (rating: Rating) => {
    if (!card) return;
    // Every grade is the same small tap: Forgot feeds the flame exactly as Easy does.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    store.grade(card.id, rating);
    setQueue((q) => {
      const rest = q.slice(1);
      if (rating !== 1) return rest;
      // A forgotten card comes back a few cards later, by the same gap the Worker's draw uses.
      const at = Math.min(RETURN_GAPS[0] - 1, rest.length);
      return [...rest.slice(0, at), card.id, ...rest.slice(at)];
    });
    setDone((n) => n + 1);
    setRevealed(false);
    const reachesGoal = store.reviewsToday + 1 === store.goal;
    if (reachesGoal) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (finished) return <Completion added={done} onClose={() => router.back()} />;

  const total = done + queue.length;
  // Glass or plates, the grades open under the card and the card makes room for them.
  const glassBar = store.directions.review === "glass" && isGlassEffectAPIAvailable();
  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Header done={done} total={total} onClose={() => router.back()} />
      <View className="flex-1 px-4 pt-3">
        <CardPlate
          key={card.id}
          card={card}
          revealed={revealed}
          onReveal={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRevealed(true);
          }}
          onSwipe={grade}
        />
      </View>
      {revealed && (glassBar ? <GlassGrades onGrade={grade} /> : <GradeStrip onGrade={grade} />)}
    </View>
  );
}

function Header({ done, total, onClose }: { done: number; total: number; onClose: () => void }) {
  const { fed } = useStore();
  const progress = useProgress();
  const p = usePalette();
  const share = total === 0 ? 0 : done / total;
  const fill = useAnimatedStyle(() => ({
    width: withTiming(`${share * 100}%`, { duration: 300, easing: EASE }),
  }));
  return (
    <View className="h-12 flex-row items-center gap-3 px-4">
      <Lantern size={48} progress={progress} fed={fed} />
      <View
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-plate-2"
        style={{ boxShadow: `inset 0 0 0 1px ${p.edge}` } as ViewStyle}
      >
        <Animated.View className="h-full rounded-full bg-amber" style={fill} />
      </View>
      <Text
        className="min-w-12 text-end text-md text-text-2"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {done}/{total}
      </Text>
      <CloseButton onPress={onClose} />
    </View>
  );
}

/** On iOS 26 the close button sits in a disc of glass, as system sheets do. */
function CloseButton({ onPress }: { onPress: () => void }) {
  const p = usePalette();
  const glass = isGlassEffectAPIAvailable();
  const icon = <Icon name="close" size={18} colour={p.text} />;
  return (
    <Press
      onPress={onPress}
      accessibilityLabel="End review"
      accessibilityRole="button"
      className="size-11 items-center justify-center"
    >
      {glass ? (
        <GlassView
          isInteractive
          glassEffectStyle="regular"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </GlassView>
      ) : (
        icon
      )}
    </Press>
  );
}

const STATE: Record<Card["state"], { label: string; icon: IconName; tint: keyof Palette }> = {
  new: { label: "New", icon: "new", tint: "state-new" },
  learning: { label: "Learning", icon: "learning", tint: "state-learning" },
  known: { label: "Known", icon: "known", tint: "state-known" },
};

const rule = new Keyframe({
  0: { transform: [{ scaleX: 0 }] },
  100: { transform: [{ scaleX: 1 }], easing: EASE },
}).duration(360);

const rise = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
  })
    .duration(260)
    .delay(80 + i * 50);

/** The card holds the screen. Unrevealed it is the word alone; a tap anywhere reveals. */
function CardPlate({
  card,
  revealed,
  onReveal,
  onSwipe,
}: {
  card: Card;
  revealed: boolean;
  onReveal: () => void;
  onSwipe: (r: Rating) => void;
}) {
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const { directions, forgottenToday } = useStore();
  const reduce = useReducedMotion();
  const deck = DECKS.find((d) => d.id === card.deck);
  const forgotten = forgottenToday.includes(card.id);
  const state = STATE[card.state];

  const tx = useSharedValue(0);
  const crossed = useSharedValue(0);
  const swipe = directions.review === "swipe" && revealed;
  const THRESHOLD = 110;

  const tick = () => Haptics.selectionAsync();
  const pan = Gesture.Pan()
    .enabled(swipe)
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      tx.value = e.translationX;
      const side = e.translationX > THRESHOLD ? 1 : e.translationX < -THRESHOLD ? -1 : 0;
      if (side !== crossed.value) {
        crossed.value = side;
        if (side !== 0) scheduleOnRN(tick);
      }
    })
    .onEnd((e) => {
      const side = e.translationX > THRESHOLD ? 1 : e.translationX < -THRESHOLD ? -1 : 0;
      crossed.value = 0;
      if (side === 0) {
        tx.value = withSpring(0, { duration: 350, dampingRatio: 0.8 });
        return;
      }
      tx.value = withTiming(side * 520, { duration: 220, easing: Easing.in(Easing.quad) }, () => {
        scheduleOnRN(onSwipe, side > 0 ? 3 : 1);
      });
    });

  const moving = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { rotate: `${interpolate(tx.value, [-300, 0, 300], [-6, 0, 6])}deg` },
    ],
  }));
  const goodTint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [0, THRESHOLD], [0, 1], "clamp"),
  }));
  const forgotTint = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-THRESHOLD, 0], [1, 0], "clamp"),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        layout={reduce ? undefined : LinearTransition.duration(340).easing(EASE)}
        entering={FadeIn.duration(160)}
        className="flex-1"
        style={moving}
      >
        <Pressable
          onPress={revealed ? undefined : onReveal}
          accessibilityRole="button"
          accessibilityLabel={revealed ? undefined : `${card.term}. Tap to reveal`}
          className="flex-1 overflow-hidden rounded-2xl border border-edge bg-plate"
          style={dark ? LIFT : undefined}
        >
          <View className="flex-row items-center justify-between px-6 pt-5">
            <View className="flex-row items-center gap-2">
              <Icon name="deck" size={18} colour={p.muted} />
              <Text className="text-md text-text-2">{deck?.name}</Text>
            </View>
            <View className="h-9 flex-row items-center gap-1.5 rounded-full bg-plate-2 px-3.5">
              <Icon
                name={forgotten ? "forgot" : state.icon}
                size={16}
                colour={forgotten ? p["grade-forgot"] : p[state.tint]}
              />
              <Text className="text-base font-medium text-text-2">
                {forgotten ? "Forgotten" : state.label}
              </Text>
            </View>
          </View>

          <View className="flex-1 justify-center px-6">
            <Animated.View
              layout={reduce ? undefined : LinearTransition.duration(340).easing(EASE)}
            >
              <Text
                className="text-text"
                style={{ fontSize: 46, lineHeight: 58, fontWeight: "500", letterSpacing: -1.2 }}
              >
                {card.term}
              </Text>
            </Animated.View>
            {revealed && (
              <View className="gap-4 pt-5">
                <Animated.View
                  entering={reduce ? FadeIn : rule}
                  className="h-px bg-edge-2"
                  style={{ transformOrigin: "0% 50%" }}
                />
                <Animated.View entering={reduce ? FadeIn : rise(0)}>
                  <Text className="text-xl text-text">{card.meaning}</Text>
                </Animated.View>
                {card.example && (
                  <Animated.View entering={reduce ? FadeIn : rise(1)}>
                    <Text className="text-md text-text-2">{card.example}</Text>
                  </Animated.View>
                )}
                {card.section && (
                  <Animated.View entering={reduce ? FadeIn : rise(2)} className="flex-row">
                    <View className="h-8 flex-row items-center gap-1.5 rounded-full bg-plate-2 px-3">
                      <Icon name="section" size={15} colour={p.muted} />
                      <Text className="text-base text-text-2">{card.section}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            )}
          </View>

          {!revealed && (
            <Animated.View entering={FadeIn.delay(900).duration(400)} className="items-center pb-6">
              <Text className="text-base text-faint">Tap to reveal</Text>
            </Animated.View>
          )}
          {swipe && (
            <>
              <Animated.View
                pointerEvents="none"
                className="absolute inset-0 items-start justify-start rounded-2xl p-5"
                style={[{ backgroundColor: p["good-soft"] }, goodTint]}
              >
                <SwipeBadge icon="good" label="Good" colour={p["grade-good"]} />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                className="absolute inset-0 items-end justify-start rounded-2xl p-5"
                style={[{ backgroundColor: p["danger-soft"] }, forgotTint]}
              >
                <SwipeBadge icon="forgot" label="Forgot" colour={p["grade-forgot"]} />
              </Animated.View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function SwipeBadge({ icon, label, colour }: { icon: IconName; label: string; colour: string }) {
  return (
    <View className="mt-16 flex-row items-center gap-2 rounded-full bg-plate px-4 py-2 border border-edge">
      <Icon name={icon} size={16} colour={colour} />
      <Text className="text-lg font-medium" style={{ color: colour }}>
        {label}
      </Text>
    </View>
  );
}

const GRADES: { label: string; icon: IconName; tint: keyof Palette }[] = [
  { label: "Forgot", icon: "forgot", tint: "grade-forgot" },
  { label: "Hard", icon: "hard", tint: "grade-hard" },
  { label: "Good", icon: "good", tint: "grade-good" },
  { label: "Easy", icon: "easy", tint: "grade-easy" },
];

const gradeIn = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
  })
    .duration(220)
    .delay(80 + i * 35);

const glassIn = (i: number) =>
  // Translate only: a fading parent stops the glass from rendering at all.
  new Keyframe({
    0: { transform: [{ translateY: 24 }] },
    100: { transform: [{ translateY: 0 }], easing: EASE },
  })
    .duration(260)
    .delay(80 + i * 35);

/** The four grades in glass; each one gives under the thumb. */
function GlassGrades({ onGrade }: { onGrade: (r: Rating) => void }) {
  const p = usePalette();
  const reduce = useReducedMotion();
  return (
    <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
      {GRADES.map((g, i) => (
        <Animated.View key={g.label} entering={reduce ? undefined : glassIn(i)} style={{ flex: 1 }}>
          <Pressable
            onPress={() => onGrade((i + 1) as Rating)}
            accessibilityRole="button"
            accessibilityLabel={g.label}
          >
            <GlassView
              isInteractive
              glassEffectStyle="regular"
              style={{
                height: 76,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name={g.icon} size={20} colour={p[g.tint]} />
              <Text className="text-base font-medium text-text">{g.label}</Text>
            </GlassView>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

/** Four grades, 72 px tall, always under the card. Same tap, same weight, whichever is chosen. */
function GradeStrip({ onGrade }: { onGrade: (r: Rating) => void }) {
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReducedMotion();
  return (
    <Animated.View exiting={FadeOut.duration(120)} className="flex-row gap-2 px-4 pt-3">
      {GRADES.map((g, i) => (
        <Animated.View key={g.label} entering={reduce ? FadeIn : gradeIn(i)} className="flex-1">
          <Press
            scale={0.96}
            haptic={false}
            onPress={() => onGrade((i + 1) as Rating)}
            accessibilityRole="button"
            accessibilityLabel={g.label}
            className="h-16 items-center justify-center gap-1 rounded-lg border border-edge bg-plate"
            style={dark ? LIFT : undefined}
          >
            <Icon name={g.icon} size={20} colour={p[g.tint]} />
            <Text className="text-base font-medium text-text-2">{g.label}</Text>
          </Press>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/** The one place the interface celebrates: the lantern lit large in a pool of its glow. motion.md. */
function Completion({ added, onClose }: { added: number; onClose: () => void }) {
  const { reviewsToday, goal, week, streak, dayDone, forgottenToday, fed } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === "dark";
  const reduce = useReducedMotion();
  const satisfied = reviewsToday >= goal || dayDone;
  const heading =
    reviewsToday >= goal
      ? "Daily goal reached"
      : dayDone
        ? "You’re done for today"
        : "Nothing left here";

  const pool = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) pool.value = withTiming(added > 0 ? 1 : 0.5, { duration: 1600, easing: EASE });
  }, [pool, reduce, added]);
  const poolStyle = useAnimatedStyle(() => ({
    opacity: pool.value,
    transform: [{ scale: 0.8 + pool.value * 0.2 }],
  }));

  const count = useRollUp(Math.max(0, reviewsToday - added), reviewsToday, reduce ? 0 : 820);
  const embers = useEmbers(added, reduce);

  const lantern = new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.6 }, { translateY: -80 }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }], easing: EASE },
  }).duration(600);
  const up = (at: number) =>
    new Keyframe({
      0: { opacity: 0, transform: [{ translateY: 10 }] },
      100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
    })
      .duration(360)
      .delay(at);

  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 top-0 h-[70%]"
        style={[
          {
            experimental_backgroundImage: `radial-gradient(60% 45% at 50% 34%, ${dark ? "rgba(214,145,48,0.28)" : "rgba(255,196,110,0.6)"}, transparent 100%)`,
          } as ViewStyle,
          poolStyle,
        ]}
      />
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <Animated.View entering={reduce ? FadeIn : lantern}>
          <Lantern
            size={168}
            progress={satisfied ? 1 : Math.min(1, reviewsToday / goal)}
            fed={fed + embers}
          />
        </Animated.View>
        <Animated.View entering={reduce ? FadeIn : up(640)} className="items-center gap-2">
          <Text className="text-2xl font-medium text-text" accessibilityRole="header">
            {heading}
          </Text>
          <Text
            className="text-7xl font-medium text-text"
            style={{ fontVariant: ["tabular-nums"], letterSpacing: -2 }}
          >
            {count}
          </Text>
          <Text className="text-md text-muted">reviews today</Text>
        </Animated.View>
        <Animated.View entering={reduce ? FadeIn : up(1000)} className="w-full max-w-[300px] gap-3">
          <SevenLights
            days={week}
            goal={goal}
            todayDone={dayDone}
            sequence={reduce ? undefined : 1180}
          />
          <Text className="text-center text-base text-text-2">
            {satisfied
              ? `${streak} days in a row`
              : `${goal - reviewsToday} more reviews reach your goal`}
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={reduce ? FadeIn : up(2000)} className="gap-3 px-5">
        {forgottenToday.length > 0 && (
          <Button
            label={`Review ${forgottenToday.length} forgotten ${forgottenToday.length === 1 ? "card" : "cards"}`}
            onPress={() => router.replace("/review?round=forgotten")}
          />
        )}
        <Button label="Done" variant="primary" size="xl" onPress={onClose} />
      </Animated.View>
    </View>
  );
}

/** Today's count rolls up from where the last end left the day. */
function useRollUp(from: number, to: number, delay: number) {
  const [n, setN] = useState(delay === 0 ? to : from);
  useEffect(() => {
    if (delay === 0) return setN(to);
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / 700));
      setN(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, delay]);
  return n;
}

/** Embers lift off the flame once, more for more work: 3 for one review, 20 at most. */
function useEmbers(added: number, reduce: boolean) {
  const [bursts, setBursts] = useState(0);
  const total = useMemo(
    () => (reduce || added === 0 ? 0 : Math.min(7, Math.max(1, Math.round(added / 3)))),
    [added, reduce],
  );
  useEffect(() => {
    if (total === 0) return;
    const timers = Array.from({ length: total }, (_, i) =>
      setTimeout(() => setBursts((b) => b + 1), 280 + i * 220),
    );
    return () => timers.forEach(clearTimeout);
  }, [total]);
  return bursts;
}
