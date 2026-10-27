import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { apiUrl, type Card, type QueueItem, type ReviewScope } from "@lymi/client/api";
import { gradeStore } from "@lymi/client/grades";
import { readingsFadedField, useKnownReadings } from "@lymi/client/known-readings";
import { useRecallClock } from "@lymi/client/recall-clock";
import { drawableLeft } from "@lymi/client/review-day";
import { type LocalGrade, reviewItem, stateBefore } from "@lymi/client/review-draw";
import {
  type EndScreen,
  forgottenRound,
  legFinish,
  type Offer,
  type RoundAsk,
  reviewEnd,
  roundWalk,
} from "@lymi/client/review-end";
import { writes } from "@lymi/client/writes";
import {
  CHOSEN_LIMIT,
  countedRating,
  cueShowsPronunciation,
  type Drawn,
  drawKey,
  type FieldSource,
  gradeAllowed,
  interval,
  isolate,
  type KnownReadings,
  modeKey,
  type PronunciationDisplay,
  type Rating,
  ROUNDS,
  type Round,
  shownTranslation,
  termShowsPronunciation,
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
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
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
  type AnimatedRef,
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
import { EndEmbers, LightPool, TurnSpark } from "../brand/ending";
import { Flame } from "../brand/flame";
import { Lantern } from "../brand/lantern";
import { holdCard, onCardEdited } from "../card/edited";
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
import { spokenInterval } from "../i18n/interval";
import { CardNotes } from "../review/card-notes";
import { ScrollFade, useScrollEdges } from "../review/card-scroll";
import { CardLine, FIT_STEPS, typeAt, useFitStep } from "../review/card-type";
import { endHaptics } from "../review/end-haptics";
import {
  type ExampleAudio,
  ExampleAudioButton,
  ExamplePress,
  useExampleAudio,
} from "../review/example-audio";
import {
  HintLine,
  HintOffer,
  HintSheet,
  PEEK_ROOM,
  PeekButton,
  ShowHintButton,
} from "../review/hints";
import { modeLabel } from "../review/modes";
import {
  PronounceButton,
  type Pronunciation,
  TipProvider,
  usePronunciation,
  useTipLayer,
} from "../review/pronounce";
import { Cover, usePullToEnd } from "../review/pull-to-end";
import { countReveal, RevealNudge, useRevealNudge } from "../review/reveal-nudge";
import { CardStack, type TopCard, UndoArea, useUndoSwipe } from "../review/undo-swipe";
import { Wick } from "../review/wick";
import { reportHref } from "../sharing/report";
import { captureEvent } from "../telemetry/posthog";
import { useReviewSession } from "../telemetry/review-session";
import { haptics } from "../theme/haptics";
import { ALWAYS, CROSSFADE, curve, curveFn, springAt, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { fitType } from "../theme/type";
import { Chip, StateChip } from "../ui/chip";
import { Furigana } from "../ui/furigana";
import { GRADES } from "../ui/grade";
import { Button, Icon, IconButton, LIFT, Press, Text } from "../ui/primitives";
import { SevenLights } from "../ui/seven-lights";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";
import { stateKey } from "../ui/state-mark";
import { useStreakStart } from "../ui/streak-start";
import { useSystemBack } from "../ui/system-back";
import { ExampleText, TermText } from "../ui/term-text";
import { ToastFloor, ToastHost, ToastScope, toast } from "../ui/toast-host";

const EASE = curve(EASE_OUT);
const GLIDE = REVEAL_GLIDE.duration * 1000;
/** Cards drawn ahead of the one on screen; fewer left than this and the draw is fetched again. */
const LOOKAHEAD = 3;
/** Local grades a fetch can fall behind by before the draw data is refreshed. */
const REFRESH_AFTER = 20;
// Review is presented over the root, so it hosts its own toasts.
const REVIEW_TOASTS = "review";
const ARCHIVED_TOAST = "review-archived";

type Pinned = { cardId: string; mode: string };
/** A card archived from its menu, offered back for a few seconds. */
type Gone = { card: Card; key: string; mode: string };
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
type CardDeck =
  | {
      name: string;
      language?: string | null | undefined;
      /** The learner's adaptive pronunciation choice for the deck; absent reads as the default. */
      pronunciationDisplay?: PronunciationDisplay | undefined;
    }
  | undefined;
/** A card's hint as review shows it: its words and who wrote them. */
type Hint = { text: string; source: FieldSource | null };
/** A tap this soon after the reveal is the reveal's own tap doubled, not one for the menu. */
const REVEAL_TAP_GUARD_MS = 400;
/** The last grade and the card as it was shown, so a swipe from the start edge can bring both back. */
interface Graded {
  item: QueueItem;
  grade: LocalGrade;
  listed: boolean;
  /** The hint as it showed under the cue at the grade, or nothing when it was not showing. */
  hint: Hint | null;
  /** The step exactly as it was drawn at the grade, so the copy left underneath never reflows. */
  shown: Step;
}

const keyOf = (item: Pick<QueueItem, "card" | "mode">) => drawKey(item.card.id, modeKey(item.mode));
const withKey = (keys: ReadonlySet<string>, key: string) => new Set(keys).add(key);
const withoutKey = (keys: ReadonlySet<string>, key: string) => {
  const next = new Set(keys);
  next.delete(key);
  return next;
};

/** What the header counts: today's attempts to the goal's stop, and a list's own otherwise. */
function legProgress(leg: Leg, attempts: number, cards: ListCards, left: number) {
  const done = leg.kind === "draw" ? attempts - leg.from : cards.graded.size;
  const total =
    leg.kind === "list"
      ? leg.size - cards.dropped.size
      : leg.kind === "forgotten"
        ? leg.items.length - cards.dropped.size
        : leg.until !== null
          ? Math.min(leg.until - leg.from, done + left)
          : done + left;
  return { done, total };
}

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
    /** Cards chosen on a deck page, comma-separated. */
    cards?: string;
  }>();
  const round = ROUNDS.find((r) => r === params.round);
  const deck = params.deck || undefined;
  // One scope at a time, as on the web: a deck wins over a series, and a section needs its deck.
  const series = deck ? undefined : params.series || undefined;
  const section = deck ? params.section || undefined : undefined;
  // Trimmed rather than dropped, so a long list never widens into the whole deck's review.
  const chosen = deck && !round && !section ? params.cards?.split(",").filter(Boolean) : undefined;
  const cards = chosen?.length ? chosen.slice(0, CHOSEN_LIMIT) : undefined;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Opened from a widget, the review is the only screen, so leaving goes to Today.
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/today"));

  // A review of another scope or round starts over, so nothing from this one carries into it.
  return (
    <ToastScope.Provider value={REVIEW_TOASTS}>
      <Run
        key={`${deck ?? ""}:${series ?? ""}:${section ?? ""}:${round ?? ""}:${cards?.join(",") ?? ""}`}
        scope={{ deck, series, section }}
        round={round}
        cards={cards}
        onClose={leave}
      />
      <ToastHost />
    </ToastScope.Provider>
  );
}

/**
 * One review. The draw picks each next card on the device from the fetched draw and this device's
 * grades, as the web's does (ADR 0019); a round from Today, or cards chosen on a deck page, walks
 * the server's list in order.
 */
