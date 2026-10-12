import { useLingui } from "@lingui/react/macro";
import { apiUrl, type QueueItem } from "@lymi/client/api";
import { gradeStore } from "@lymi/client/grades";
import { useRecallClock } from "@lymi/client/recall-clock";
import { drawableLeft } from "@lymi/client/review-day";
import { type LocalGrade, reviewItem, stateBefore } from "@lymi/client/review-draw";
import { countedRating, drawKey, modeKey, type Rating, ROUNDS, type Round } from "@lymi/core";
import {
  END_OF_REVIEW as AT,
  COUNT_ROLL,
  countRollMs,
  EASE_OUT,
  emberCount,
  endEmbers,
  LANTERN_FLIGHT,
  REVEAL_GLIDE,
} from "@lymi/design";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  I18nManager,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  useColorScheme,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  LinearTransition,
  measure,
  type SharedValue,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playHaptics, stopHaptics } from "../../modules/lymi-haptics";
import { useSessionHeaders } from "../auth/client";
import { EndEmbers, LightPool } from "../brand/ending";
import { Lantern } from "../brand/lantern";
import {
  type Standing,
  standing,
  useDay,
  useDecks,
  useDraw,
  useDrawState,
  useGrade,
  useRoundQueue,
  useRounds,
  useSections,
  useUndoGrade,
} from "../data/queries";
import { endHaptics } from "../review/end-haptics";
import { Cover, usePullToEnd } from "../review/pull-to-end";
import { markUndoHintSeen, UndoHint, undoHintSeen } from "../review/undo-hint";
import {
  UndoArea,
  UndoCards,
  type UndoMotion,
  useUndoMotion,
  useUndoSwipe,
} from "../review/undo-swipe";
import { ALWAYS, CROSSFADE, curve, curveFn, springAt, useReduceMotion } from "../theme/motion";
import { type Palette, usePalette } from "../theme/palette";
import { fitType } from "../theme/type";
import type { IconName } from "../ui/icons";
import { Button, Icon, IconButton, LIFT, Press, Text } from "../ui/primitives";
import { SevenLights } from "../ui/seven-lights";

const EASE = curve(EASE_OUT);
const GLIDE = REVEAL_GLIDE.duration * 1000;
/** Cards drawn ahead of the one on screen; fewer left than this and the draw is fetched again. */
const LOOKAHEAD = 3;
/** Local grades a fetch can fall behind by before the draw data is refreshed. */
const REFRESH_AFTER = 20;

type Pinned = { cardId: string; mode: string };
/** A stretch of review: the draw, which may stop at the goal, or a round's fixed list. ADR 0021. */
type Leg =
  | { kind: "draw"; date: string; from: number; until: number | null }
  | { kind: "list"; date: string; size: number };
/** A list's cards by key: graded, sent to the end by a refused grade, or out because the card is gone. */
interface ListCards {
  graded: ReadonlySet<string>;
  returned: ReadonlySet<string>;
  dropped: ReadonlySet<string>;
}
const NO_LIST_CARDS: ListCards = { graded: new Set(), returned: new Set(), dropped: new Set() };
/** The last grade and the card as it was shown, so a swipe from the start edge can bring both back. */
interface Graded {
  item: QueueItem;
  grade: LocalGrade;
  listed: boolean;
  deckName: string | undefined;
  forgotten: boolean;
}

const keyOf = (item: Pick<QueueItem, "card" | "mode">) => drawKey(item.card.id, modeKey(item.mode));
const withKey = (keys: ReadonlySet<string>, key: string) => new Set(keys).add(key);
const withoutKey = (keys: ReadonlySet<string>, key: string) => {
  const next = new Set(keys);
  next.delete(key);
  return next;
};

function leftInList(items: readonly QueueItem[], cards: ListCards): QueueItem[] {
  const left = items.filter((i) => !cards.graded.has(keyOf(i)) && !cards.dropped.has(keyOf(i)));
  return [
    ...left.filter((i) => !cards.returned.has(keyOf(i))),
    ...left.filter((i) => cards.returned.has(keyOf(i))),
  ];
}

export default function Review() {
  const params = useLocalSearchParams<{ deck?: string; round?: string }>();
  const round = ROUNDS.find((r) => r === params.round);
  const deck = params.deck || undefined;
  const router = useRouter();

  // Opened from a widget, the review is the only screen, so leaving goes to Today.
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/today"));

  // A review of another deck or round starts over, so nothing from this one carries into it.
  return <Run key={`${deck ?? ""}:${round ?? ""}`} deck={deck} round={round} onClose={leave} />;
}

