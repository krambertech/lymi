import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { apiUrl, type QueueItem, type ReviewScope } from "@lymi/client/api";
import { gradeStore } from "@lymi/client/grades";
import { useRecallClock } from "@lymi/client/recall-clock";
import { drawableLeft } from "@lymi/client/review-day";
import { type LocalGrade, reviewItem, stateBefore } from "@lymi/client/review-draw";
import { type EndScreen, forgottenRound, type Offer, reviewEnd } from "@lymi/client/review-end";
import {
  countedRating,
  type Drawn,
  drawKey,
  interval,
  modeKey,
  type Rating,
  ROUNDS,
  type Round,
} from "@lymi/core";
import {
  END_OF_REVIEW as AT,
  COUNT_ROLL,
  countRollMs,
  EASE_OUT,
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
import { Flame } from "../brand/flame";
import { Lantern } from "../brand/lantern";
import {
  useDay,
  useDecks,
  useDraw,
  useDrawState,
  useGrade,
  useRoundQueue,
  useSections,
  useSeriesList,
  useUndoGrade,
} from "../data/queries";
import { CardNotes } from "../review/card-notes";
import { endHaptics } from "../review/end-haptics";
import { modeLabel } from "../review/modes";
import { Cover, usePullToEnd } from "../review/pull-to-end";
import { countReveal, RevealHint, useRevealHint } from "../review/reveal-hint";
import { markUndoHintSeen, UndoHint, undoHintSeen } from "../review/undo-hint";
import { CardStack, type TopCard, UndoArea, useUndoSwipe } from "../review/undo-swipe";
import { Wick } from "../review/wick";
import { ALWAYS, CROSSFADE, curve, curveFn, springAt, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { fitType } from "../theme/type";
import { AiCardChip, Chip, StateChip } from "../ui/chip";
import { GRADES } from "../ui/grade";
import { Button, Icon, IconButton, LIFT, Press, Text } from "../ui/primitives";
import { SevenLights } from "../ui/seven-lights";
import { Skeleton } from "../ui/skeleton";

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
  | { kind: "list"; date: string; size: number }
  | { kind: "forgotten"; date: string; items: Drawn[] };
/** Today's attempts at the last end screen or when the review opened, and whether the day counted then. */
interface Mark {
  attempts: number;
  satisfied: boolean;
}
/** A list's cards by key: graded, sent to the end by a refused grade, or out because the card is gone. */
interface ListCards {
  graded: ReadonlySet<string>;
  returned: ReadonlySet<string>;
  dropped: ReadonlySet<string>;
}
const NO_LIST_CARDS: ListCards = { graded: new Set(), returned: new Set(), dropped: new Set() };
/** The deck a card came from, named first on the card. A review can mix every deck. */
type CardDeck = { name: string; language?: string | null | undefined } | undefined;
/** The last grade and the card as it was shown, so a swipe from the start edge can bring both back. */
interface Graded {
  item: QueueItem;
  grade: LocalGrade;
  listed: boolean;
  deck: CardDeck;
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
  const params = useLocalSearchParams<{
    deck?: string;
    series?: string;
    section?: string;
    round?: string;
  }>();
  const round = ROUNDS.find((r) => r === params.round);
  const deck = params.deck || undefined;
  // One scope at a time, as on the web: a deck wins over a series, and a section needs its deck.
  const series = deck ? undefined : params.series || undefined;
  const section = deck ? params.section || undefined : undefined;
  const router = useRouter();

  // Opened from a widget, the review is the only screen, so leaving goes to Today.
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/today"));

  // A review of another scope or round starts over, so nothing from this one carries into it.
  return (
    <Run
      key={`${deck ?? ""}:${series ?? ""}:${section ?? ""}:${round ?? ""}`}
      scope={{ deck, series, section }}
      round={round}
      onClose={leave}
    />
  );
}

/**
 * One review. The draw picks each next card on the device from the fetched draw and this device's
 * grades, as the web's does (ADR 0019); a round from Today walks the server's list in order.
 */
function Run({
  scope: given,
  round,
  onClose,
}: {
  scope: ReviewScope;
  round: Round | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const { deck, series, section } = given;
  const scope = useMemo(() => ({ deck, series, section }), [deck, series, section]);
  const scoped = !!deck || !!series;
  const draw = useDraw(scope);
  const list = useRoundQueue(round, scope);
  const { reviewsToday, goal, dayDone } = useDay();
  const grade = useGrade();
  const takeBack = useUndoGrade();
  const { t } = useLingui();
  const decksQuery = useDecks();
  const decks = decksQuery.data;
  const seriesList = useSeriesList(!!series);
  const scopeSections = useSections(section ? deck : undefined);
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
  const [mark, setMark] = useState<Mark | null>(null);
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
    setMark({ attempts: state.attempts, satisfied: state.attempts >= data.goal || dayDone });
    setLeg(
      round && listData
        ? { kind: "list", date, size: listData.total }
        : {
            kind: "draw",
            date,
            from: state.attempts,
            until: !scoped && state.attempts < data.goal ? data.goal : null,
          },
    );
  }, [leg, data, state, round, listData, scoped, dayDone]);

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
  const listLeft =
    leg?.kind === "list"
      ? leftInList(listData?.items ?? [], listCards)
      : leg?.kind === "forgotten" && data && state
        ? leftInList(
            leg.items.flatMap((d) => reviewItem(data, state.log, d) ?? []),
            listCards,
          )
        : [];
  const current =
    !leg || paused ? null : leg.kind === "draw" ? (atStop ? null : drawn) : (listLeft[0] ?? null);
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
  // Leaving partway ends on the end screen, as the web does, unless nothing was added since the last one.
  const added = !!state && !!mark && state.attempts > mark.attempts;
  const leave = () => (added ? setPaused(true) : onClose());
  const pull = usePullToEnd({ onEnd: ended || !added ? onClose : leave, away: ended || !added });

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
      if (outcome !== "kept") return;
      // The server kept the grade, so the review steps forward again unless a new grade came first.
      undone.current.delete(last.grade.reviewedAt);
      if (gradedAt.current === -1) {
        if (last.listed) {
          const key = keyOf(last.item);
          setListCards((c) => ({ ...c, graded: withKey(c.graded, key) }));
        }
        setPinned(null);
        setReturned(false);
        setRevealed(false);
        setNow(new Date());
        setDone((n) => n + 1);
        setLastGraded(last);
      }
      Alert.alert(t`Couldn’t take back your grade for “${term}”. It still counts.`);
    });
  };
  const swipe = useUndoSwipe({ enabled: !!lastGraded && !ended, onUndo: undo });

  // A pinned card a refetch no longer holds, such as one archived meanwhile, gives way.
  const repin = !!state?.next && !staleDay && (!pinned || !pinnedItem);
  useEffect(() => {
    if (repin && state?.next) setPinned({ cardId: state.next.cardId, mode: state.next.mode });
  }, [repin, state?.next]);

  // Cards the draw still holds in this scope, the number Today shows.
  const left = useMemo(
    () => (data && state ? drawableLeft(data, state, deck) : 0),
    [data, state, deck],
  );
  // An empty draw is confirmed by a fetch begun after the last grade, or taken as it is offline.
  const lastChange = Math.max(0, ...grades.map((g) => new Date(g.reviewedAt).getTime()));
  const unreachable = draw.fetchStatus === "paused" || draw.isError;
  const confirmed = !!data && data.fetchedAt >= lastChange;
  const exhausted = !!data && !state?.next;
  const stopped =
    !!leg &&
    !!data &&
    !!state &&
    !current &&
    (paused || leg.kind !== "draw" || atStop || exhausted);
  const ending = paused ? "left" : atStop ? "goal" : "empty";
  const forgottenItems = useMemo(
    () => (stopped && data && state ? forgottenRound(data, state, deck) : []),
    [stopped, data, state, deck],
  );
  // An empty draw waits for a fetch begun after the last grade, so the heading never changes once shown.
  const checking =
    stopped &&
    !paused &&
    (left === 0 || (leg?.kind === "draw" && !atStop)) &&
    !confirmed &&
    !(unreachable && !draw.isFetching);
  useEffect(() => {
    if (checking && !unreachable && !draw.isFetching) void draw.refetch();
  }, [checking, unreachable, draw.isFetching, draw.refetch]);
  // The server sends a round a page at a time, so an emptied page asks for the next one.
  const listOwed =
    !!leg &&
    !current &&
    leg.kind === "list" &&
    listCards.graded.size + listCards.dropped.size < leg.size &&
    list.fetchStatus === "idle" &&
    !list.isError;
  useEffect(() => {
    if (listOwed) void list.refetch();
  }, [listOwed, list.refetch]);
  // The end waits for the last grades to land, so a refusal never takes back an end already shown.
  const landing = sending > 0 && !unreachable;
  // A scoped end names its deck, series or section and weighs the decks outside it, so it waits for them.
  const decksLoading =
    (scoped && !decksQuery.isFetchedAfterMount && decksQuery.fetchStatus === "fetching") ||
    (!!series && !seriesList.data && seriesList.fetchStatus === "fetching") ||
    (!!section && !scopeSections.data && scopeSections.fetchStatus === "fetching");
  const scopeSection = section
    ? scopeSections.data?.sections.find((s) => s.id === section)
    : undefined;
  const scopeName = section
    ? scopeSection?.name
    : deck
      ? decks?.find((d) => d.id === deck)?.name
      : series
        ? seriesList.data?.find((s) => s.id === series)?.name
        : undefined;
  const result =
    stopped && !checking && !landing && !listOwed && !decksLoading && mark && data && state
      ? reviewEnd({
          stretch: leg?.kind !== "draw" ? "list" : scoped ? "scope" : "day",
          ending,
          goal: data.goal,
          from: mark.attempts,
          attempts: state.attempts,
          satisfiedBefore: mark.satisfied,
          left,
          confirmed,
          elsewhere: !scoped
            ? 0
            : decks && (!section || scopeSection)
              ? decks
                  .filter((d) => (series ? d.seriesId !== series : d.id !== deck))
                  .reduce((n, d) => n + d.due, 0) +
                // The rest of a section's deck is its other sections.
                (section && scopeSection
                  ? Math.max(0, (decks.find((d) => d.id === deck)?.due ?? 0) - scopeSection.due)
                  : 0)
              : null,
          forgotten: forgottenItems.length,
        })
      : null;

  /** Past this end screen: the next one reports what changes from here. */
  const moveOn = () => {
    if (!state) return;
    const satisfied =
      !!mark?.satisfied || (result !== null && result !== "unchecked" && result.satisfied);
    setMark({ attempts: state.attempts, satisfied });
    setPaused(false);
    setPinned(null);
    setRevealed(false);
    setLastGraded(null);
  };
  const onOffer = (offer: Offer) => {
    if (!data || !state) return;
    if (offer.kind === "continue" && offer.to === "resume") {
      moveOn();
      return;
    }
    // The day's draw is a review without a scope, which starts over from where the day stands.
    if (offer.kind === "continue" && scoped) {
      router.replace("/review");
      return;
    }
    const date = state.day.date;
    moveOn();
    setListCards(NO_LIST_CARDS);
    if (offer.kind === "forgotten") setLeg({ kind: "forgotten", date, items: forgottenItems });
    else
      setLeg({
        kind: "draw",
        date,
        from: state.attempts,
        until: state.attempts < data.goal ? data.goal : null,
      });
  };

  // Nothing loaded and the fetch failed: say so, rather than wait on a blank screen.
  const failed =
    (!data && draw.isError && !draw.isFetching) ||
    (!!round && !listData && list.isError && !list.isFetching);
  if (failed) {
    return (
      <Cover style={pull.style}>
        <ReviewError
          title={t`Couldn’t load your cards`}
          body={t`Check your connection and try again.`}
          onRetry={() => void (round ? list.refetch() : draw.refetch())}
          action={t`Back`}
          onAction={onClose}
        />
      </Cover>
    );
  }
  if (!leg || (stopped && !result) || (!current && !stopped)) {
    return (
      <Cover style={pull.style}>
        <ReviewSkeleton />
      </Cover>
    );
  }
  if (result === "unchecked") {
    return (
      <Cover style={pull.style}>
        <ReviewError
          title={t`Couldn’t check for more cards`}
          body={t`Your grades are saved. Check your connection and try again.`}
          onRetry={() => void draw.refetch()}
          action={t`Done`}
          onAction={onClose}
        />
      </Cover>
    );
  }
  if (result && mark && state) {
    return (
      <Cover style={pull.style}>
        <Completion
          screen={result}
          from={mark.attempts}
          to={state.attempts}
          scopeName={scopeName}
          onOffer={onOffer}
          onClose={onClose}
          onAddCards={() => router.push("/capture")}
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
  if (!current || !data || !state) return null;
  const { card } = current;

  // What the header counts: today's attempts to the goal's stop, and a list's own otherwise.
  const legDone = leg.kind === "draw" ? state.attempts - leg.from : listCards.graded.size;
  const total =
    leg.kind === "list"
      ? leg.size - listCards.dropped.size
      : leg.kind === "forgotten"
        ? leg.items.length - listCards.dropped.size
        : leg.until !== null
          ? Math.min(leg.until - leg.from, legDone + left)
          : legDone + left;
  const lastToday = state.log
    .filter((e) => e.cardId === card.id && e.mode === modeKey(current.mode))
    .pop();
  const deckRow = decks?.find((d) => d.id === card.deckId);
  const cardDeck = deckRow && { name: deckRow.name, language: deckRow.defaultLanguage ?? null };
  const forgotten = round === "forgotten" || leg.kind === "forgotten" || lastToday?.rating === 1;

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
    const listed = leg.kind !== "draw";
    const record: LocalGrade = {
      cardId: item.card.id,
      mode: item.mode,
      rating: countedRating(rating, repeat),
      reviewedAt: new Date().toISOString(),
      stateBefore: repeat ? stateBefore(data, state.log, item.card.id, item.mode) : item.fsrsState,
      ...recallTimes(),
    };
    // The graded step shows under the next card from the frame it starts to slide in.
    swipe.arrive();
    const recorded = grade(record);
    if (listed) setListCards((c) => ({ ...c, graded: withKey(c.graded, key) }));
    setLastGraded({ item, grade: record, listed, deck: cardDeck, forgotten });
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
          const term = item.card.term;
          if (listed) {
            setListCards((c) => ({
              graded: withoutKey(c.graded, key),
              returned: outcome === "refused" ? withKey(c.returned, key) : c.returned,
              dropped: outcome === "gone" ? withKey(c.dropped, key) : c.dropped,
            }));
          }
          Alert.alert(
            outcome === "gone"
              ? t`Couldn’t save your grade for “${term}”. The card is no longer in your decks.`
              : t`Couldn’t save your grade for “${term}”. You’ll see it again.`,
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
            <Header done={legDone} total={total} onClose={leave} />
          </Animated.View>
        </GestureDetector>
        <UndoArea gesture={swipe.gesture}>
          <CardStack
            swipe={swipe}
            // A forgotten card can come straight back; by position it arrives afresh.
            turn={`${keyOf(current)}:${done}`}
            // A card brought back is already in place; only a new one slides in.
            arrive={!returned && done > 0}
            under={
              lastGraded && (
                <Turn
                  // Each graded card is drawn afresh, so nothing glides from the one before it.
                  key={lastGraded.grade.reviewedAt}
                  item={lastGraded.item}
                  deck={lastGraded.deck}
                  forgotten={lastGraded.forgotten}
                  revealed
                  still
                />
              )
            }
          >
            {(top) => (
              <Turn
                top={top}
                item={current}
                deck={cardDeck}
                forgotten={forgotten}
                revealed={revealed}
                still={returned}
                onReveal={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRevealed(true);
                }}
                onGrade={onGrade}
                onUndo={lastGraded ? undo : undefined}
              />
            )}
          </CardStack>
          {hint && !revealed && <UndoHint />}
        </UndoArea>
      </View>
    </Cover>
  );
}