function Run({
  scope: given,
  round,
  cards,
  onClose,
}: {
  scope: ReviewScope;
  round: Round | undefined;
  cards: string[] | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const { deck, series, section } = given;
  const scope = useMemo(() => ({ deck, series, section }), [deck, series, section]);
  const scoped = !!deck || !!series;
  const draw = useDraw(scope);
  const listed = !!round || !!cards;
  const list = useRoundQueue(round, scope, cards);
  const { reviewsToday, goal, dayDone } = useDay();
  const grade = useGrade();
  const takeBack = useUndoGrade();
  const known = useKnownReadings();
  const { t } = useLingui();
  const decksQuery = useDecks();
  const decks = decksQuery.data;
  const seriesList = useSeriesList(!!series);
  const scopeSections = useSections(section ? deck : undefined);
  const insets = useSafeAreaInsets();
  // Cards archived from this review, gone from it at once rather than when the draw is fetched again.
  const [archived, setArchived] = useState<ReadonlySet<string>>(() => new Set());
  // Cards edited in this review, shown corrected at once; the review goes on with them.
  const [edits, setEdits] = useState<ReadonlyMap<string, Card>>(() => new Map());
  // A cached draw can predate the last grade, so the first card waits for this mount's fetch.
  const settled = draw.isFetchedAfterMount || draw.fetchStatus !== "fetching";
  const data = useMemo(() => {
    const fetched = settled ? draw.data : undefined;
    if (!fetched || archived.size === 0) return fetched;
    return { ...fetched, cards: fetched.cards.filter((c) => !archived.has(c.card.id)) };
  }, [settled, draw.data, archived]);
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
  // How far into the card's hint the learner went, held for the card on screen: a peek before the
  // reveal is help with recall, and a look after it is not.
  const [aidState, setAidState] = useState({ key: "", peeked: false, shown: false });
  // Whether the card on screen offers a hint, decided as it arrives and held until its grade.
  const [cardOffer, setCardOffer] = useState({ key: "", offer: false, parked: false });
  // Presses of Easy after a peek, counted per card so an earlier card's never show its tip.
  const [locked, setLocked] = useState({ key: "", presses: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  // What the menu chose, run once its sheet has gone, so nothing moves under it.
  const chosen = useRef<(() => void) | null>(null);
  // Hints and marks set in this review, shown at once rather than when the draw is fetched again.
  const [hints, setHints] = useState<ReadonlyMap<string, Hint>>(() => new Map());
  const [marks, setMarks] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const revealedAt = useRef(0);
  // Grades taken back, by when they were made, whose answers from the server no longer apply.
  const undone = useRef(new Set<string>());
  const started = useRef(false);

  // Edit card saves over the review; the review goes on with the corrected card.
  useEffect(
    () =>
      onCardEdited((written) => {
        setEdits((m) => new Map(m).set(written.id, written));
        // The corrected card carries its hint, so an earlier hint saved here no longer stands in.
        setHints((m) => {
          if (!m.has(written.id)) return m;
          const next = new Map(m);
          next.delete(written.id);
          return next;
        });
      }),
    [],
  );
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
    if (leg || !data || !state || (listed && !listData)) return;
    setListCards(NO_LIST_CARDS);
    const date = state.day.date;
    setMark({ attempts: state.attempts, satisfied: state.attempts >= data.goal || dayDone });
    setLeg(
      listed && listData
        ? { kind: "list", date, size: listData.total }
        : {
            kind: "draw",
            date,
            from: state.attempts,
            until: !scoped && state.attempts < data.goal ? data.goal : null,
          },
    );
  }, [leg, data, state, listed, listData, scoped, dayDone]);

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
  const pronounce = usePronunciation(current?.card ?? null, (outcome, { preloaded, waitMs }) =>
    captureEvent("pronunciation_played", { outcome, revealed, preloaded, wait_ms: waitMs }),
  );
  // The example shows only after the reveal, so it can only be heard then.
  const exampleSound = useExampleAudio(revealed ? (current?.card ?? null) : null, "review");

  // A review starts with one firm tap as its first card arrives.
  useEffect(() => {
    if (!current || started.current) return;
    started.current = true;
    haptics.start();
  }, [current]);

  const ended = paused || (!!leg && !current);
  // Leaving partway ends on the end screen, as the web does, unless nothing was added since the last one.
  const added = !!state && !!mark && state.attempts > mark.attempts;
  const leave = () => (added ? setPaused(true) : onClose());
  const pull = usePullToEnd({ onEnd: ended || !added ? onClose : leave, away: ended || !added });
  // Android's Back leaves as ✕ does, so a review left partway still ends on its summary.
  useSystemBack(() => {
    if (ended || !added) onClose();
    else leave();
    return true;
  });

  /** One step back: the last graded card returns revealed, and its grade leaves the day. */
  const undo = () => {
    const last = lastGraded;
    if (!last) return;
    haptics.tick();
    undone.current.add(last.grade.reviewedAt);
    setLastGraded(null);
    if (last.listed) {
      const key = keyOf(last.item);
      setListCards((c) => ({ ...c, graded: withoutKey(c.graded, key) }));
    }
    setPinned({ cardId: last.item.card.id, mode: modeKey(last.item.mode) });
    setAidState({
      key: `${keyOf(last.item)}:${done - 1}`,
      peeked: last.grade.aid === "hint",
      shown: !!last.hint,
    });
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
      Alert.alert(
        t`Couldn’t take back your grade for “${{ term: isolate(term) }}”. It still counts.`,
      );
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
  // The refetch asked for once this leg's page in hand ran out; a new leg forgets it.
  const [ask, setAsk] = useState<(RoundAsk & { leg: Leg }) | null>(null);
  // The server sends a round a page at a time, so an emptied page asks for the next one, and the
  // end waits while it loads. The round is walked once every card in it is graded or dropped, or
  // when that fetch lands with nothing left for it. Offline or failed, the end shows unwalked.
  const roundState =
    leg?.kind === "list"
      ? roundWalk({
          size: leg.size,
          done: listCards.graded.size + listCards.dropped.size,
          left: current ? 1 : listLeft.length,
          ask: ask?.leg === leg ? ask : null,
          fetch: {
            updatedAt: list.dataUpdatedAt,
            idle: list.fetchStatus === "idle",
            failed: list.isError || list.fetchStatus === "paused",
          },
        })
      : null;
  // A forgotten round holds every card from the start, so it is walked once none is left to show.
  const walked = roundState
    ? roundState.walked
    : leg?.kind === "forgotten" && !current && listLeft.length === 0;
  const listOwed = !!roundState?.owed && !current;
  const askRound = !!roundState?.refetch && !current;
  useEffect(() => {
    if (!askRound || !leg) return;
    setAsk({ leg, at: list.dataUpdatedAt, done: listCards.graded.size + listCards.dropped.size });
    void list.refetch();
  }, [askRound, leg, list.dataUpdatedAt, listCards, list.refetch]);
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

  const progress = leg && state ? legProgress(leg, state.attempts, listCards, left) : null;
  useReviewSession({
    key: leg && mark ? `${leg.date}:${leg.kind}:${mark.attempts}` : null,
    date: leg?.date ?? null,
    scope:
      leg?.kind === "forgotten"
        ? "round"
        : leg?.kind === "list"
          ? cards
            ? "chosen"
            : "round"
          : section
            ? "section"
            : deck
              ? "deck"
              : series
                ? "series"
                : "day",
    before: mark?.attempts ?? 0,
    done: progress?.done ?? 0,
    count: progress?.total ?? 0,
    presenting: !!current,
    stopped,
    paused,
    finished: legFinish(
      result,
      ending,
      leg?.kind !== "draw" ? { stretch: "list", walked } : { stretch: "day", confirmed },
    ),
  });

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

  // Undo for a card archived from its menu, offered over the next card or the end screen.
  const bringBack = ({ card: back, key }: Gone) => {
    setArchived((s) => {
      const next = new Set(s);
      next.delete(back.id);
      return next;
    });
    setListCards((c) => ({ ...c, dropped: withoutKey(c.dropped, key) }));
  };
  const undoArchive = async (gone: Gone) => {
    const { card: back, mode } = gone;
    haptics.tick();
    try {
      await writes.restoreCard(back.id);
      bringBack(gone);
      // It comes back to the top, where it was, rather than wherever the draw would put it.
      setPinned({ cardId: back.id, mode });
      setRevealed(false);
    } catch (e) {
      Alert.alert(
        t`Couldn’t restore “${isolate(back.term)}”.`,
        e instanceof Error ? e.message : undefined,
      );
    }
  };
  // Nothing loaded and the fetch failed: say so, rather than wait on a blank screen.
  const failed =
    (!data && draw.isError && !draw.isFetching) ||
    (listed && !listData && list.isError && !list.isFetching);
  if (failed) {
    return (
      <Cover style={pull.style}>
        <ReviewError
          title={t`Couldn’t load your cards`}
          body={t`Check your connection and try again.`}
          onRetry={() => void (listed ? list.refetch() : draw.refetch())}
          action={t`Back`}
          onAction={onClose}
        />
      </Cover>
    );
  }
  // While the end waits for the last grade to land, the header holds still, so the lantern leaves from it.
  if (stopped && !result && progress) {
    return (
      <Cover style={pull.style}>
        <View className="flex-1" style={{ paddingTop: insets.top + 4 }}>
          <Header done={progress.done} total={progress.total} onClose={onClose} />
        </View>
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
  // After a deck's review, new cards go to that deck when the learner owns it.
  const addTo = deck && decks?.find((d) => d.id === deck)?.role === "owner" ? deck : undefined;
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
          onAddCards={() => router.push(addTo ? (`/capture?deck=${addTo}` as Href) : "/capture")}
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
  const edited = edits.get(current.card.id);
  const item = edited ? { ...current, card: edited } : current;
  const { card } = item;

  const { done: legDone, total } = legProgress(leg, state.attempts, listCards, left);
  const lastToday = state.log
    .filter((e) => e.cardId === card.id && e.mode === modeKey(current.mode))
    .pop();
  const deckRow = decks?.find((d) => d.id === card.deckId);
  const cardDeck = deckRow && {
    name: deckRow.name,
    language: deckRow.defaultLanguage ?? null,
    pronunciationDisplay: deckRow.pronunciationDisplay,
  };
  const forgotten = round === "forgotten" || leg.kind === "forgotten" || lastToday?.rating === 1;
  const showing = `${keyOf(current)}:${done}`;
  const hint: Hint | null =
    hints.get(card.id) ?? (card.hint ? { text: card.hint, source: card.hintSource ?? null } : null);
  const peeked = aidState.key === showing && aidState.peeked;
  const hintShown = !!hint && aidState.key === showing && (aidState.peeked || aidState.shown);
  const owned = deckRow?.role === "owner";
  const important = marks.get(card.id) ?? card.important;
  // A card often forgotten, or forgotten twice today, with no hint offers one in a deck the learner
  // owns. It waits for the card's deck, and once decided it holds, so a refetch never moves it mid-card.
  if (cardOffer.key !== showing && deckRow) {
    const forgotToday = state.log.filter(
      (e) => e.cardId === card.id && e.mode === modeKey(current.mode) && e.rating === 1,
    ).length;
    setCardOffer({
      key: showing,
      offer: (current.slipping || forgotToday >= 2) && !hint && owned,
      parked: false,
    });
  }
  const offer = cardOffer.key === showing && cardOffer.offer && !cardOffer.parked;
  const openHint = () => {
    setHintOpen(true);
    setCardOffer((held) => ({ ...held, parked: true }));
  };
  const markImportant = async (value: boolean) => {
    setMarks((m) => new Map(m).set(card.id, value));
    try {
      await writes.setImportant(card, value);
    } catch (e) {
      setMarks((m) => new Map(m).set(card.id, !value));
      Alert.alert(t`Couldn’t save that.`, e instanceof Error ? e.message : undefined);
    }
  };
  /** Takes the card out of this review at once; the line that says so offers it back. */
  const archive = async () => {
    const key = keyOf(current);
    setArchived((s) => new Set(s).add(card.id));
    if (leg.kind !== "draw") setListCards((c) => ({ ...c, dropped: withKey(c.dropped, key) }));
    setPinned(null);
    setRevealed(false);
    const held: Gone = { card, key, mode: modeKey(current.mode) };
    toast.add({
      id: ARCHIVED_TOAST,
      scope: REVIEW_TOASTS,
      title: t`Card archived`,
      action: { label: t`Undo`, onPress: () => void undoArchive(held) },
    });
    try {
      await writes.archiveCard(card.id);
    } catch (e) {
      toast.close(ARCHIVED_TOAST);
      bringBack(held);
      Alert.alert(
        t`Couldn’t archive “${isolate(card.term)}”.`,
        e instanceof Error ? e.message : undefined,
      );
    }
  };
  const openMenu = () => {
    if (performance.now() - revealedAt.current < REVEAL_TAP_GUARD_MS) return;
    setMenuOpen(true);
  };

  const onGrade = (rating: Rating) => {
    // Easy means recall without help, so after a peek it only says why, and grades nothing.
    if (!gradeAllowed(rating, peeked ? "hint" : undefined)) {
      haptics.warning();
      setLocked((l) => ({ key: showing, presses: l.key === showing ? l.presses + 1 : 1 }));
      return;
    }
    if (gradedAt.current === done) return;
    gradedAt.current = done;
    // Every grade is the same small tap: Forgot feeds the flame exactly as Easy does.
    haptics.grade();
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
      ...(peeked ? { aid: "hint" as const } : {}),
      ...recallTimes(),
      // Counted from the card as it shows, edits made during this review included.
      ...readingsFadedField(qc, edits.get(item.card.id) ?? item.card),
    };
    // The graded step shows under the next card from the frame it starts to slide in.
    swipe.arrive();
    const recorded = grade(record);
    if (listed) setListCards((c) => ({ ...c, graded: withKey(c.graded, key) }));
    setLastGraded({
      item,
      grade: record,
      listed,
      hint: hintShown ? hint : null,
      shown: step,
    });
    setReturned(false);
    setSending((n) => n + 1);
    setRevealed(false);
    setNow(new Date());
    setPinned(null);
    setDone((n) => n + 1);
    if (reviewsToday + 1 === goal) haptics.success();

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
              ? t`Couldn’t save your grade for “${{ term: isolate(term) }}”. The card is no longer in your decks.`
              : t`Couldn’t save your grade for “${{ term: isolate(term) }}”. You’ll see it again.`,
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

  const step: Step = {
    item,
    deck: cardDeck,
    forgotten,
    hint,
    hintShown,
    known,
    revealed,
    still: returned,
    onReveal: () => {
      haptics.reveal();
      revealedAt.current = performance.now();
      setRevealed(true);
    },
    onPeek: () => {
      haptics.tick();
      setAidState({ key: showing, peeked: true, shown: false });
    },
    onShowHint: () => setAidState({ key: showing, peeked: false, shown: true }),
    offer: offer && revealed,
    onOffer: openHint,
    onMenu: openMenu,
    easyLocked: peeked,
    lockedTip: locked.key === showing ? locked.presses : 0,
    onGrade,
    onUndo: lastGraded ? undo : undefined,
    pronounce,
    exampleSound,
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
                  {...lastGraded.shown}
                  still
                />
              )
            }
          >
            {(top) => <Turn top={top} {...step} />}
          </CardStack>
        </UndoArea>
      </View>
      {/* The card's menu, after the reveal: a tap on the card, never a primary action of review. */}
      <Sheet
        title={card.term}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onDismiss={() => {
          chosen.current?.();
          chosen.current = null;
        }}
      >
        <SheetGroup>
          {owned && (
            <SheetRow
              icon="hint"
              label={hint ? t`Edit hint` : t`Add hint`}
              onPress={() => {
                chosen.current = openHint;
                setMenuOpen(false);
              }}
            />
          )}
          {owned && (
            <SheetRow
              icon="edit"
              label={t`Edit card`}
              opens
              onPress={() => {
                chosen.current = () => {
                  holdCard(card);
                  router.push({
                    pathname: "/edit-card",
                    params: { card: card.id, deck: card.deckId },
                  });
                };
                setMenuOpen(false);
              }}
            />
          )}
          <SheetRow
            icon="important"
            label={important ? t`Unmark important` : t`Mark important`}
            onPress={() => {
              chosen.current = () => void markImportant(!important);
              setMenuOpen(false);
            }}
          />
        </SheetGroup>
        {deckRow && !owned && (
          <SheetGroup>
            <SheetRow
              icon="report"
              label={t`Report card`}
              opens
              onPress={() => {
                chosen.current = () => router.push(reportHref("card", card.id, card.term));
                setMenuOpen(false);
              }}
            />
          </SheetGroup>
        )}
        {owned && (
          <SheetGroup>
            <SheetRow
              icon="archive"
              label={t`Archive card`}
              destructive
              onPress={() => {
                chosen.current = () => void archive();
                setMenuOpen(false);
              }}
            />
          </SheetGroup>
        )}
      </Sheet>
      <HintSheet
        card={{ ...card, hint: hint?.text ?? null, hintSource: hint?.source ?? null }}
        open={hintOpen}
        onClose={() => setHintOpen(false)}
        onSaved={(saved) => {
          setHints((m) => new Map(m).set(card.id, saved));
          // A card corrected in Edit card earlier keeps this hint too, so both say the same.
          setEdits((m) => {
            const edited = m.get(card.id);
            return edited
              ? new Map(m).set(card.id, { ...edited, hint: saved.text, hintSource: saved.source })
              : m;
          });
          setHintOpen(false);
          // Written after the reveal, it shows at once where Show hint would have put it.
          if (revealed) setAidState({ key: showing, peeked, shown: true });
          void qc.invalidateQueries({ queryKey: ["queue"] });
          void qc.invalidateQueries({ queryKey: ["decks"] });
        }}
      />
      {pronounce?.sheet}
      {exampleSound?.sheet}
    </Cover>
  );
}

/** Cards kept on the phone draw in a moment, so the skeleton waits this long before it shows. */
const SKELETON_AFTER_MS = 400;

/** While the cards load: the card's place held, once loading is slow enough to notice. */
function ReviewSkeleton() {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SKELETON_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
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
        <Button label={action} size="lg" onPress={onAction} />
        <Button label={t`Try again`} variant="primary" size="lg" onPress={onRetry} />
      </View>
    </View>
  );
}

/** What one step of the stack draws, on top or left underneath once graded. */
interface Step {
  item: QueueItem;
  deck: CardDeck;
  forgotten: boolean;
  hint: Hint | null;
  /** The hint shows under the cue: peeked at before the reveal, or shown after it. */
  hintShown: boolean;
  /** The learner's Known pairs, whose readings fade in the example. */
  known: KnownReadings;
  revealed: boolean;
  /** Shown as it already stands, with nothing arriving: a card brought back, or one underneath. */
  still?: boolean;
  onReveal?: () => void;
  onPeek?: () => void;
  onShowHint?: () => void;
  /** The offer to write a hint, at the foot of the revealed card. */
  offer?: boolean;
  onOffer?: () => void;
  onMenu?: () => void;
  /** Peeked at the hint before the reveal, so Easy cannot be chosen. */
  easyLocked?: boolean;
  /** Presses of Easy after a peek on this card, each showing why it is locked. */
  lockedTip?: number;
  onGrade?: (r: Rating) => void;
  onUndo?: (() => void) | undefined;
  pronounce?: Pronunciation | null;
  exampleSound?: ExampleAudio | null;
}

/** A card and, once it is revealed, its grades under it: one step of the stack. */
function Turn({
  top,
  item,
  deck,
  forgotten,
  hint,
  hintShown,
  known,
  revealed,
  still = false,
  onReveal,
  onPeek,
  onShowHint,
  offer = false,
  onOffer,
  onMenu,
  easyLocked = false,
  lockedTip = 0,
  onGrade,
  onUndo,
  pronounce,
  exampleSound,
}: Step & {
  /** On the top step, how the card moves; the step underneath stays still. */
  top?: TopCard;
}) {
  const card = (
    <CardPlate
      pronounce={pronounce ?? null}
      exampleSound={exampleSound ?? null}
      item={item}
      deck={deck}
      forgotten={forgotten}
      hint={hint}
      hintShown={hintShown}
      known={known}
      revealed={revealed}
      still={still}
      onReveal={onReveal}
      onPeek={onPeek}
      onShowHint={onShowHint}
      offer={offer}
      onOffer={onOffer}
      onMenu={onMenu}
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
      {revealed && (
        <GradeStrip
          still={!top || still}
          next={item.next}
          easyLocked={easyLocked}
          lockedTip={lockedTip}
          onGrade={onGrade}
        />
      )}
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
      {/* The web's 44, pulled out so its glass lines up with the card's edge under it. */}
      <View style={{ marginStart: -11, marginEnd: -8 }}>
        <Lantern size={44} progress={progress} out={out} fed={fed} />
      </View>
      <View
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-plate-2"
        style={{ boxShadow: `inset 0 0 0 1px ${p.edge}` } as ViewStyle}
      >
        <Animated.View className="h-full rounded-full bg-text-2" style={fill} />
      </View>
      {/* Sized to its own figures, so the gap after the bar never holds digits not yet reached. */}
      <Text
        // The count shares a 48 pt bar with the lantern and the progress, so it grows least.
        maxFontSizeMultiplier={1.3}
        className="ms-1 text-base text-text-2"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {done}/{total}
      </Text>
      {/* Plain, because leaving is rare; its 44 pt target overlaps the gap so the glyph sits as far from the count as the count from the bar. phone.md "Review". */}
      <View style={{ marginStart: -16 }}>
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
  pronounce,
  exampleSound,
  item: { card, fsrsState, mode },
  deck,
  forgotten,
  hint,
  hintShown,
  known,
  revealed,
  still,
  onReveal,
  onPeek,
  onShowHint,
  offer,
  onOffer,
  onMenu,
  onUndo,
}: {
  pronounce: Pronunciation | null;
  /** The example's speaker, once revealed. */
  exampleSound: ExampleAudio | null;
  item: QueueItem;
  deck: CardDeck;
  forgotten: boolean;
  hint: Hint | null;
  hintShown: boolean;
  known: KnownReadings;
  revealed: boolean;
  still: boolean;
  onReveal: (() => void) | undefined;
  onPeek: (() => void) | undefined;
  onShowHint: (() => void) | undefined;
  offer: boolean;
  onOffer: (() => void) | undefined;
  /** Revealed, holding the card opens its menu. */
  onMenu: (() => void) | undefined;
  /** Offered to VoiceOver as an action on the card while there is a grade to take back. */
  onUndo: (() => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReduceMotion();
  const nudge = useRevealNudge(onReveal ? `${card.id}:${modeKey(mode)}` : null, revealed);
  const section = useSections(card.sectionId ? card.deckId : undefined).data?.sections.find(
    (s) => s.id === card.sectionId,
  )?.name;
  const picture = mode.cue === "image";
  const reveal = () => {
    countReveal();
    onReveal?.();
  };
  const noMeaning = t`No meaning yet`;
  const back = mode.target === "term" ? card.term : (card.meaning ?? noMeaning);
  const cue = mode.cue === "meaning" ? (card.meaning ?? card.term) : card.term;
  const reading = card.pronunciation;
  // Furigana, pinyin or stress marks on the term: on the cue until the card is Known or the learner hid them, and always on the answer.
  const furigana = useMemo(() => termShowsPronunciation(card), [card]);
  // The learner asked for the pronunciation as its own line under the term, so the term is drawn as written.
  const separate = furigana && deck?.pronunciationDisplay === "separate";
  const termCard = separate ? null : card;
  const cueFurigana = cueShowsPronunciation({
    revealed,
    known: stateKey(forgotten ? 3 : fsrsState) === "known",
    display: deck?.pronunciationDisplay,
  });
  const { width: screenWidth, fontScale } = useWindowDimensions();
  // The page's and the card's 20 pt sides, and the speaker beside a term.
  const cueLine = screenWidth - 80 - (pronounce && mode.cue === "term" ? 56 : 0);
  const languageCode =
    card.language && card.language.toLowerCase() !== deck?.language?.toLowerCase()
      ? card.language.toUpperCase()
      : null;
  const tail = [picture ? i18n._(modeLabel(mode)) : null, languageCode].filter(
    (part): part is string => !!part,
  );
  const translation = shownTranslation(card);
  // Where the card sits: its section, or the source it came from when it has none.
  const place = section
    ? { icon: "section" as const, name: section }
    : card.source
      ? { icon: "source" as const, name: card.source }
      : null;
  const canPeek = !revealed && !!hint && !hintShown && !!onPeek;
  const hold =
    revealed && onMenu
      ? () => {
          haptics.reveal();
          onMenu();
        }
      : undefined;
  const fit = useFitStep(revealed, GRADE_ROOM);
  const edges = useScrollEdges();
  const tip = useTipLayer();
  const offerShown = revealed && offer;
  const [offerRoom, setOfferRoom] = useState(0);
  const stackHeader = fontScale > 1.3;
  const target = mode.target === "term" ? "term" : "meaning";
  const room = {
    line: cueLine,
    longest: Math.max(...cue.split(/\s+/).map((word) => word.length)),
    fontScale,
  };
  const type = typeAt(fit.step, target, room);
  let line = 0;
  const arrive = () => (still ? undefined : reduce ? CROSSFADE : rise(line++));
  const glide = reduce || still ? undefined : LinearTransition.duration(GLIDE).easing(EASE);

  return (
    <Animated.View layout={glide} className="flex-1">
      <Pressable
        // Revealed, a tap does nothing and a hold opens the card's menu, so it never opens by accident.
        onPress={revealed ? undefined : reveal}
        // VoiceOver's double-tap would otherwise land on the card's centre, which can be the pronounce button.
        onAccessibilityTap={revealed || !onReveal ? undefined : reveal}
        onLongPress={
          revealed && onMenu
            ? () => {
                haptics.reveal();
                onMenu();
              }
            : undefined
        }
        delayLongPress={400}
        disabled={revealed ? !onMenu : !onReveal}
        accessibilityActions={[
          ...(canPeek ? [{ name: "peek", label: t`Peek at your hint` }] : []),
          ...(revealed && onMenu ? [{ name: "menu", label: t`Card options` }] : []),
          // The revealed card is one element to VoiceOver, so a tap on its example is offered as an action.
          ...(revealed && exampleSound ? [{ name: "example", label: t`Play example` }] : []),
          ...(onUndo ? [{ name: "undo", label: t`Take back the last grade` }] : []),
        ]}
        onAccessibilityAction={(e) => {
          const action = e.nativeEvent.actionName;
          if (action === "peek") onPeek?.();
          if (action === "menu") onMenu?.();
          if (action === "example") exampleSound?.play("action");
          if (action === "undo") onUndo?.();
        }}
        accessibilityRole={revealed ? undefined : "button"}
        accessibilityLabel={
          revealed
            ? undefined
            : picture
              ? t`Picture card: ${card.image?.description ?? ""}. Tap to reveal`
              : mode.cue === "term" && furigana && cueFurigana && reading
                ? t`Recognition card for ${cue}, read ${reading}. Tap to reveal`
                : mode.cue === "term"
                  ? t`Recognition card for ${cue}. Tap to reveal`
                  : t`Production card for ${cue}. Tap to reveal`
        }
        className="flex-1 overflow-hidden rounded-2xl border border-edge bg-plate"
        style={dark ? LIFT : undefined}
      >
        <TipProvider value={tip.tips}>
          {/* A long deck name shortens beside the state; at large text sizes the two stack rather than clip. */}
          <View
            className={`flex-row items-center justify-between gap-2 px-5 pt-4 ${stackHeader ? "flex-wrap" : ""}`}
          >
            <View className="min-w-0 shrink flex-row items-center gap-1.5">
              <Icon name="deck" size={14} colour={p.muted} />
              <Text className="shrink text-sm font-medium text-text-2" numberOfLines={1}>
                {[isolate(deck?.name), ...tail].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <StateChip state={forgotten ? 3 : fsrsState} inReview />
          </View>

          <View className="flex-1">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              className="flex-1"
              contentContainerClassName="grow px-5 pt-4"
              // The offer and Peek float over the card's foot, so the last line can scroll clear above them.
              contentContainerStyle={{
                paddingBottom:
                  16 + (offerShown ? offerRoom : 0) + (hint && !revealed ? PEEK_ROOM : 0),
              }}
              onLayout={(e) => {
                fit.onRoom(e);
                edges.onLayout(e);
              }}
              onContentSizeChange={edges.onContentSizeChange}
              onScroll={edges.onScroll}
              scrollEventThrottle={16}
              // Unrevealed, the whole plate is the button, so nothing scrolls under the finger.
              scrollEnabled={revealed}
              showsVerticalScrollIndicator={false}
            >
              {/* The hold lives inside the scroll: the card's own Pressable, as the responder, stops a native scroll. */}
              <Pressable
                onLongPress={hold}
                delayLongPress={400}
                disabled={!hold}
                accessible={false}
                className="grow justify-center"
              >
                <Animated.View layout={glide}>
                  {picture ? (
                    card.image ? (
                      <Picture card={card} />
                    ) : (
                      <Text className="text-md text-muted">{t`This card’s picture was removed.`}</Text>
                    )
                  ) : (
                    <CardLine
                      style={type.cue}
                      lang={mode.cue === "term" ? card.language : null}
                      term={mode.cue === "term" ? termCard : null}
                      hidden={!cueFurigana}
                      // The term can be heard as soon as it is the question.
                      after={
                        pronounce && mode.cue === "term" ? (
                          <PronounceButton pronounce={pronounce} />
                        ) : undefined
                      }
                    >
                      {cue}
                    </CardLine>
                  )}
                  {/* Its room is kept before the reveal, so a peeked hint under it never moves. */}
                  {(!furigana || separate) &&
                    mode.cue === "term" &&
                    card.pronunciation &&
                    (revealed ? (
                      <Animated.View entering={arrive()} className="pt-1">
                        <Text className="text-md text-muted" lang={card.language}>
                          {card.pronunciation}
                        </Text>
                      </Animated.View>
                    ) : (
                      <View
                        className="pt-1 opacity-0"
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        <Text className="text-md text-muted" lang={card.language}>
                          {card.pronunciation}
                        </Text>
                      </View>
                    ))}
                  {/* The hint has one place, under the cue; it takes room only as it shows, and the card glides open for it. */}
                  {hint && hintShown ? (
                    <View className="pt-3">
                      <HintLine text={hint.text} still={still} />
                    </View>
                  ) : hint && revealed && onShowHint ? (
                    <View className="pt-2">
                      <ShowHintButton still={still} onShow={onShowHint} />
                    </View>
                  ) : null}
                </Animated.View>
                {revealed && (
                  <Animated.View layout={glide} className="gap-5 pt-5">
                    <Wick still={still} />
                    <View className="gap-3">
                      <Animated.View entering={arrive()}>
                        {picture ? (
                          <View className="flex-row items-center gap-3">
                            <View className="shrink">
                              {mode.target === "term" ? (
                                separate ? (
                                  <Furigana
                                    segments={[{ text: card.term }]}
                                    className="text-2xl font-medium text-text"
                                  />
                                ) : (
                                  <TermText
                                    card={card}
                                    className="text-2xl font-medium text-text"
                                  />
                                )
                              ) : (
                                <Furigana
                                  segments={[{ text: back }]}
                                  className="text-2xl font-medium text-text"
                                  style={back === noMeaning ? { color: p.muted } : undefined}
                                />
                              )}
                            </View>
                            {pronounce && mode.target === "term" && (
                              <PronounceButton pronounce={pronounce} />
                            )}
                          </View>
                        ) : (
                          <CardLine
                            style={type.answer}
                            grows
                            lang={mode.target === "term" ? card.language : null}
                            term={mode.target === "term" ? termCard : null}
                            muted={back === noMeaning ? p.muted : undefined}
                            after={
                              pronounce && mode.target === "term" ? (
                                <PronounceButton pronounce={pronounce} />
                              ) : undefined
                            }
                          >
                            {back}
                          </CardLine>
                        )}
                      </Animated.View>
                      {picture && (
                        <Animated.View entering={arrive()} className="flex-row items-center gap-3">
                          <View className="shrink">
                            {mode.target === "term" ? (
                              <Furigana
                                segments={[{ text: card.meaning ?? "" }]}
                                className="text-lg text-text-2"
                              />
                            ) : separate ? (
                              <Furigana
                                segments={[{ text: card.term }]}
                                className="text-lg text-text-2"
                              />
                            ) : (
                              <TermText card={card} className="text-lg text-text-2" />
                            )}
                          </View>
                          {pronounce && mode.target !== "term" && (
                            <PronounceButton pronounce={pronounce} />
                          )}
                        </Animated.View>
                      )}
                      {/* After the reveal unless the term draws it, over it or in place, which
                    VoiceOver reads out. A term cue carries it under the cue instead. */}
                      {card.pronunciation && (!furigana || separate) && mode.cue !== "term" && (
                        <Animated.View entering={arrive()}>
                          <Text className="text-md text-muted" lang={card.language}>
                            {card.pronunciation}
                          </Text>
                        </Animated.View>
                      )}
                      {!picture && card.image && (
                        <Animated.View entering={arrive()} style={{ maxWidth: 220 }}>
                          <Picture card={card} maxHeight={120} />
                        </Animated.View>
                      )}
                      {card.example && (
                        <Animated.View entering={arrive()}>
                          <ExamplePress sound={exampleSound} onLongPress={hold}>
                            <ExampleText
                              text={card.example ?? ""}
                              known={known}
                              plain={separate}
                              className="text-md text-text-2"
                              lang={card.language}
                              translation={
                                translation
                                  ? { text: translation, className: "text-md text-muted" }
                                  : null
                              }
                              after={exampleSound && <ExampleAudioButton sound={exampleSound} />}
                            />
                          </ExamplePress>
                        </Animated.View>
                      )}
                      {card.notes && (
                        <Animated.View entering={arrive()}>
                          <CardNotes source={card.notes} className="text-base text-muted" />
                        </Animated.View>
                      )}
                      {place && (
                        <Animated.View
                          entering={arrive()}
                          className="mt-1 flex-row flex-wrap items-center gap-1.5"
                        >
                          <Chip size="sm" icon={place.icon}>
                            {place.name}
                          </Chip>
                        </Animated.View>
                      )}
                    </View>
                  </Animated.View>
                )}
              </Pressable>
            </ScrollView>
            <ScrollFade edge="top" height={24} shown={edges.more.above} />
          </View>

          {/* The cue and the target at each step, unseen, to choose the largest that fits. */}
          {!picture && (
            <View
              pointerEvents="none"
              className="absolute inset-x-0 top-0 opacity-0"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {FIT_STEPS.map((step) => {
                const at = typeAt(step, target, room);
                const speaker = pronounce ? <View style={{ width: 32, height: 16 }} /> : undefined;
                return (
                  <View
                    key={step}
                    onLayout={fit.onMeasured(step)}
                    className="absolute inset-x-5 top-0 py-4"
                  >
                    <CardLine
                      style={at.cue}
                      after={mode.cue === "term" ? speaker : undefined}
                      term={mode.cue === "term" ? termCard : null}
                    >
                      {cue}
                    </CardLine>
                    {hint && (
                      <View className="pt-3" style={{ minHeight: HINT_ROOM }}>
                        <HintLine text={hint.text} still />
                      </View>
                    )}
                    <View className="gap-5 pt-5">
                      <View className="h-px" />
                      <CardLine
                        style={at.answer}
                        grows
                        after={mode.target === "term" ? speaker : undefined}
                        term={mode.target === "term" ? termCard : null}
                      >
                        {back}
                      </CardLine>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!revealed && nudge && <RevealNudge lifted={canPeek} />}
          {canPeek && onPeek && <PeekButton onPeek={onPeek} />}
          {/* None under the offer, so its glass has text to blur. On the plate, since the scroll's box stops short of its foot. */}
          <ScrollFade edge="bottom" height={40} shown={edges.more.below && !offerShown} />
          {offerShown && onOffer && (
            <HintOffer
              still={still}
              onOpen={onOffer}
              onLayout={(e) => setOfferRoom(e.nativeEvent.layout.height)}
            />
          )}
        </TipProvider>
        {tip.layer}
      </Pressable>
    </Animated.View>
  );
}

const LOCK_TIP_MS = 4000;

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
/** What the grade strip takes from the card at the reveal: its 80 pt plates under a 12 pt gap. */
const GRADE_ROOM = 92;
/** The hint's place under the cue is never shorter than Show hint's 32 pt, which starts 4 pt above the hint's line. */
const HINT_ROOM = 28;

function GradeStrip({
  still = false,
  next,
  easyLocked,
  lockedTip,
  onGrade,
}: {
  /** Already in place: underneath, or on a card brought back. */
  still?: boolean;
  /** When each grade brings the card back, which VoiceOver reads with it, as on the web. */
  next: QueueItem["next"];
  /** After a peek, Easy stays in its slot, dimmed with a lock, and grades nothing. */
  easyLocked: boolean;
  /** Each press of the locked Easy says why in a tip over it. */
  lockedTip: number;
  onGrade: ((r: Rating) => void) | undefined;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const reduce = useReduceMotion();
  const why = t`You can’t choose Easy after peeking at your hint.`;
  const [tip, setTip] = useState(false);
  // Only a press made here is said; a strip drawn after one, as on a graded copy, stays quiet.
  const said = useRef(lockedTip);
  useEffect(() => {
    if (lockedTip === said.current) return;
    said.current = lockedTip;
    if (lockedTip === 0) return;
    setTip(true);
    AccessibilityInfo.announceForAccessibility(why);
    const timer = setTimeout(() => setTip(false), LOCK_TIP_MS);
    return () => clearTimeout(timer);
  }, [lockedTip, why]);
  return (
    <ToastFloor
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      className="flex-row gap-2 px-4 pt-3"
    >
      {tip && (
        <Animated.View
          entering={FadeIn.duration(150).reduceMotion(ALWAYS)}
          exiting={FadeOut.duration(100).reduceMotion(ALWAYS)}
          pointerEvents="none"
          className="absolute bottom-full end-4 mb-2 max-w-64 flex-row items-start gap-2 rounded-lg bg-text px-3 py-2"
        >
          <View className="pt-0.5">
            <Icon name="lock" size={14} colour={p.canvas} />
          </View>
          <Text className="shrink text-sm text-canvas">{why}</Text>
        </Animated.View>
      )}
      {GRADES.map((g, i) => {
        const label = i18n._(g.label);
        const back = next ? interval(new Date(), new Date(next[g.rating])) : null;
        const lock = easyLocked && g.rating === 4;
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
              accessibilityLabel={
                lock
                  ? t`${label}, locked`
                  : back
                    ? t`${label}, next in ${spokenInterval(back)}`
                    : label
              }
              accessibilityHint={lock ? why : undefined}
              accessibilityState={lock ? { disabled: true } : undefined}
              className="h-20 items-center justify-center gap-1.5 rounded-xl border border-edge bg-plate"
              style={dark ? LIFT : undefined}
            >
              <View className="items-center gap-1.5" style={lock ? { opacity: 0.45 } : undefined}>
                <Icon name={g.icon} size={20} colour={lock ? p.muted : p[g.tint]} />
                <Text maxFontSizeMultiplier={1.3} className="text-sm font-medium text-text-2">
                  {label}
                </Text>
              </View>
              {lock && (
                <View className="absolute end-2.5 top-2.5">
                  <Icon name="lock" size={12} colour={p.muted} />
                </View>
              )}
            </Press>
          </Animated.View>
        );
      })}
    </ToastFloor>
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
  const { goal, streak: dayStreak, lights, flame, out, progress, fed, summary } = useDay();
  const start = useStreakStart(summary?.longest ?? 0);
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  // The day just turned: a spark carries it from the flame to today's light and on to the run.
  const turned = screen.streak && !reduce;
  const counted = screen.heading !== "nothing_due";
  const heading = {
    goal_reached: t`Daily goal reached`,
    day_done: t`You’re done for today`,
    scope_done: scopeName
      ? t`Nothing left in ${{ scopeName: isolate(scopeName) }}`
      : t`Nothing left in this deck`,
    nothing_due: t`Nothing due`,
    round_done: t`Round done`,
    review_done: t`Review done`,
  }[screen.heading];

  const proceed = screen.offers.find((o) => o.kind === "continue");
  // Only Review forgotten sits above Continue, and Done is always last, so nothing moves between ends.
  const ways = screen.offers.filter((o) => o.kind === "forgotten");
  const note = proceed?.note;
  const holds = !note
    ? undefined
    : note.kind === "goal"
      ? t`${plural(note.count, { one: "# to goal", other: "# to goal" })}`
      : note.kind === "cards"
        ? t`${plural(note.count, { one: "# card left", other: "# cards left" })}`
        : t`other decks`;
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
    turned ? AT.tick + RUN_CATCH_MS : 0,
  );

  const clock = useSharedValue(reduce ? end : 0);
  // The ways on cannot be pressed until they have arrived, so the tap that finishes the sequence never presses one.
  const [settled, setSettled] = useState(reduce);
  // Until the spark reaches it, the run shows the streak as it stood before this review.
  const [ticked, setTicked] = useState(!turned);
  // The spark draws past the moment the ways on can be pressed, until its last fleck has gone.
  const [sparked, setSparked] = useState(!turned);
  const finish = () => {
    clock.value = end;
    setSettled(true);
    setTicked(true);
    setSparked(true);
    void stopHaptics();
  };
  const room = useAnimatedRef<View>();
  const lanternPlace = useAnimatedRef<View>();
  const todayLight = useAnimatedRef<View>();
  const runFlame = useAnimatedRef<View>();

  useEffect(() => {
    void playHaptics(endHaptics(embers, screen.streak, reduce));
    return () => void stopHaptics();
  }, [embers, screen.streak, reduce]);
  useEffect(() => {
    if (reduce) {
      clock.value = end;
      setSettled(true);
      setTicked(true);
      setSparked(true);
      return;
    }
    clock.value = withTiming(end, { duration: end, easing: Easing.linear, reduceMotion: ALWAYS });
    const timers = [
      setTimeout(() => setSettled(true), actionsAt + RISE.ms),
      setTimeout(() => setTicked(true), AT.tick),
      setTimeout(() => setSparked(true), AT.tick + SPARK_LIFE_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduce, clock, end, actionsAt]);

  const heading$ = useRise(clock, AT.heading);
  const count$ = useRise(clock, AT.count, COUNT_RISE);
  const label$ = useRise(clock, AT.count + 80);
  const lights$ = useRise(clock, AT.lights, { ms: 300, y: 0 });
  const run$ = useRise(clock, AT.run);
  const catch$ = useAnimatedStyle(() => {
    const u = clock.value - AT.tick;
    if (!turned || u <= 0) return { transform: [{ scale: 1 }] };
    return { transform: [{ scale: 1 + 0.3 * Math.exp(-u / 240) * Math.min(1, u / 90) }] };
  });
  const tick$ = useAnimatedStyle(() => {
    if (!turned) return { opacity: 1, transform: [] };
    const k = beat(clock.value, AT.tick, 460);
    return { opacity: k, transform: [{ translateY: (1 - k) * 12 }, { scale: 1 + 0.18 * (1 - k) }] };
  });
  const warm$ = useAnimatedStyle(() => ({
    opacity: turned ? Math.min(1, Math.max(0, 1 - (clock.value - AT.tick - 300) / 1100)) : 0,
  }));
  const streak = ticked ? dayStreak : dayStreak - 1;
  const way$ = [useRise(clock, AT.actions)];
  const done$ = useRise(clock, actionsAt);

  const done = <Button label={t`Done`} variant="primary" size="lg" onPress={onClose} />;

  return (
    <Animated.View
      ref={room}
      // Under reduced motion the whole screen crossfades in with its final numbers in place.
      entering={reduce ? CROSSFADE : undefined}
      onTouchStart={settled ? undefined : finish}
      style={StyleSheet.absoluteFill}
    >
      {/* It scrolls only when the reader's text size outgrows the screen; the light is never clipped at its edge. */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.unclipped}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Flight clock={clock} still={reduce} place={lanternPlace}>
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
              {/* A long deck name stops at three lines, so the count and Done stay in view. */}
              <Text
                className="text-center text-2xl font-medium text-text"
                accessibilityRole="header"
                numberOfLines={3}
              >
                {heading}
              </Text>
            </Animated.View>
            {counted ? (
              <View
                accessible
                accessibilityLabel={
                  screen.satisfied
                    ? t`${plural(to, { one: "# review today", other: "# reviews today" })}`
                    : t`${plural(goal, { one: `${to} of # review today`, other: `${to} of # reviews today` })}`
                }
                className="items-center"
              >
                <Animated.View style={count$}>
                  <RollingCount clock={clock} from={from} to={to} rollMs={rollMs} />
                </Animated.View>
                <Animated.View style={label$}>
                  <Text className="text-md text-muted">
                    {/* While the goal is open the count says it, so Continue's count explains itself. */}
                    {screen.satisfied
                      ? t`${plural(to, { one: "review today", other: "reviews today" })}`
                      : t`${plural(goal, { one: "of # review today", other: "of # reviews today" })}`}
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
                dates={lights.dates}
                days={lights.days}
                satisfied={lights.satisfied}
                rest={lights.rest}
                goals={lights.goals}
                goal={goal}
                sequence={settled ? undefined : AT.lights}
                turn={turned && !settled ? { at: AT.land, from } : undefined}
                todayRef={todayLight}
              />
            </Animated.View>
            <Animated.View style={run$} className="flex-row items-center gap-2">
              <Animated.View ref={runFlame} style={[styles.catch, catch$]}>
                <Flame height={20} state={ticked ? flame : "lit"} />
              </Animated.View>
              {streak > 0 ? (
                <>
                  {/* The new run rolls up warm, then cools to its ink. */}
                  <Animated.View key={streak} style={ticked ? tick$ : undefined}>
                    <Text className="text-md font-semibold text-text" style={styles.figures}>
                      {streak}
                    </Text>
                    {ticked && (
                      <Animated.View style={[StyleSheet.absoluteFill, warm$]}>
                        <Text
                          className="text-md font-semibold text-amber-text"
                          style={styles.figures}
                        >
                          {streak}
                        </Text>
                      </Animated.View>
                    )}
                  </Animated.View>
                  <Text className="text-md text-text-2">
                    {t`${plural(streak, { one: "day in a row", other: "days in a row" })}`}
                  </Text>
                </>
              ) : (
                <Text className="text-md font-medium text-text">{start}</Text>
              )}
            </Animated.View>
          </View>
        </View>
        {/* One shape for every way on, the count said in words; Done is always last and primary. */}
        <ToastFloor className="mt-6 gap-3 px-5" pointerEvents={settled ? "auto" : "none"}>
          {ways.map(
            (way, i) =>
              way.kind === "forgotten" && (
                <Animated.View key={way.kind} style={way$[i]}>
                  <Button
                    label={t`${plural(way.count, { one: "Review # forgotten card", other: "Review # forgotten cards" })}`}
                    lead={<Icon name="forgot" size={18} colour={p["grade-forgot"]} />}
                    size="lg"
                    onPress={() => onOffer(way)}
                  />
                </Animated.View>
              ),
          )}
          <Animated.View style={done$} className="gap-3">
            {!counted ? (
              <>
                <Button label={t`Add cards`} size="lg" onPress={onAddCards} />
                {done}
              </>
            ) : (
              <>
                {proceed && (
                  <Button
                    label={t`Continue`}
                    detail={holds}
                    size="lg"
                    onPress={() => onOffer(proceed)}
                  />
                )}
                {done}
              </>
            )}
          </Animated.View>
        </ToastFloor>
      </ScrollView>
      {turned && !sparked && (
        <TurnSpark
          clock={clock}
          room={room}
          lantern={lanternPlace}
          today={todayLight}
          run={runFlame}
        />
      )}
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
  place,
  children,
}: {
  clock: SharedValue<number>;
  still: boolean;
  /** Where it lands, which the spark also leaves from. */
  place: AnimatedRef<View>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The place it lands, read on the UI thread each frame, so a layout that settles late never misplaces the start.

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
/** How long the spark's flecks and the run's sparks outlast the run's tick; the web's `TurnSpark` stops then too. */
const SPARK_LIFE_MS = 1300;
/** How long the run's catch plays after the spark reaches it, warmth included. */
const RUN_CATCH_MS = 1400;

const styles = StyleSheet.create({
  unclipped: { overflow: "visible" },
  count: { fontSize: COUNT_SIZE, lineHeight: COUNT_SIZE * 1.2, fontVariant: ["tabular-nums"] },
  figures: { fontVariant: ["tabular-nums"] },
  catch: { transformOrigin: "50% 100%" },
});