/**
 * One review. The draw picks each next card on the device from the fetched draw and this device's
 * grades, as the web's does (ADR 0019); a round from Today walks the server's list in order.
 */
function Run({
  deck,
  round,
  onClose,
}: {
  deck: string | undefined;
  round: Round | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const scope = useMemo(() => ({ deck }), [deck]);
  const draw = useDraw(scope);
  const list = useRoundQueue(round, deck);
  const { reviewsToday, goal } = useDay();
  const grade = useGrade();
  const takeBack = useUndoGrade();
  const { t } = useLingui();
  const decks = useDecks().data;
  const insets = useSafeAreaInsets();
  // A cached draw can predate the last grade, so the first card waits for this mount's fetch.
  const data = draw.isFetchedAfterMount || draw.fetchStatus !== "fetching" ? draw.data : undefined;
  const listData =
    list.isFetchedAfterMount || list.fetchStatus !== "fetching" ? list.data : undefined;
  const { state, grades, setNow } = useDrawState(scope, data, LOOKAHEAD);
  // The card on screen stays put while a refetch lands; only a grade moves it.
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [chosenLeg, setLeg] = useState<Leg | null>(null);
  const [listCards, setListCards] = useState(NO_LIST_CARDS);
  const [done, setDone] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Grades this review has recorded that the server has not answered yet.
  const [sending, setSending] = useState(0);
  // Each position in the review takes one grade, however fast the taps come.
  const gradedAt = useRef(-1);
  // Left partway: the end screen shows over the card still drawn, which Continue goes back to.
  const [paused, setPaused] = useState(false);
  const [lastGraded, setLastGraded] = useState<Graded | null>(null);
  // A card a swipe brought back arrives revealed, with nothing left to play.
  const [returned, setReturned] = useState(false);
  const [hint, setHint] = useState(false);
  // Grades taken back, by when they were made, whose answers from the server no longer apply.
  const undone = useRef(new Set<string>());
  const started = useRef(false);

  // Leaving refreshes what this review, or another device meanwhile, moved under it.
  useEffect(
    () => () => {
      for (const queryKey of [["decks"], ["rounds"], ["streak"], ["queue"]]) {
        void qc.invalidateQueries({ queryKey });
      }
    },
    [qc],
  );

  // A leg belongs to its day, so one left open past midnight gives way to a fresh one.
  const leg = chosenLeg && state && chosenLeg.date === state.day.date ? chosenLeg : null;
  // The draw stops at the goal only for the whole day below it; deck reviews and rounds run to their end.
  useEffect(() => {
    if (leg || !data || !state || (round && !listData)) return;
    setListCards(NO_LIST_CARDS);
    const date = state.day.date;
    setLeg(
      round && listData
        ? { kind: "list", date, size: listData.total }
        : {
            kind: "draw",
            date,
            from: state.attempts,
            until: !deck && state.attempts < data.goal ? data.goal : null,
          },
    );
  }, [leg, data, state, round, listData, deck]);

  const pinnedItem = data && state && pinned ? reviewItem(data, state.log, pinned) : null;
  // Past midnight, yesterday's data does not know yesterday's grades moved the schedule, so a new card waits for today's.
  const staleDay = !!data && !!state && data.day.date !== state.day.date && draw.isFetching;
  const drawn =
    pinnedItem ??
    (data && state?.next && !staleDay ? reviewItem(data, state.log, state.next) : null);
  // A goal lowered on another device meanwhile stops the stretch there instead.
  const atStop =
    leg?.kind === "draw" &&
    leg.until !== null &&
    !!data &&
    !!state &&
    state.attempts >= Math.min(leg.until, data.goal);
  const listLeft = leg?.kind === "list" ? leftInList(listData?.items ?? [], listCards) : [];
  const current = !leg ? null : leg.kind === "draw" ? (atStop ? null : drawn) : listLeft[0];
  const recallTimes = useRecallClock(current ? `${keyOf(current)}:${done}` : null, revealed);

  // A review starts with one firm tap as its first card arrives.
  useEffect(() => {
    if (!current || started.current) return;
    started.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [current]);

  // The first card with a grade before it shows how to take that grade back, once on this phone.
  useEffect(() => {
    if (!lastGraded || undoHintSeen()) return;
    markUndoHintSeen();
    setHint(true);
  }, [lastGraded]);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(timer);
  }, [hint]);

  const ended = paused || (!!leg && !current);
  // Leaving partway ends on the end screen, as the web does, unless nothing was graded here.
  const pull = usePullToEnd({
    onEnd: ended || done === 0 ? onClose : () => setPaused(true),
    away: ended || done === 0,
  });

  /** One step back: the last graded card returns revealed, and its grade leaves the day. */
  const undo = () => {
    const last = lastGraded;
    if (!last) return;
    Haptics.selectionAsync();
    undone.current.add(last.grade.reviewedAt);
    setLastGraded(null);
    setHint(false);
    if (last.listed) {
      const key = keyOf(last.item);
      setListCards((c) => ({ ...c, graded: withoutKey(c.graded, key) }));
    }
    setPinned({ cardId: last.item.card.id, mode: modeKey(last.item.mode) });
    setReturned(true);
    setRevealed(true);
    setDone((n) => n - 1);
    gradedAt.current = -1;
    const term = last.item.card.term;
    void takeBack(last.grade).then((outcome) => {
      if (outcome === "kept") {
        Alert.alert(t`Couldn’t take back your grade for “${term}”. It still counts.`);
      }
    });
  };
  const swipe = useUndoSwipe({ enabled: !!lastGraded && !ended, onUndo: undo });
  const undoMotion = useUndoMotion();

  // A pinned card a refetch no longer holds, such as one archived meanwhile, gives way.
  const repin = !!state?.next && !staleDay && (!pinned || !pinnedItem);
  useEffect(() => {
    if (repin && state?.next) setPinned({ cardId: state.next.cardId, mode: state.next.mode });
  }, [repin, state?.next]);

  // An empty draw is confirmed by a fetch begun after the last grade, or taken as it is offline.
  const lastChange = Math.max(0, ...grades.map((g) => new Date(g.reviewedAt).getTime()));
  const unreachable = draw.fetchStatus === "paused" || draw.isError;
  const confirmed = !!data && data.fetchedAt >= lastChange;
  const stopped = !!leg && !current;
  const checking =
    stopped && leg?.kind === "draw" && !atStop && !confirmed && !(unreachable && !draw.isFetching);
  useEffect(() => {
    if (checking && !unreachable && !draw.isFetching) void draw.refetch();
  }, [checking, unreachable, draw.isFetching, draw.refetch]);
  // The server sends a round a page at a time, so an emptied page asks for the next one.
  const listOwed =
    stopped &&
    leg?.kind === "list" &&
    listCards.graded.size + listCards.dropped.size < leg.size &&
    list.fetchStatus === "idle" &&
    !list.isError;
  useEffect(() => {
    if (listOwed) void list.refetch();
  }, [listOwed, list.refetch]);
  // The end waits for the last grades to land, so a refusal never takes back an end already shown.
  const landing = sending > 0 && !unreachable;

  if (!leg || (stopped && (checking || landing || listOwed))) {
    return <Cover style={pull.style} />;
  }
  if (!current || !data || !state || paused) {
    // The count rolls up to today's attempts as this device knows them, from where this review began.
    const to = state?.attempts ?? reviewsToday;
    return (
      <Cover style={pull.style}>
        <Completion
          from={Math.max(0, to - done)}
          added={done}
          onClose={onClose}
          onContinue={paused && current ? () => setPaused(false) : undefined}
        />
        <GestureDetector gesture={pull.gesture}>
          <Animated.View
            collapsable={false}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64 }}
          />
        </GestureDetector>
      </Cover>
    );
  }
  const { card } = current;

  // What the header counts: today's attempts to the goal's stop, and a list's own otherwise.
  const legDone = leg.kind === "draw" ? state.attempts - leg.from : listCards.graded.size;
  const left = drawableLeft(data, state, deck);
  const total =
    leg.kind === "list"
      ? leg.size - listCards.dropped.size
      : leg.until !== null
        ? Math.min(leg.until - leg.from, legDone + left)
        : legDone + left;
  const lastToday = state.log
    .filter((e) => e.cardId === card.id && e.mode === modeKey(current.mode))
    .pop();
  const deckName = decks?.find((d) => d.id === card.deckId)?.name;
  const forgotten = round === "forgotten" || lastToday?.rating === 1;

  const onGrade = (rating: Rating) => {
    if (gradedAt.current === done) return;
    gradedAt.current = done;
    // Every grade is the same small tap: Forgot feeds the flame exactly as Easy does.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    const item = current;
    const key = keyOf(item);
    const repeat = state.log.some(
      (e) => e.cardId === item.card.id && e.mode === modeKey(item.mode),
    );
    const runningShort = state.upcoming.length <= LOOKAHEAD;
    const listed = leg.kind === "list";
    const record: LocalGrade = {
      cardId: item.card.id,
      mode: item.mode,
      rating: countedRating(rating, repeat),
      reviewedAt: new Date().toISOString(),
      stateBefore: repeat ? stateBefore(data, state.log, item.card.id, item.mode) : item.fsrsState,
      ...recallTimes(),
    };
    const recorded = grade(record);
    if (listed) setListCards((c) => ({ ...c, graded: withKey(c.graded, key) }));
    setLastGraded({ item, grade: record, listed, deckName, forgotten });
    setReturned(false);
    setHint(false);
    setSending((n) => n + 1);
    setRevealed(false);
    setNow(new Date());
    setPinned(null);
    setDone((n) => n + 1);
    if (reviewsToday + 1 === goal)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    void recorded
      .then((outcome) => {
        if (outcome === "queued" || undone.current.has(record.reviewedAt)) return;
        if (outcome === "refused" || outcome === "gone") {
          if (listed) {
            setListCards((c) => ({
              graded: withoutKey(c.graded, key),
              returned: outcome === "refused" ? withKey(c.returned, key) : c.returned,
              dropped: outcome === "gone" ? withKey(c.dropped, key) : c.dropped,
            }));
          }
          Alert.alert(
            outcome === "gone"
              ? `Couldn’t save your grade for “${item.card.term}”. The card is no longer in your decks.`
              : `Couldn’t save your grade for “${item.card.term}”. You’ll see it again.`,
          );
        }
        // A dropped grade leaves the fetched data behind, and so does a long run of sent ones.
        const behind = gradeStore
          .snapshot()
          .filter((g) => new Date(g.reviewedAt).getTime() >= data.fetchedAt).length;
        if (outcome !== "sent" || behind >= REFRESH_AFTER || runningShort) {
          void qc.invalidateQueries({ queryKey: ["queue"] });
        }
      })
      .finally(() => setSending((n) => n - 1));
  };

  return (
    <Cover style={pull.style}>
      <View
        className="flex-1"
        style={{ paddingTop: insets.top + 4, paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <GestureDetector gesture={pull.gesture}>
          <Animated.View collapsable={false}>
            <Header
              done={legDone}
              total={total}
              onClose={done > 0 ? () => setPaused(true) : onClose}
            />
          </Animated.View>
        </GestureDetector>
        <UndoArea gesture={swipe.gesture}>
          <Turn
            // A forgotten card can come straight back; by position it arrives afresh.
            turn={`${keyOf(current)}:${done}`}
            item={current}
            deckName={deckName}
            forgotten={forgotten}
            revealed={revealed}
            still={returned}
            onReveal={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setRevealed(true);
            }}
            onGrade={onGrade}
            onUndo={lastGraded ? undo : undefined}
            swipe={{
              x: swipe.x,
              dir: swipe.dir,
              motion: undoMotion,
              turn: lastGraded?.grade.reviewedAt ?? null,
              under: lastGraded && (
                <CardPlate
                  turn={lastGraded.grade.reviewedAt}
                  item={lastGraded.item}
                  deckName={lastGraded.deckName}
                  forgotten={lastGraded.forgotten}
                  revealed
                  still
                  onReveal={undefined}
                  onUndo={undefined}
                />
              ),
            }}
          />
          {hint && !revealed && <UndoHint />}
        </UndoArea>
      </View>
    </Cover>
  );
}