/** While the cards load: the card's place held, so the review never opens on a blank room. */
function ReviewSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 px-4"
      style={{ paddingTop: insets.top + 64, paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-1 gap-4 rounded-2xl border border-edge bg-plate p-6">
        <Skeleton width="40%" height={14} />
        <View className="flex-1 justify-center gap-4">
          <Skeleton width="70%" height={36} />
          <Skeleton width="45%" height={16} />
        </View>
      </View>
    </View>
  );
}

/** A review that cannot go on: what happened, a retry, and a way out. */
function ReviewError({
  title,
  body,
  onRetry,
  action,
  onAction,
}: {
  title: string;
  body: string;
  onRetry: () => void;
  action: string;
  onAction: () => void;
}) {
  const { t } = useLingui();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 justify-between px-5"
      style={{ paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="flex-1 items-center justify-center gap-3 px-2">
        <Text className="text-center text-xl font-medium text-text" accessibilityRole="header">
          {title}
        </Text>
        <Text className="text-center text-md text-text-2">{body}</Text>
      </View>
      <View className="gap-3">
        <Button label={action} size="xl" onPress={onAction} />
        <Button label={t`Try again`} variant="primary" size="xl" onPress={onRetry} />
      </View>
    </View>
  );
}

/** A card and, once it is revealed, its grades under it: one step of the stack. */
function Turn({
  top,
  item,
  deck,
  forgotten,
  revealed,
  still = false,
  onReveal,
  onGrade,
  onUndo,
}: {
  /** On the top step, how the card moves; the step underneath stays still. */
  top?: TopCard;
  item: QueueItem;
  deck: CardDeck;
  forgotten: boolean;
  revealed: boolean;
  /** Shown as it already stands, with nothing arriving: a card brought back, or one underneath. */
  still?: boolean;
  onReveal?: () => void;
  onGrade?: (r: Rating) => void;
  onUndo?: (() => void) | undefined;
}) {
  const card = (
    <CardPlate
      item={item}
      deck={deck}
      forgotten={forgotten}
      revealed={revealed}
      still={still}
      onReveal={onReveal}
      onUndo={onUndo}
    />
  );
  return (
    <>
      <View className="flex-1 px-4 pt-3">
        {top ? (
          <Animated.View key={top.turn} entering={top.entering} style={{ flex: 1 }}>
            <Animated.View style={[{ flex: 1 }, top.style]}>{card}</Animated.View>
          </Animated.View>
        ) : (
          card
        )}
      </View>
      {revealed && <GradeStrip still={!top} next={item.next} onGrade={onGrade} />}
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
    <View className="h-12 flex-row items-center gap-3 ps-4 pe-1">
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
      {/* Plain, because leaving is rare; its 44 pt target overlaps the gap so the glyph sits by the count. phone.md "Review". */}
      <View style={{ marginStart: -14 }}>
        <IconButton icon="close" label={t`End review`} haptic={false} onPress={onClose} />
      </View>
    </View>
  );
}

const rise = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 10 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE },
  })
    .duration(260)
    .delay(80 + i * 50)
    .reduceMotion(ALWAYS);