/** A card and, once it is revealed, its grades under it. */
function Turn({
  turn,
  item,
  deckName,
  forgotten,
  revealed,
  still = false,
  onReveal,
  onGrade,
  onUndo,
  swipe,
}: {
  /** Which card this is at which point of the review; a new one fades its words in on the same plate. */
  turn: string;
  item: QueueItem;
  deckName: string | undefined;
  forgotten: boolean;
  revealed: boolean;
  /** Shown as it already stands, with nothing arriving: a card brought back, or one waiting under. */
  still?: boolean;
  onReveal?: () => void;
  onGrade?: (r: Rating) => void;
  onUndo?: (() => void) | undefined;
  /** The swipe that takes the last grade back moves this card and the graded one, nothing else. */
  swipe: {
    x: SharedValue<number>;
    dir: number;
    motion: UndoMotion;
    turn: string | null;
    under: ReactNode;
  };
}) {
  return (
    <>
      <View className="flex-1 px-4 pt-3">
        <UndoCards
          x={swipe.x}
          dir={swipe.dir}
          motion={swipe.motion}
          turn={swipe.turn}
          under={swipe.under}
        >
          <CardPlate
            turn={turn}
            item={item}
            deckName={deckName}
            forgotten={forgotten}
            revealed={revealed}
            still={still}
            onReveal={onReveal}
            onUndo={onUndo}
          />
        </UndoCards>
      </View>
      {/* The grades arrive once a card brought back has landed. */}
      {revealed && <GradeStrip onGrade={onGrade} />}
    </>
  );
}

function Header({ done, total, onClose }: { done: number; total: number; onClose: () => void }) {
  const { t } = useLingui();
  const { fed, out, progress } = useDay();
  const p = usePalette();
  const share = total === 0 ? 0 : done / total;
  const fill = useAnimatedStyle(() => ({
    width: withTiming(`${share * 100}%`, { duration: 300, easing: EASE }),
  }));
  return (
    <View className="h-12 flex-row items-center gap-3 px-4">
      <Lantern size={48} progress={progress} out={out} fed={fed} />
      <View
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-plate-2"
        style={{ boxShadow: `inset 0 0 0 1px ${p.edge}` } as ViewStyle}
      >
        <Animated.View className="h-full rounded-full bg-text-2" style={fill} />
      </View>
      <Text
        // The count shares a 48 pt bar with the lantern and the progress, so it grows least.
        maxFontSizeMultiplier={1.3}
        className="min-w-12 text-end text-md text-text-2"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {done}/{total}
      </Text>
      {/* Plain, because leaving is rare; pulling the bar down does the same. phone.md "Review". */}
      <IconButton icon="close" label={t`End review`} haptic={false} onPress={onClose} />
    </View>
  );
}

const STATE: Record<Standing, { label: string; icon: IconName; tint: keyof Palette }> = {
  new: { label: "New", icon: "new", tint: "state-new" },
  learning: { label: "Learning", icon: "learning", tint: "state-learning" },
  known: { label: "Known", icon: "known", tint: "state-known" },
};