/** The card's picture, fetched with the learner's session like every other request. */
function Picture({ card, maxHeight = 280 }: { card: QueueItem["card"]; maxHeight?: number }) {
  const headers = useSessionHeaders();
  const image = card.image;
  if (!image || !headers) return null;
  return (
    <Image
      source={{ uri: apiUrl(image.url), headers }}
      accessibilityLabel={image.description ?? undefined}
      resizeMode="contain"
      className="w-full rounded-lg"
      style={{ aspectRatio: image.width / Math.max(1, image.height), maxHeight }}
    />
  );
}

/**
 * The card holds the screen. Unrevealed it is the cue alone (the term, the meaning, or a picture,
 * by the mode the draw chose); a tap anywhere reveals what is asked for. A long answer scrolls inside
 * the plate, so the grades never move.
 */
function CardPlate({
  item: { card, fsrsState, mode },
  deck,
  forgotten,
  revealed,
  still,
  onReveal,
  onUndo,
}: {
  item: QueueItem;
  deck: CardDeck;
  forgotten: boolean;
  revealed: boolean;
  still: boolean;
  onReveal: (() => void) | undefined;
  /** Offered to VoiceOver as an action on the card while there is a grade to take back. */
  onUndo: (() => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReduceMotion();
  const hint = useRevealHint(onReveal ? `${card.id}:${modeKey(mode)}` : null, revealed);
  const section = useSections(card.sectionId ? card.deckId : undefined).data?.sections.find(
    (s) => s.id === card.sectionId,
  )?.name;
  const picture = mode.cue === "image";
  const noMeaning = t`No meaning yet`;
  const back = mode.target === "term" ? card.term : (card.meaning ?? noMeaning);
  const cue = mode.cue === "meaning" ? (card.meaning ?? card.term) : card.term;
  const languageCode =
    card.language && card.language.toLowerCase() !== deck?.language?.toLowerCase()
      ? card.language.toUpperCase()
      : null;
  const tail = [picture ? i18n._(modeLabel(mode)) : null, languageCode].filter(
    (part): part is string => !!part,
  );
  // Only the AI is marked: the learner's words and the lesson's are the ordinary case, CONTEXT.md.
  const aiWritten =
    card.meaningSource === "ai" ||
    (card.exampleSource === "ai" && !!card.example) ||
    (card.notesSource === "ai" && !!card.notes) ||
    (card.pronunciationSource === "ai" && !!card.pronunciation);
  // Where the card sits: its section, or the source it came from when it has none.
  const place = section
    ? { icon: "section" as const, name: section }
    : card.source
      ? { icon: "source" as const, name: card.source }
      : null;
  let line = 0;
  const arrive = () => (still ? undefined : reduce ? CROSSFADE : rise(line++));
  const glide = reduce || still ? undefined : LinearTransition.duration(GLIDE).easing(EASE);

  return (
    <Animated.View layout={glide} className="flex-1">
      <Pressable
        onPress={
          revealed
            ? undefined
            : () => {
                countReveal();
                onReveal?.();
              }
        }
        disabled={revealed || !onReveal}
        accessibilityActions={onUndo ? [{ name: "undo", label: t`Take back the last grade` }] : []}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "undo") onUndo?.();
        }}
        accessibilityRole={revealed ? undefined : "button"}
        accessibilityLabel={
          revealed
            ? undefined
            : picture
              ? t`Picture card: ${card.image?.description ?? ""}. Tap to reveal`
              : mode.cue === "term"
                ? t`Recognition card for ${cue}. Tap to reveal`
                : t`Production card for ${cue}. Tap to reveal`
        }
        className="flex-1 overflow-hidden rounded-2xl border border-edge bg-plate"
        style={dark ? LIFT : undefined}
      >
        {/* At large text sizes the deck and the state stack rather than clip. */}
        <View className="flex-row flex-wrap items-center justify-between gap-2 px-6 pt-5">
          <View className="min-w-0 shrink flex-row items-center gap-2">
            <Icon name="deck" size={18} colour={p.muted} />
            <Text className="shrink text-md text-text-2" numberOfLines={1}>
              {[deck?.name, ...tail].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <StateChip state={forgotten ? 3 : fsrsState} inReview />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="grow justify-center px-6 py-5"
          // Unrevealed, the whole plate is the button, so nothing scrolls under the finger.
          scrollEnabled={revealed}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View layout={glide}>
            {picture ? (
              card.image ? (
                <Picture card={card} />
              ) : (
                <Text className="text-md text-muted">{t`This card’s picture was removed.`}</Text>
              )
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
              <Wick still={still} />
              <Animated.View entering={arrive()}>
                <Text
                  className={picture ? "text-2xl font-medium text-text" : "text-xl text-text"}
                  style={back === noMeaning ? { color: p.muted } : undefined}
                >
                  {back}
                </Text>
              </Animated.View>
              {picture && (
                <Animated.View entering={arrive()}>
                  <Text className="text-lg text-text-2">
                    {mode.target === "term" ? card.meaning : card.term}
                  </Text>
                </Animated.View>
              )}
              {card.pronunciation && (mode.target === "term" || picture) && (
                <Animated.View entering={arrive()}>
                  <Text className="text-md text-muted">{card.pronunciation}</Text>
                </Animated.View>
              )}
              {!picture && card.image && (
                <Animated.View entering={arrive()} style={{ maxWidth: 220 }}>
                  <Picture card={card} maxHeight={120} />
                </Animated.View>
              )}
              {card.example && (
                <Animated.View entering={arrive()}>
                  <Text className="text-md text-text-2">{card.example}</Text>
                </Animated.View>
              )}
              {card.notes && (
                <Animated.View entering={arrive()}>
                  <CardNotes source={card.notes} className="text-base text-muted" />
                </Animated.View>
              )}
              {(place || aiWritten) && (
                <Animated.View
                  entering={arrive()}
                  className="flex-row flex-wrap items-center gap-1.5"
                >
                  {place && (
                    <Chip size="sm" icon={place.icon}>
                      {place.name}
                    </Chip>
                  )}
                  {aiWritten && <AiCardChip />}
                </Animated.View>
              )}
            </View>
          )}
        </ScrollView>

        {!revealed && hint && <RevealHint />}
      </Pressable>
    </Animated.View>
  );
}

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
function GradeStrip({
  still = false,
  next,
  onGrade,
}: {
  /** Underneath, the grades are already in place. */
  still?: boolean;
  /** When each grade brings the card back, which VoiceOver reads with it, as on the web. */
  next: QueueItem["next"];
  onGrade: ((r: Rating) => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReduceMotion();
  return (
    <Animated.View
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      className="flex-row gap-2 px-4 pt-3"
    >
      {GRADES.map((g, i) => {
        const label = i18n._(g.label);
        const back = next ? interval(new Date(), new Date(next[g.rating])) : null;
        const schedules = back
          ? i18n.number(back.value, { style: "unit", unit: back.unit, unitDisplay: "narrow" })
          : null;
        return (
          <Animated.View
            key={g.rating}
            entering={still ? undefined : reduce ? CROSSFADE : gradeIn(i)}
            className="flex-1"
          >
            <Press
              scale={0.96}
              haptic={false}
              onPress={() => onGrade?.(g.rating)}
              accessibilityRole="button"
              accessibilityLabel={schedules ? t`${label}, next in ${schedules}` : label}
              className="h-20 items-center justify-center gap-1.5 rounded-xl border border-edge bg-plate"
              style={dark ? LIFT : undefined}
            >
              <Icon name={g.icon} size={20} colour={p[g.tint]} />
              <Text maxFontSizeMultiplier={1.3} className="text-base font-medium text-text-2">
                {label}
              </Text>
            </Press>
          </Animated.View>
        );
      })}
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
 * sequence on one clock, and the first tap finishes the clock. What it says and offers is the web's
 * `reviewEnd` (ADR 0021). motion.md "The end of a review".
 */
function Completion({
  screen,
  from,
  to,
  scopeName,
  onOffer,
  onClose,
  onAddCards,
}: {
  screen: EndScreen;
  /** Today's reviews at the last end screen or when the review opened, where the count rolls up from. */
  from: number;
  to: number;
  scopeName: string | undefined;
  onOffer: (offer: Offer) => void;
  onClose: () => void;
  onAddCards: () => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const { goal, streak, lights, flame, out, progress, fed } = useDay();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const counted = screen.heading !== "nothing_due";
  const heading = {
    goal_reached: t`Daily goal reached`,
    day_done: t`You’re done for today`,
    scope_done: scopeName ? t`Nothing left in ${scopeName}` : t`Nothing left in this deck`,
    nothing_due: t`Nothing due`,
    round_done: t`Round done`,
    review_done: t`Review done`,
  }[screen.heading];

  const proceed = screen.offers.find((o) => o.kind === "continue");
  const ways = screen.offers.filter((o) => !(o.kind === "continue" && screen.continueLeads));
  const embers = useMemo(
    () => (reduce || out ? [] : endEmbers(screen.embers)),
    [reduce, out, screen.embers],
  );
  const rollMs = countRollMs(from, to);
  const actionsAt = AT.actions + ways.length * AT.actionStep;
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

  useEffect(() => {
    void playHaptics(endHaptics(embers, screen.streak, reduce));
    return () => void stopHaptics();
  }, [embers, screen.streak, reduce]);
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
  const nudge$ = useRise(clock, AT.run + 120);
  // At most two ways sit above the last row: Continue and Review forgotten.
  const way$ = [useRise(clock, AT.actions), useRise(clock, AT.actions + AT.actionStep)];
  const done$ = useRise(clock, actionsAt);

  const doneButton = (variant: "primary" | "secondary") => (
    <Button label={t`Done`} variant={variant} size="xl" onPress={onClose} />
  );

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
              strength={to > from ? 1 : 0.5}
              still={reduce}
            />
            <Lantern size={END_LANTERN} progress={progress} out={out} fed={fed} />
            <EndEmbers size={END_LANTERN} clock={clock} embers={embers} />
          </Flight>
          <View className="items-center gap-2">
            <Animated.View style={heading$}>
              <Text
                className="text-center text-2xl font-medium text-text"
                accessibilityRole="header"
              >
                {heading}
              </Text>
            </Animated.View>
            {counted ? (
              <View
                accessible
                accessibilityLabel={t`${plural(to, { one: "# review today", other: "# reviews today" })}`}
                className="items-center"
              >
                <Animated.View style={count$}>
                  <RollingCount clock={clock} from={from} to={to} rollMs={rollMs} />
                </Animated.View>
                <Animated.View style={label$}>
                  <Text className="text-md text-muted">
                    {t`${plural(to, { one: "review today", other: "reviews today" })}`}
                  </Text>
                </Animated.View>
              </View>
            ) : (
              <Animated.View style={count$}>
                <Text className="text-center text-md text-text-2">
                  {t`Come back later, or add new cards.`}
                </Text>
              </Animated.View>
            )}
          </View>
          <View className="w-full max-w-[300px] items-center gap-3">
            <Animated.View style={lights$} className="w-full">
              <SevenLights
                // Finished early, the lights take their final heights at once rather than replaying.
                key={settled ? "settled" : "playing"}
                days={lights.days}
                satisfied={lights.satisfied}
                rest={lights.rest}
                goals={lights.goals}
                goal={goal}
                sequence={settled ? undefined : AT.lights}
              />
            </Animated.View>
            <Animated.View style={run$} className="flex-row items-center gap-2">
              <Flame height={20} state={flame} />
              <Text className="text-md font-semibold text-text" style={styles.figures}>
                {streak}
              </Text>
              <Text className="text-md text-text-2">
                {t`${plural(streak, { one: "day in a row", other: "days in a row" })}`}
              </Text>
            </Animated.View>
            {/* While Continue leads, what is left of the day sits under its lights. */}
            {screen.nudge && (
              <Animated.View style={nudge$}>
                <Text className="text-center text-base text-muted">
                  {screen.nudge.kind === "goal"
                    ? t`${plural(screen.nudge.count, { one: "# more review to your daily goal", other: "# more reviews to your daily goal" })}`
                    : t`${plural(screen.nudge.count, { one: "# more card and you’re done for today", other: "# more cards and you’re done for today" })}`}
                </Text>
              </Animated.View>
            )}
          </View>
        </View>
        {/* One shape for every way on, the count said in words; the primary sits last. */}
        <View className="gap-3 px-5 pt-6" pointerEvents={settled ? "auto" : "none"}>
          {ways.map((way, i) => (
            <Animated.View key={way.kind} style={way$[i]}>
              {way.kind === "forgotten" ? (
                <Button
                  label={t`${plural(way.count, { one: "Review # forgotten card", other: "Review # forgotten cards" })}`}
                  lead={<Icon name="forgot" size={20} colour={p["grade-forgot"]} />}
                  size="xl"
                  onPress={() => onOffer(way)}
                />
              ) : (
                <Button label={t`Continue`} size="xl" onPress={() => onOffer(way)} />
              )}
            </Animated.View>
          ))}
          <Animated.View style={done$} className="gap-3">
            {!counted ? (
              <>
                <Button label={t`Add cards`} variant="primary" size="xl" onPress={onAddCards} />
                {doneButton("secondary")}
              </>
            ) : screen.continueLeads && proceed ? (
              <>
                {doneButton("secondary")}
                <Button
                  label={t`Continue`}
                  variant="primary"
                  size="xl"
                  onPress={() => onOffer(proceed)}
                />
              </>
            ) : (
              doneButton("primary")
            )}
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
  figures: { fontVariant: ["tabular-nums"] },
});