const rule = new Keyframe({
  0: { transform: [{ scaleX: 0 }] },
  100: { transform: [{ scaleX: 1 }], easing: EASE },
})
  .duration(360)
  .reduceMotion(ALWAYS);

const rise = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
  })
    .duration(260)
    .delay(80 + i * 50)
    .reduceMotion(ALWAYS);

/** The card's picture, fetched with the learner's session like every other request. */
function Picture({ card }: { card: QueueItem["card"] }) {
  const headers = useSessionHeaders();
  const image = card.image;
  if (!image || !headers) return null;
  return (
    <Image
      source={{ uri: apiUrl(image.url), headers }}
      accessibilityLabel={image.description ?? undefined}
      resizeMode="contain"
      className="w-full rounded-lg"
      style={{ aspectRatio: image.width / Math.max(1, image.height), maxHeight: 280 }}
    />
  );
}

/**
 * The card holds the screen. Unrevealed it is the cue alone (the term, the meaning, or a picture,
 * by the mode the draw chose); a tap anywhere reveals what is asked for.
 */
function CardPlate({
  turn,
  item: { card, fsrsState, mode },
  deckName,
  forgotten,
  revealed,
  still,
  onReveal,
  onUndo,
}: {
  turn: string;
  item: QueueItem;
  deckName: string | undefined;
  forgotten: boolean;
  revealed: boolean;
  still: boolean;
  onReveal: (() => void) | undefined;
  /** Offered to VoiceOver as an action on the card while there is a grade to take back. */
  onUndo: (() => void) | undefined;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReduceMotion();
  const state = STATE[standing(fsrsState)];
  const section = useSections(card.sectionId ? card.deckId : undefined).data?.sections.find(
    (s) => s.id === card.sectionId,
  )?.name;
  const answer = mode.target === "term" ? card.term : (card.meaning ?? "");
  const cue = mode.cue === "image" ? null : mode.cue === "term" ? card.term : (card.meaning ?? "");
  // A picture cue shows neither side, so the answer comes with the other one.
  const other = mode.cue !== "image" ? null : mode.target === "term" ? card.meaning : card.term;

  return (
    <Animated.View
      layout={reduce ? undefined : LinearTransition.duration(GLIDE).easing(EASE)}
      entering={still ? undefined : FadeIn.duration(160).reduceMotion(ALWAYS)}
      className="flex-1"
    >
      <Pressable
        onPress={revealed ? undefined : onReveal}
        disabled={revealed || !onReveal}
        accessibilityActions={onUndo ? [{ name: "undo", label: t`Take back the last grade` }] : []}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "undo") onUndo?.();
        }}
        accessibilityRole={revealed ? undefined : "button"}
        accessibilityLabel={
          revealed ? undefined : `${cue ?? card.image?.description ?? ""}. Tap to reveal`
        }
        className="flex-1 overflow-hidden rounded-2xl border border-edge bg-plate"
        style={dark ? LIFT : undefined}
      >
        {/* The plate stays from card to card; only what it asks changes. motion.md "Review". */}
        <Animated.View
          key={turn}
          entering={still ? undefined : FadeIn.duration(160).reduceMotion(ALWAYS)}
          className="flex-1"
        >
          {/* At large text sizes the deck and the state stack rather than clip. */}
          <View className="flex-row flex-wrap items-center justify-between gap-2 px-6 pt-5">
            <View className="flex-row items-center gap-2">
              <Icon name="deck" size={18} colour={p.muted} />
              <Text className="text-md text-text-2">{deckName}</Text>
            </View>
            <View className="min-h-9 flex-row items-center gap-1.5 rounded-full bg-plate-2 px-3.5 py-1">
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
              layout={reduce ? undefined : LinearTransition.duration(GLIDE).easing(EASE)}
            >
              {cue === null ? (
                <Picture card={card} />
              ) : (
                <Text
                  className="text-text"
                  style={{ fontSize: 46, lineHeight: 58, fontWeight: "500", letterSpacing: -1.2 }}
                  // The word is already the largest text on the card; grown, a long one would break mid-word.
                  maxFontSizeMultiplier={1}
                >
                  {cue}
                </Text>
              )}
            </Animated.View>
            {revealed && (
              <View className="gap-4 pt-5">
                <Animated.View
                  entering={still ? undefined : reduce ? CROSSFADE : rule}
                  className="h-px bg-edge-2"
                  // The rule draws from the start edge, which is the right in a right-to-left language.
                  style={{ transformOrigin: I18nManager.isRTL ? "100% 50%" : "0% 50%" }}
                />
                <Animated.View entering={still ? undefined : reduce ? CROSSFADE : rise(0)}>
                  <Text className="text-xl text-text">{answer}</Text>
                </Animated.View>
                {other && (
                  <Animated.View entering={still ? undefined : reduce ? CROSSFADE : rise(1)}>
                    <Text className="text-md text-text-2">{other}</Text>
                  </Animated.View>
                )}
                {card.example && (
                  <Animated.View entering={still ? undefined : reduce ? CROSSFADE : rise(2)}>
                    <Text className="text-md text-text-2">{card.example}</Text>
                  </Animated.View>
                )}
                {section && (
                  <Animated.View
                    entering={still ? undefined : reduce ? CROSSFADE : rise(3)}
                    className="flex-row"
                  >
                    <View className="min-h-8 flex-row items-center gap-1.5 rounded-full bg-plate-2 px-3 py-1">
                      <Icon name="section" size={15} colour={p.muted} />
                      <Text className="text-base text-text-2">{section}</Text>
                    </View>
                  </Animated.View>
                )}
              </View>
            )}
          </View>

          {!revealed && (
            <Animated.View
              entering={FadeIn.delay(900).duration(400).reduceMotion(ALWAYS)}
              className="items-center pb-6"
            >
              <Text className="text-base text-muted">Tap to reveal</Text>
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
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
    .delay(80 + i * 35)
    .reduceMotion(ALWAYS);

/**
 * Four grades under the card, 80 pt tall and nearly square, in the thumb's reach. Same tap, same
 * weight, whichever is chosen. phone.md "Review".
 */
function GradeStrip({ onGrade }: { onGrade: ((r: Rating) => void) | undefined }) {
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReduceMotion();
  return (
    <Animated.View
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      className="flex-row gap-2 px-4 pt-3"
    >
      {GRADES.map((g, i) => (
        <Animated.View key={g.label} entering={reduce ? CROSSFADE : gradeIn(i)} className="flex-1">
          <Press
            scale={0.96}
            haptic={false}
            onPress={() => onGrade?.((i + 1) as Rating)}
            accessibilityRole="button"
            accessibilityLabel={g.label}
            className="h-20 items-center justify-center gap-1.5 rounded-xl border border-edge bg-plate"
            style={dark ? LIFT : undefined}
          >
            <Icon name={g.icon} size={24} colour={p[g.tint]} />
            <Text maxFontSizeMultiplier={1.3} className="text-base font-medium text-text-2">
              {g.label}
            </Text>
          </Press>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/** A part of the end rising into place: the web's `.seq`, without the blur iOS cannot draw on a view. */
const RISE = { ms: 560, y: 14 };
/** The count's own rise, from a little smaller. */
const COUNT_RISE = { ms: 720, y: 10, scale: 0.86 };
/** The lantern's place in the review's header, which it leaves from. */
const HEADER_LANTERN = { size: 48, inset: 16, top: 4 };
const END_LANTERN = 168;

const AnimatedInput = Animated.createAnimatedComponent(TextInput);
const easeOut = curveFn(EASE_OUT);
const roll = curveFn(COUNT_ROLL);

/** How far into its own movement a part is, eased, by the screen's clock. */
function beat(clock: number, at: number, ms: number) {
  "worklet";
  return easeOut(Math.min(1, Math.max(0, (clock - at) / ms)));
}

function useRise(
  clock: SharedValue<number>,
  at: number,
  { ms, y, scale = 1 }: { ms: number; y: number; scale?: number } = RISE,
) {
  return useAnimatedStyle(() => {
    const t = beat(clock.value, at, ms);
    return {
      opacity: t,
      transform: [{ translateY: (1 - t) * y }, { scale: scale + (1 - scale) * t }],
    };
  });
}

/**
 * The one place the interface celebrates: the lantern lit large in a pool of its glow. It plays as one
 * sequence on one clock, and the first tap finishes the clock. motion.md "The end of a review".
 */
function Completion({
  from,
  added,
  onClose,
  onContinue,
}: {
  /** Today's reviews when this review began, where the count rolls up from. */
  from: number;
  added: number;
  onClose: () => void;
  /** Left partway: the way back to the card still drawn. */
  onContinue?: (() => void) | undefined;
}) {
  const { t } = useLingui();
  const { goal, week, streak, dayDone, out, progress, fed } = useDay();
  const forgottenToday = useRounds().data?.forgotten ?? 0;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const to = from + added;
  const satisfied = to >= goal || dayDone;
  const heading =
    to >= goal
      ? "Daily goal reached"
      : onContinue
        ? t`Review done`
        : dayDone
          ? "You’re done for today"
          : "Nothing left here";

  const embers = useMemo(
    () => (reduce || out ? [] : endEmbers(emberCount(added, goal))),
    [reduce, out, added, goal],
  );
  const rollMs = countRollMs(from, to);
  const ways = (forgottenToday > 0 ? 1 : 0) + (onContinue ? 1 : 0);
  const actionsAt = AT.actions + ways * AT.actionStep;
  const end = Math.max(
    actionsAt + RISE.ms,
    AT.countRoll + rollMs,
    AT.embers + Math.max(0, ...embers.map((e) => e.at + e.dur)),
  );

  const clock = useSharedValue(reduce ? end : 0);
  // The ways on cannot be pressed until they have arrived, so the tap that finishes the sequence never presses one.
  const [settled, setSettled] = useState(reduce);
  const finish = () => {
    clock.value = end;
    setSettled(true);
    void stopHaptics();
  };

  const turned = satisfied && from < goal && added > 0;
  useEffect(() => {
    void playHaptics(endHaptics(embers, turned, reduce));
    return () => void stopHaptics();
  }, [embers, turned, reduce]);
  useEffect(() => {
    if (reduce) {
      clock.value = end;
      setSettled(true);
      return;
    }
    clock.value = withTiming(end, { duration: end, easing: Easing.linear, reduceMotion: ALWAYS });
    const timer = setTimeout(() => setSettled(true), actionsAt + RISE.ms);
    return () => clearTimeout(timer);
  }, [reduce, clock, end, actionsAt]);

  const heading$ = useRise(clock, AT.heading);
  const count$ = useRise(clock, AT.count, COUNT_RISE);
  const label$ = useRise(clock, AT.count + 80);
  const lights$ = useRise(clock, AT.lights, { ms: 300, y: 0 });
  const run$ = useRise(clock, AT.run);
  const continue$ = useRise(clock, AT.actions);
  const forgotten$ = useRise(clock, AT.actions + (onContinue ? AT.actionStep : 0));
  const done$ = useRise(clock, actionsAt);

  return (
    <Animated.View
      // Under reduced motion the whole screen crossfades in with its final numbers in place.
      entering={reduce ? CROSSFADE : undefined}
      onTouchStart={settled ? undefined : finish}
      style={StyleSheet.absoluteFill}
    >
      {/* It scrolls only when the reader's text size outgrows the screen; the light is never clipped at its edge. */}
      <ScrollView
        style={styles.unclipped}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Flight clock={clock} still={reduce}>
            <LightPool
              size={END_LANTERN}
              clock={clock}
              strength={added > 0 ? 1 : 0.5}
              still={reduce}
            />
            <Lantern size={END_LANTERN} progress={progress} out={out} fed={fed} />
            <EndEmbers size={END_LANTERN} clock={clock} embers={embers} />
          </Flight>
          <View className="items-center gap-2">
            <Animated.View style={heading$}>
              <Text className="text-2xl font-medium text-text" accessibilityRole="header">
                {heading}
              </Text>
            </Animated.View>
            <View accessible accessibilityLabel={`${to} reviews today`} className="items-center">
              <Animated.View style={count$}>
                <RollingCount clock={clock} from={from} to={to} rollMs={rollMs} />
              </Animated.View>
              <Animated.View style={label$}>
                <Text className="text-md text-muted">reviews today</Text>
              </Animated.View>
            </View>
          </View>
          <View className="w-full max-w-[300px] gap-3">
            <Animated.View style={lights$}>
              <SevenLights
                // Finished early, the lights take their final heights at once rather than replaying.
                key={settled ? "settled" : "playing"}
                days={week}
                goal={goal}
                todayDone={dayDone}
                sequence={settled ? undefined : AT.lights}
              />
            </Animated.View>
            <Animated.View style={run$}>
              <Text className="text-center text-base text-text-2">
                {satisfied
                  ? `${streak} days in a row`
                  : `${goal - to} more reviews reach your goal`}
              </Text>
            </Animated.View>
          </View>
        </View>
        <View className="gap-3 px-5 pt-6" pointerEvents={settled ? "auto" : "none"}>
          {onContinue && (
            <Animated.View style={continue$}>
              <Button label={t`Continue`} onPress={onContinue} />
            </Animated.View>
          )}
          {forgottenToday > 0 && (
            <Animated.View style={forgotten$}>
              <Button
                label={`Review ${forgottenToday} forgotten ${forgottenToday === 1 ? "card" : "cards"}`}
                onPress={() => router.replace("/review?round=forgotten")}
              />
            </Animated.View>
          )}
          <Animated.View style={done$}>
            <Button label="Done" variant="primary" size="xl" onPress={onClose} />
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

/**
 * The lantern leaves the header for the middle of the screen on a spring, growing to full size on
 * the way. Under reduced motion it does not travel.
 */
function Flight({
  clock,
  still,
  children,
}: {
  clock: SharedValue<number>;
  still: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The place it lands, read on the UI thread each frame, so a layout that settles late never misplaces the start.
  const place = useAnimatedRef<Animated.View>();
  const half = HEADER_LANTERN.size / 2;
  const fromX = I18nManager.isRTL
    ? width - HEADER_LANTERN.inset - half
    : HEADER_LANTERN.inset + half;
  const fromY = insets.top + HEADER_LANTERN.top + half;
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: 1, transform: [] };
    const at = measure(place);
    if (!at) return { opacity: 0, transform: [] };
    const f = springAt(clock.value, LANTERN_FLIGHT);
    const scale = HEADER_LANTERN.size / END_LANTERN;
    return {
      opacity: 1,
      transform: [
        { translateX: (fromX - (at.pageX + at.width / 2)) * (1 - f) },
        { translateY: (fromY - (at.pageY + at.height / 2)) * (1 - f) },
        { scale: scale + (1 - scale) * f },
      ],
    };
  });
  return (
    <Animated.View ref={place} style={{ width: END_LANTERN, height: END_LANTERN }}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>
    </Animated.View>
  );
}

/**
 * Today's count rolls up from where this review began. The digits are written on the UI thread into a
 * read-only field over the final number, which holds the width, so the screen never re-renders as they roll.
 */
function RollingCount({
  clock,
  from,
  to,
  rollMs,
}: {
  clock: SharedValue<number>;
  from: number;
  to: number;
  rollMs: number;
}) {
  const p = usePalette();
  const { fontScale } = useWindowDimensions();
  const labels = useMemo(() => {
    const format = new Intl.NumberFormat();
    return Array.from({ length: to - from + 1 }, (_, i) => format.format(from + i));
  }, [from, to]);
  const fit = fitType(COUNT_SIZE, fontScale);
  const animated = useAnimatedProps(() => {
    const t = roll(Math.min(1, Math.max(0, (clock.value - AT.countRoll) / rollMs)));
    const text = labels[Math.round(t * (labels.length - 1))] ?? "";
    return { text, defaultValue: text } as Partial<TextInputProps>;
  });
  return (
    <View>
      <Text
        className="font-medium"
        style={[styles.count, { color: "transparent" }]}
        importantForAccessibility="no"
      >
        {labels[labels.length - 1]}
      </Text>
      <AnimatedInput
        editable={false}
        allowFontScaling={false}
        accessibilityElementsHidden
        animatedProps={animated}
        defaultValue={labels[0]}
        className="absolute inset-0 font-sans font-medium"
        style={[
          styles.count,
          {
            color: p.text,
            fontSize: fit.drawn,
            lineHeight: fit.drawn * 1.2,
            letterSpacing: fit.letterSpacing,
            padding: 0,
            textAlign: "center",
          },
        ]}
      />
    </View>
  );
}

/** The count that ends a review, the largest thing on the phone; it keeps a 1.2 line box. */
const COUNT_SIZE = 80;

const styles = StyleSheet.create({
  unclipped: { overflow: "visible" },
  count: { fontSize: COUNT_SIZE, lineHeight: COUNT_SIZE * 1.2, fontVariant: ["tabular-nums"] },
});
