import { Trans, useLingui } from "@lingui/react/macro";
import { gradeStore, recordGrade, retireGrades } from "@lymi/client/grades";
import { readingsFadedField, useKnownReadings } from "@lymi/client/known-readings";
import { useRecallClock } from "@lymi/client/recall-clock";
import { drawState, reviewItem, stateBefore } from "@lymi/client/review-draw";
import {
  drawableLeft,
  forgottenRound,
  legFinish,
  type Offer,
  type RoundAsk,
  reviewEnd,
  roundWalk,
  streakAsOf,
  streakWith,
} from "@lymi/client/review-end";
import { writes } from "@lymi/client/writes";
import {
  CHOSEN_LIMIT,
  canPlayPronunciation,
  countedRating,
  type Drawn,
  drawKey,
  gradeAllowed,
  isolate,
  modeKey,
  pronunciationInputKey,
  type Rating,
  ROUNDS,
  type Round,
} from "@lymi/core";
import type { ReviewScopeKind } from "@lymi/core/analytics";
import { ReviewSessionTracker } from "@lymi/core/analytics-review-session";
import { lanternFor } from "@lymi/design";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "../components/button";
import { CardMenu } from "../components/card-menu";
import { CardPlace } from "../components/card-place";
import { EditCardSheet } from "../components/edit-card-sheet";
import { GRADES } from "../components/grade";
import { HintEditor } from "../components/hint-editor";
import { AID_KEY, aidSteps, aidTaken } from "../components/recall-aid";
import { ReportDialog } from "../components/report-dialog";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { api, type Card, deviceTimezone, errorMessage, type QueueItem, scopeKey } from "../lib/api";
import { usePrefetchPictures } from "../lib/card-images";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { useMouse, useWide } from "../lib/device";
import { useDocumentTitle } from "../lib/document-title";
import { lastInputWasKey } from "../lib/last-input";
import { playAlone } from "../lib/now-playing";
import {
  decksQuery,
  drawQuery,
  queueQuery,
  sectionsQuery,
  seriesQuery,
  streakQuery,
} from "../lib/queries";
import { recordReveal, useRevealNudge } from "../lib/reveal-nudge";
import { stepReviewLeg } from "../lib/review-leg";
import { itemKey } from "../lib/review-modes";
import { shortQuote } from "../lib/short-quote";
import { captureAnalytics } from "../lib/telemetry";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { useWordHistory } from "../lib/use-word-history";
import {
  GradeBar,
  REVEAL_TAP_GUARD_MS,
  ReviewCard,
  ReviewComplete,
  ReviewError,
  ReviewHeader,
  ReviewSkeleton,
} from "../views/review-view";
import { WordView } from "../views/word-view";

export const Route = createFileRoute("/review")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    deck?: string;
    series?: string;
    section?: string;
    round?: Round;
    cards?: string[];
    card?: string;
  } => {
    const round = ROUNDS.find((r) => r === s.round);
    // Trimmed rather than dropped, so a long list never widens into the whole deck's review.
    const cards =
      Array.isArray(s.cards) && s.cards.length > 0 && s.cards.every((id) => typeof id === "string")
        ? (s.cards as string[]).slice(0, CHOSEN_LIMIT)
        : undefined;
    return {
      ...(typeof s.deck === "string" ? { deck: s.deck } : {}),
      // A section belongs to its deck, whose sections name it.
      ...(typeof s.section === "string" && typeof s.deck === "string"
        ? { section: s.section }
        : {}),
      // One scope at a time: a deck wins over a series.
      ...(typeof s.series === "string" && typeof s.deck !== "string" ? { series: s.series } : {}),
      ...(round ? { round } : {}),
      // Cards chosen on a deck page, reviewed as a list of their own.
      ...(cards && typeof s.deck === "string" && !round && typeof s.section !== "string"
        ? { cards }
        : {}),
      // The card open as a place, so the phone's back gesture closes it, as on the deck page.
      ...(typeof s.card === "string" ? { card: s.card } : {}),
    };
  },
  component: ReviewPage,
});

/** The grade strip, where focus goes when a sheet over the card closes. */
const GRADES_ID = "review-grades";
const gradesFocus = () => {
  // The group itself, not its first grade, so Space and 1 to 4 still reach the review's shortcuts.
  const grades = document.getElementById(GRADES_ID);
  if (!grades) return true;
  requestAnimationFrame(() => grades.focus({ preventScroll: true }));
  return false;
};

/** Pictures of this many cards after the current one are fetched ahead. */
const LOOKAHEAD = 3;
const NO_GRADES: never[] = [];
/** Local grades a fetch can fall behind by before the draw data is refreshed. */
const REFRESH_AFTER = 20;

type Pinned = { cardId: string; mode: string };

/**
 * A stretch of one day's review, ADR 0021: the draw, which stops at `until` when it began below the
 * goal, or a fixed list, which is a round from Today or the forgotten cards chosen at an end.
 */
type Leg = { date: string; from: number } & (
  | { kind: "draw"; until: number | null }
  | { kind: "today"; size: number }
  | { kind: "forgotten"; items: Drawn[] }
);

/** Where the last end screen left the day, or where it stood when the page opened. */
type Mark = { attempts: number; satisfied: boolean };

const gradedKey = (item: Pick<QueueItem, "card" | "mode">) =>
  drawKey(item.card.id, modeKey(item.mode));

/** A list leg's cards by key: graded, sent to the end by a refused grade, or out because the card is gone. */
type LegCards = {
  graded: ReadonlySet<string>;
  returned: ReadonlySet<string>;
  dropped: ReadonlySet<string>;
};
const NO_LEG_CARDS: LegCards = { graded: new Set(), returned: new Set(), dropped: new Set() };

const withKey = (keys: ReadonlySet<string>, key: string) => new Set(keys).add(key);
const withoutKey = (keys: ReadonlySet<string>, key: string) => {
  const next = new Set(keys);
  next.delete(key);
  return next;
};

/** What is left of a list leg, with the cards a refused grade sent back at the end. */
function leftInLeg<T>(items: readonly T[], cards: LegCards, key: (item: T) => string): T[] {
  const left = items.filter(
    (item) => !cards.graded.has(key(item)) && !cards.dropped.has(key(item)),
  );
  return [
    ...left.filter((item) => !cards.returned.has(key(item))),
    ...left.filter((item) => cards.returned.has(key(item))),
  ];
}

/** A review of another deck or series starts over, so nothing from this one carries into it. */
function ReviewPage() {
  const { deck, series, section, cards } = Route.useSearch();
  const key = scopeKey({ deck, series, section }) + (cards ? cards.join(",") : "");
  return <Review key={key} />;
}

function Review() {
  const { t } = useLingui();
  useDocumentTitle(t`Review`);
  const { deck, series, section, round, cards, card: placeCardId } = Route.useSearch();
  const scope = useMemo(() => ({ deck, series, section }), [deck, series, section]);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const add = useAddCard();
  const reduce = useReduceMotion();
  // The draw also feeds the header's count, so it loads in a round too.
  const draw = useQuery(drawQuery(scope));
  // A round from Today, or cards chosen on a deck page, is a fixed list rather than a draw, walked in order.
  const listed = !!round || !!cards;
  const listScope: ReviewScopeKind = cards ? "chosen" : "round";
  const roundQueue = useQuery({ ...queueQuery(scope, round, cards), enabled: listed });
  const decks = useQuery(decksQuery);
  const seriesList = useQuery({ ...seriesQuery, enabled: !!series });
  const streak = useQuery(streakQuery);
  const grades = useSyncExternalStore(gradeStore.subscribe, gradeStore.snapshot, () => NO_GRADES);
  // The card on screen stays put while a refetch lands; only a grade moves it.
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [chosenLeg, setLeg] = useState<Leg | null>(null);
  const [mark, setMark] = useState<Mark | null>(null);
  // Left by X: the stretch waits behind the end screen, and Continue picks it up again.
  const [paused, setPaused] = useState(false);
  const [legCards, setLegCards] = useState<LegCards>(NO_LEG_CARDS);
  // Grades this page has recorded that the server has not answered yet.
  const [sending, setSending] = useState(0);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  // Tied to the queue item, so a failure never carries onto the next card's button.
  const [audioError, setAudioError] = useState<{ item: string; message: string } | null>(null);
  const playingAudio = useRef<HTMLAudioElement | null>(null);
  const loadedAudio = useRef<{ source: string; audio: HTMLAudioElement } | null>(null);
  const [animateNextCard, setAnimateNextCard] = useState(true);
  const [animateReveal, setAnimateReveal] = useState(true);
  // Where focus goes when the button holding it unmounts: the grades after a reveal, the next card after a grade.
  const [focusGrades, setFocusGrades] = useState(false);
  const [focusReveal, setFocusReveal] = useState(false);
  // Whether the card on screen offers a hint, decided as it arrives and held until its grade.
  const [cardOffer, setCardOffer] = useState({ key: "", offer: false, parked: false });
  // How far into the card's aids the learner went before the reveal, and whether they asked to see
  // them after it, held for the card on screen.
  const [aidState, setAidState] = useState({ key: "", taken: 0, shown: false, animate: true });
  // Presses of a locked grade's key, counted per card so an earlier card's never show its tip.
  const [lockedNudge, setLockedNudge] = useState({ key: "", presses: 0 });
  // The card whose hint is being written, so the editor never outlives its card.
  const [hintFor, setHintFor] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Cards archived from review, gone from it at once rather than when the draw is fetched again.
  const [archived, setArchived] = useState<ReadonlySet<string>>(() => new Set());
  // Marks set in this review, shown at once rather than when the draw is fetched again.
  const [marks, setMarks] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const [editing, setEditing] = useState<Card | null>(null);
  // A mouse gets a visible ⋯, beside the card where there is room and in its head where there is not.
  const mouse = useMouse();
  const wide = useWide();

  // The persisted cache can predate the last grade, so the first card waits for this mount's fetch.
  const settled = draw.isFetchedAfterMount || draw.fetchStatus !== "fetching";
  const data = useMemo(() => {
    const fetched = settled ? draw.data : undefined;
    if (!fetched || archived.size === 0) return fetched;
    return { ...fetched, cards: fetched.cards.filter((c) => !archived.has(c.card.id)) };
  }, [settled, draw.data, archived]);
  const state = useMemo(
    () => (data ? drawState(data, grades, now, deck, LOOKAHEAD) : undefined),
    [data, grades, now, deck],
  );
  const pinnedItem = data && state && pinned ? reviewItem(data, state.log, pinned) : null;
  // Past midnight, yesterday's data does not know yesterday's grades moved the schedule, so a new card waits for today's.
  const staleDay = !!data && !!state && data.day.date !== state.day.date && draw.isFetching;
  const drawn =
    pinnedItem ??
    (data && state?.next && !staleDay ? reviewItem(data, state.log, state.next) : null);

  // A leg belongs to its day, so one left open past midnight gives way to a fresh one.
  const leg = chosenLeg && state && chosenLeg.date === state.day.date ? chosenLeg : null;
  // Like the draw, the round's list and the day's streak wait for this mount's fetch, so a leg is sized and judged from now.
  const roundData =
    roundQueue.isFetchedAfterMount || roundQueue.fetchStatus !== "fetching"
      ? roundQueue.data
      : undefined;
  const roundItems = roundData?.items;
  const streakSettled = streak.isFetchedAfterMount || streak.fetchStatus !== "fetching";
  const today = streak.data?.today;
  const scoped = !!deck || !!series;
  // The first leg is Today's round or the draw, which stops at the goal only for the whole day below it.
  useEffect(() => {
    if (leg || !data || !state || !streakSettled || (listed && !roundData)) return;
    const { attempts } = state;
    setMark({
      attempts,
      satisfied:
        attempts >= data.goal ||
        (today?.date === state.day.date &&
          (today.outcome === "goal_met" || today.outcome === "exhausted")),
    });
    setLegCards(NO_LEG_CARDS);
    setPaused(false);
    const base = { date: state.day.date, from: attempts };
    // The queue serves a round a page at a time, so the leg is sized by the round's total, not the first page.
    if (listed && roundData) setLeg({ ...base, kind: "today", size: roundData.total });
    else
      setLeg({ ...base, kind: "draw", until: !scoped && attempts < data.goal ? data.goal : null });
  }, [listed, roundData, leg, data, state, streakSettled, today, scoped]);

  const drawLeg = leg?.kind === "draw" ? leg : null;
  const until = drawLeg?.until ?? null;
  // A goal lowered on another device meanwhile stops the stretch there instead.
  const atStop =
    until !== null && !!data && !!state && state.attempts >= Math.min(until, data.goal);
  const listLeft: QueueItem[] =
    leg?.kind === "today"
      ? leftInLeg(roundItems ?? [], legCards, gradedKey)
      : leg?.kind === "forgotten" && data && state
        ? leftInLeg(leg.items, legCards, (d) => drawKey(d.cardId, d.mode)).flatMap(
            (d) => reviewItem(data, state.log, d) ?? [],
          )
        : [];
  const current: QueueItem | null =
    !leg || paused ? null : drawLeg ? (atStop ? null : drawn) : (listLeft[0] ?? null);
  const currentItemKey = current ? itemKey(current) : undefined;
  const scopeSections = useQuery({ ...sectionsQuery(deck ?? ""), enabled: !!section });
  const scopeSection = section
    ? scopeSections.data?.sections.find((s) => s.id === section)
    : undefined;
  const scopeName = section
    ? scopeSection?.name
    : deck
      ? decks.data?.find((d) => d.id === deck)?.name
      : series
        ? seriesList.data?.find((s) => s.id === series)?.name
        : undefined;
  const currentDeck = current ? decks.data?.find((d) => d.id === current.card.deckId) : undefined;
  // The draw carries the section's id alone; its name comes from the deck's own list, cached per deck.
  const sectionId = current?.card.sectionId ?? null;
  const sections = useQuery({
    ...sectionsQuery(current?.card.deckId ?? ""),
    enabled: !!sectionId,
  });
  const sectionName = sectionId
    ? sections.data?.sections.find((s) => s.id === sectionId)?.name
    : undefined;
  const nudge = useRevealNudge(
    current ? `${current.stateId}-${done}` : undefined,
    revealed,
    streak.data?.reviewedDays,
  );
  usePrefetchPictures(drawLeg ? (state?.upcoming ?? []) : listLeft, 0);

  // Cards the draw still holds, the number Today shows; a forgotten card owed a return stays in it.
  const left = useMemo(
    () => (data && state ? drawableLeft(data, state, deck) : 0),
    [data, state, deck],
  );
  // What the header counts: today's attempts to the goal's stop, and a stretch's own otherwise.
  const legDone = !leg || !state ? 0 : drawLeg ? state.attempts - leg.from : legCards.graded.size;
  const legSize = !leg
    ? 0
    : leg.kind === "today"
      ? leg.size - legCards.dropped.size
      : leg.kind === "forgotten"
        ? leg.items.length - legCards.dropped.size
        : legDone + left;
  // The refetch asked for once this leg's page in hand ran out; a new leg forgets it.
  const [ask, setAsk] = useState<(RoundAsk & { leg: Leg }) | null>(null);
  // The queue serves a round a page at a time, so an emptied page asks for the round again, and the
  // end waits while it loads. The round is walked once every card in it is graded or dropped, or
  // when that fetch lands with nothing left for it. Offline or failed, the end shows unwalked.
  const roundState =
    leg?.kind === "today"
      ? roundWalk({
          size: leg.size,
          done: legCards.graded.size + legCards.dropped.size,
          left: current ? 1 : listLeft.length,
          ask: ask?.leg === leg ? ask : null,
          fetch: {
            updatedAt: roundQueue.dataUpdatedAt,
            idle: roundQueue.fetchStatus === "idle",
            failed: roundQueue.isError || roundQueue.fetchStatus === "paused",
          },
        })
      : null;
  // A forgotten round holds every card from the start, so it is walked once none is left to show.
  const walked = roundState
    ? roundState.walked
    : leg?.kind === "forgotten" && !current && listLeft.length === 0;
  const roundOwed = !!roundState?.owed && !current;
  const askRound = !!roundState?.refetch && !current;
  useEffect(() => {
    if (!askRound || !leg) return;
    setAsk({
      leg,
      at: roundQueue.dataUpdatedAt,
      done: legCards.graded.size + legCards.dropped.size,
    });
    void roundQueue.refetch();
  }, [askRound, leg, roundQueue.dataUpdatedAt, legCards, roundQueue.refetch]);

  // A pinned card a refetch no longer holds, such as one archived meanwhile, gives way.
  const repin = !!state?.next && !staleDay && (!pinned || !pinnedItem);
  useEffect(() => {
    if (repin && state?.next) setPinned({ cardId: state.next.cardId, mode: state.next.mode });
  }, [repin, state?.next]);

  // Sent grades from an earlier day are no longer in any draw.
  const fetchedDayStart = draw.data?.day.start;
  useEffect(() => {
    if (fetchedDayStart) retireGrades(fetchedDayStart);
  }, [fetchedDayStart]);

  // A new local day resets the order and the count; returning to the page catches a timer that slept.
  const dayEnd = state?.day.end.getTime();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(new Date());
      if (dayEnd !== undefined && Date.now() >= dayEnd) {
        void qc.invalidateQueries({ queryKey: ["queue"] });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [dayEnd, qc]);
  useEffect(() => {
    if (dayEnd === undefined) return;
    const wait = Math.min(Math.max(dayEnd - Date.now(), 0) + 50, 2_147_483_647);
    const timer = window.setTimeout(() => {
      setNow(new Date());
      void qc.invalidateQueries({ queryKey: ["queue"] });
    }, wait);
    return () => window.clearTimeout(timer);
  }, [dayEnd, qc]);

  // An empty draw is confirmed by a fetch begun after the last change, or taken as is offline.
  const lastChange = Math.max(0, ...grades.map((g) => new Date(g.reviewedAt).getTime()));
  const exhausted = !!data && !state?.next;
  const unreachable = draw.fetchStatus === "paused" || draw.isError;
  // Confirmed stays confirmed through a background refetch, so the end never blinks out and replays.
  const confirmed = !!data && data.fetchedAt >= lastChange;
  const stopped =
    !!leg && !!data && !!state && !current && (paused || !drawLeg || atStop || exhausted);
  const ending = paused ? "left" : atStop ? "goal" : "empty";
  const forgottenItems = useMemo(
    () => (stopped && data && state ? forgottenRound(data, state, deck) : []),
    [stopped, data, state, deck],
  );
  // An empty draw waits for a fetch begun after the last grade, so the heading never changes once shown.
  const checking =
    stopped &&
    !paused &&
    (left === 0 || (!!drawLeg && !atStop)) &&
    !confirmed &&
    !(unreachable && !draw.isFetching);
  useEffect(() => {
    if (checking && !unreachable && !draw.isFetching) void draw.refetch();
  }, [checking, unreachable, draw.isFetching, draw.refetch]);
  // The end waits for the last grades to land, so a refusal never takes back an end already shown.
  const landing = sending > 0 && !unreachable;
  // A scoped end names its deck or series and weighs the decks outside it, so it waits for them.
  // The persisted list can predate this visit, so it waits for this mount's fetch like the draw.
  const decksLoading =
    (scoped && !decks.isFetchedAfterMount && decks.fetchStatus === "fetching") ||
    (!!series && !seriesList.data && seriesList.fetchStatus === "fetching") ||
    (!!section && !scopeSections.isFetchedAfterMount && scopeSections.fetchStatus === "fetching");
  const result = useMemo(
    () =>
      stopped && !checking && !landing && !roundOwed && !decksLoading && mark && data && state
        ? reviewEnd({
            stretch: !drawLeg ? "list" : scoped ? "scope" : "day",
            ending,
            goal: data.goal,
            from: mark.attempts,
            attempts: state.attempts,
            satisfiedBefore: mark.satisfied,
            left,
            confirmed,
            elsewhere: !scoped
              ? 0
              : decks.data && (!section || scopeSection)
                ? decks.data
                    .filter((d) => (series ? d.seriesId !== series : d.id !== deck))
                    .reduce((n, d) => n + d.due, 0) +
                  // The rest of a section's deck is its other sections.
                  (section && scopeSection
                    ? Math.max(
                        0,
                        (decks.data.find((d) => d.id === deck)?.due ?? 0) - scopeSection.due,
                      )
                    : 0)
                : null,
            forgotten: forgottenItems.length,
          })
        : null,
    [
      stopped,
      checking,
      landing,
      roundOwed,
      decksLoading,
      mark,
      drawLeg,
      ending,
      data,
      state,
      left,
      confirmed,
      scoped,
      series,
      deck,
      section,
      scopeSection,
      forgottenItems,
      decks.data,
    ],
  );
  // Running out offline, or after a failed refresh, proves nothing about the day unless the goal is met.
  const unconfirmed = result === "unchecked";
  const end = result === "unchecked" ? null : result;
  const sessionTracker = useRef<ReviewSessionTracker | null>(null);
  if (!sessionTracker.current)
    sessionTracker.current = new ReviewSessionTracker(
      (event) => {
        if (event.name === "review_session_finished") captureAnalytics(event.name, event);
        if (event.name === "review_session_abandoned") captureAnalytics(event.name, event);
      },
      () => crypto.randomUUID(),
    );
  const sessionFirst = useRef<boolean | null>(null);
  useEffect(() => {
    if (sessionFirst.current === null && streakSettled && streak.data)
      sessionFirst.current = streak.data.reviewedDays === 0 && streak.data.today.attempts === 0;
    const tracker = sessionTracker.current;
    if (!tracker || !leg || sessionFirst.current === null) return;
    const key = `${leg.date}:${leg.kind}:${leg.from}`;
    const scope: ReviewScopeKind =
      leg.kind === "forgotten"
        ? "round"
        : leg.kind === "today"
          ? listScope
          : section
            ? "section"
            : deck
              ? "deck"
              : series
                ? "series"
                : "day";
    stepReviewLeg(tracker, {
      key,
      snapshot: { cardsDone: legDone, cardCount: legSize, first: sessionFirst.current, scope },
      presentedCount:
        drawLeg && leg.kind === "draw" && leg.until !== null
          ? Math.min(legSize, leg.until - leg.from)
          : legSize,
      presenting: !!current && !paused,
      stopped,
      paused,
      finished: legFinish(
        result,
        ending,
        drawLeg ? { stretch: "day", confirmed } : { stretch: "list", walked },
      ),
    });
  }, [
    leg,
    current,
    paused,
    stopped,
    result,
    ending,
    confirmed,
    walked,
    legDone,
    legSize,
    drawLeg,
    streakSettled,
    streak.data,
    listScope,
    section,
    deck,
    series,
  ]);
  const sessionMount = useRef(0);
  useEffect(() => {
    const mount = ++sessionMount.current;
    const leaving = () => sessionTracker.current?.abandon("pagehide");
    window.addEventListener("pagehide", leaving);
    return () => {
      window.removeEventListener("pagehide", leaving);
      queueMicrotask(() => {
        if (sessionMount.current === mount) sessionTracker.current?.abandon("navigation");
      });
    };
  }, []);
  const failed = listed ? roundQueue.isError && !roundQueue.data : draw.isError && !draw.data;

  const counts = !!end?.satisfied;
  const attempts = state?.attempts;
  // Today as this screen's grades leave it, so the header's flame lights with the grade, not the refetch.
  const streakNow = useMemo(
    () =>
      streak.data && attempts !== undefined
        ? streakWith(streak.data, attempts, counts)
        : streak.data,
    [streak.data, attempts, counts],
  );
  // The week as the last end screen left it, which the streak refetch after each grade has already moved on.
  const markFrom = mark?.attempts;
  const markSatisfied = !!mark?.satisfied;
  const before = useMemo(
    () => ({
      week:
        streak.data && markFrom !== undefined
          ? streakAsOf(streak.data, markFrom, markSatisfied)
          : streak.data,
      lantern: lanternFor(streak.data),
    }),
    [streak.data, markFrom, markSatisfied],
  );
  const [held, setHeld] = useState(before);
  const frozen = stopped || (exhausted && !!held.week);
  useEffect(() => {
    if (!frozen) setHeld(before);
  }, [frozen, before]);

  /** Past this end screen: the next one reports what changes from here. */
  const moveOn = (attempts: number) => {
    // The pressed button fades out for a moment, and while it holds focus Space would not reach the card.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const satisfied = !!mark?.satisfied || !!end?.satisfied;
    setMark({ attempts, satisfied });
    setHeld({
      week: streak.data && streakAsOf(streak.data, attempts, satisfied),
      lantern: lanternFor(streak.data),
    });
    setPaused(false);
    setPinned(null);
    setRevealed(false);
    setAnimateNextCard(true);
    setAnimateReveal(true);
  };

  const onOffer = (offer: Offer) => {
    if (!data || !state) return;
    if (offer.kind === "continue" && offer.to === "resume") {
      moveOn(state.attempts);
      return;
    }
    // The day's draw is a review without a scope, which starts over from where the day stands.
    if (offer.kind === "continue" && scoped) {
      void navigate({ to: "/review" });
      return;
    }
    const base = { date: state.day.date, from: state.attempts };
    moveOn(state.attempts);
    setLegCards(NO_LEG_CARDS);
    if (offer.kind === "forgotten") setLeg({ ...base, kind: "forgotten", items: forgottenItems });
    else setLeg({ ...base, kind: "draw", until: state.attempts < data.goal ? data.goal : null });
    // The round is over, so a reload continues the day rather than walking it again.
    if (listed) {
      void navigate({
        to: "/review",
        search: {
          ...(deck ? { deck } : {}),
          ...(series ? { series } : {}),
          ...(section ? { section } : {}),
        },
        replace: true,
      });
    }
  };

  const stopAudio = useCallback(() => {
    playingAudio.current?.pause();
    playingAudio.current = null;
    setAudioState("idle");
  }, []);

  const watchAudio = useCallback(
    (audio: HTMLAudioElement) => {
      // The example's clip pauses this one when it starts, which ends it the same way.
      for (const done of ["ended", "pause"]) {
        audio.addEventListener(done, () => {
          if (playingAudio.current === audio) stopAudio();
        });
      }
      return audio;
    },
    [stopAudio],
  );

  // A clip voiced before is loaded with the card, so a tap plays it at once; a missing one is never voiced ahead.
  const preloadCard = current?.card;
  const currentCardId = preloadCard?.id;
  const currentAudioInput = preloadCard ? pronunciationInputKey(preloadCard) : null;
  const preloadSource =
    preloadCard?.audioKey && canPlayPronunciation(preloadCard)
      ? pronunciationInputKey(preloadCard)
      : null;
  useEffect(() => {
    setAudioError(null);
    if (!currentAudioInput) stopAudio();
    let live = true;
    if (preloadSource && currentCardId) {
      const audio = watchAudio(new Audio());
      audio.preload = "auto";
      audio.addEventListener(
        "canplaythrough",
        () => {
          if (live && !loadedAudio.current) loadedAudio.current = { source: preloadSource, audio };
        },
        { once: true },
      );
      audio.src = api.storedAudioUrl(currentCardId, preloadCard?.updatedAt);
    }
    return () => {
      live = false;
      stopAudio();
      loadedAudio.current = null;
    };
  }, [
    currentCardId,
    currentAudioInput,
    preloadSource,
    preloadCard?.updatedAt,
    stopAudio,
    watchAudio,
  ]);

  const playAudio = useCallback(async () => {
    if (!current || !canPlayPronunciation(current.card) || audioState === "loading") return;
    stopAudio();
    setAudioError(null);
    // The response is no-store, so a replay rewinds the element that already holds it, until an edit changes what it says.
    const source = pronunciationInputKey(current.card);
    const loaded = loadedAudio.current?.source === source ? loadedAudio.current.audio : null;
    const pressed = performance.now();
    const timing = () => ({
      preloaded: !!loaded,
      wait_ms: Math.min(60_000, Math.round(performance.now() - pressed)),
    });
    const audio =
      loaded ?? watchAudio(new Audio(api.audioUrl(current.card.id, current.card.updatedAt)));
    if (loaded) audio.currentTime = 0;
    else setAudioState("loading");
    playingAudio.current = audio;
    try {
      await playAlone(audio);
      if (playingAudio.current === audio) {
        loadedAudio.current = { source, audio };
        setAudioState("playing");
        captureAnalytics("pronunciation_played", { outcome: "played", revealed, ...timing() });
      }
    } catch {
      if (loadedAudio.current?.audio === audio) loadedAudio.current = null;
      if (playingAudio.current === audio) {
        playingAudio.current = null;
        setAudioState("idle");
        setAudioError({
          item: itemKey(current),
          message: t`Couldn’t play the pronunciation. Try again in a moment.`,
        });
        captureAnalytics("pronunciation_played", { outcome: "failed", revealed, ...timing() });
      }
    }
  }, [audioState, current, revealed, stopAudio, t, watchAudio]);

  const invalidateReviewData = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["rounds"] });
    qc.invalidateQueries({ queryKey: ["streak"] });
    qc.invalidateQueries({ queryKey: ["insights"] });
  }, [qc]);

  const showing = current ? `${itemKey(current)}-${done}` : "";
  const recallTimes = useRecallClock(showing || null, revealed);
  const knownReadings = useKnownReadings();
  const writingHint = !!showing && hintFor === showing;
  const revealedAt = useRef(0);
  useEffect(() => {
    if (revealed) revealedAt.current = performance.now();
  }, [revealed]);
  // Only the card on screen opens as a place; a link to another one is left closed.
  const placeOpen = !!current && placeCardId === current.card.id;
  const placeTitleId = useId();
  const placeHistory = useWordHistory(placeOpen ? placeCardId : null);
  const openPlace = () => {
    if (current) void navigate({ to: ".", search: (prev) => ({ ...prev, card: current.card.id }) });
  };
  const closePlace = () =>
    void navigate({ to: ".", search: ({ card: _closed, ...rest }) => rest, replace: true });
  // A card that leaves without a grade, such as one archived from its menu, takes its reveal with it.
  const [revealedFor, setRevealedFor] = useState(showing);
  if (revealedFor !== showing) {
    setRevealedFor(showing);
    if (revealed) setRevealed(false);
  }
  const hint = current?.card.hint ?? null;
  const steps = useMemo(() => aidSteps({ hint }), [hint]);
  const taken = aidState.key === showing ? aidState.taken : 0;
  const shownAfter = aidState.key === showing && aidState.shown;
  // Only a step taken before the reveal is help with recall; seeing the hint after it is not.
  const aid = aidTaken(steps, taken);
  // This mode's grades earlier today: on a second try Easy counts as Good, ADR 0031.
  const gradedToday = useMemo(() => {
    if (!current || !state) return [];
    const key = modeKey(current.mode);
    return state.log.filter((e) => e.cardId === current.card.id && e.mode === key);
  }, [current, state]);
  const repeat = gradedToday.length > 0;
  const takeAid = useCallback(
    (input: "keyboard" | "pointer") => {
      if (revealed || taken >= steps.length) return;
      setAidState({ key: showing, taken: taken + 1, shown: false, animate: input !== "keyboard" });
    },
    [revealed, taken, steps.length, showing],
  );
  const showAid = useCallback(
    (input: "keyboard" | "pointer", focused = false) => {
      if (!revealed || taken > 0 || shownAfter || steps.length === 0) return;
      setAidState({ key: showing, taken, shown: true, animate: input !== "keyboard" });
      // The button holding focus goes, so focus moves on to what comes next: the grades.
      if (focused) gradesFocus();
    },
    [revealed, taken, shownAfter, steps.length, showing],
  );

  const onGrade = useCallback(
    (rating: Rating, input: "keyboard" | "pointer" = "pointer") => {
      if (!revealed || !current || !data || !state) return;
      // Easy means recall without help, so after a peek its key only says why, and grades nothing.
      if (!gradeAllowed(rating, aid)) {
        setLockedNudge((n) => ({
          key: showing,
          presses: n.key === showing ? n.presses + 1 : 1,
        }));
        return;
      }
      const item = current;
      const runningShort = state.upcoming.length <= LOOKAHEAD;
      const recorded = recordGrade({
        cardId: item.card.id,
        mode: item.mode,
        rating: countedRating(rating, repeat),
        reviewedAt: new Date().toISOString(),
        stateBefore: repeat
          ? stateBefore(data, state.log, item.card.id, item.mode)
          : item.fsrsState,
        timezone: deviceTimezone(),
        ...(aid ? { aid } : {}),
        ...recallTimes(),
        ...readingsFadedField(qc, item.card),
      });
      // Grading from the strip or the speaker keeps focus on the next card, so keyboard and screen
      // reader users don't drop to the page body.
      setFocusReveal(!!document.activeElement?.closest("[data-grade-strip], [data-audio]"));
      const listed = !!leg && !drawLeg;
      if (listed) setLegCards((c) => ({ ...c, graded: withKey(c.graded, gradedKey(item)) }));
      setSending((n) => n + 1);
      setAnimateNextCard(input !== "keyboard");
      setRevealed(false);
      setNow(new Date());
      setPinned(null);
      setDone((n) => n + 1);

      void recorded
        .then((outcome) => {
          invalidateReviewData();
          if (outcome === "queued") return;
          if (outcome === "refused" || outcome === "gone") {
            const key = gradedKey(item);
            const term = shortQuote(item.card.term);
            if (listed) {
              setLegCards((c) => ({
                graded: withoutKey(c.graded, key),
                returned: outcome === "refused" ? withKey(c.returned, key) : c.returned,
                dropped: outcome === "gone" ? withKey(c.dropped, key) : c.dropped,
              }));
            }
            toast.add({
              type: "error",
              title:
                outcome === "gone"
                  ? t`Couldn’t save your grade for “${{ term: isolate(term) }}”. The card is no longer in your decks.`
                  : t`Couldn’t save your grade for “${{ term: isolate(term) }}”. You’ll see it again.`,
            });
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
    },
    [
      revealed,
      current,
      data,
      state,
      aid,
      repeat,
      showing,
      recallTimes,
      leg,
      drawLeg,
      invalidateReviewData,
      qc,
      t,
    ],
  );

  // Leaving mid-stretch ends on the success screen, unless nothing was added since the last one.
  const leave = useCallback(() => {
    if (current && mark && attempts !== undefined && attempts > mark.attempts) setPaused(true);
    else void navigate({ to: "/today" });
  }, [current, mark, attempts, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A sheet over the review handles its own keys, Escape included.
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (add.open || writingHint || menuOpen || editing || placeOpen) return;
      if (e.key === "Escape") {
        leave();
        return;
      }
      const target = e.target as HTMLElement | null;
      const control = target?.closest(
        "button, a, input, textarea, select, [contenteditable='true']",
      );
      // The aid's key also reaches the card's reveal button, where grading from the strip leaves
      // focus, and the aid's own buttons; matched by its place, so every keyboard layout has it.
      if (current && e.code === AID_KEY.code) {
        if (control && !control.matches("[data-reveal], [data-aid]")) return;
        e.preventDefault();
        const onAid = control?.matches("[data-aid]") ?? false;
        if (revealed) showAid("keyboard", onAid);
        else {
          takeAid("keyboard");
          // The spent pill turns inert, so focus moves on to the card, as a press on the pill does.
          if (onAid)
            document.querySelector<HTMLElement>("[data-reveal]")?.focus({ preventScroll: true });
        }
        return;
      }
      const g = GRADES.find((x) => x.key === e.key);
      // A click leaves focus on the speaker, which keeps Space and Enter to replay and lets the
      // grade keys through.
      if (control && !(g && control.matches("[data-audio]"))) return;
      if (!current) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!revealed) {
          recordReveal();
          setAnimateReveal(false);
          setFocusGrades(false);
          setRevealed(true);
        } else onGrade(3, "keyboard");
      }
      if (g) {
        e.preventDefault();
        onGrade(g.rating, "keyboard");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    revealed,
    onGrade,
    takeAid,
    showAid,
    leave,
    add.open,
    writingHint,
    menuOpen,
    editing,
    placeOpen,
    current,
  ]);

  // A card often forgotten, or forgotten twice today, with no hint offers one, in a deck the learner
  // owns, since only the owner changes its cards. It waits for the card's deck, which a deck list
  // cached before the deck existed lacks, and once decided it holds, so a refetch never moves it mid-card.
  if (cardOffer.key !== showing && (!current || currentDeck)) {
    const stuck = !!current?.slipping || gradedToday.filter((e) => e.rating === 1).length >= 2;
    setCardOffer({
      key: showing,
      offer: stuck && !current?.card.hint && currentDeck?.role === "owner",
      parked: false,
    });
  }
  const offer = cardOffer.key === showing && cardOffer.offer;
  const owned = currentDeck?.role === "owner";
  const [reporting, setReporting] = useState(false);
  // Writing a hint parks the offer, and the panel fades, so it never stands beside the editor.
  // Where focus goes as the menu closes: the grades, unless the chosen row opened something that
  // takes focus itself, such as the hint editor, the card editor or the card's place.
  const menuHandsFocus = useRef(false);
  const menuFinalFocus = () => {
    if (menuHandsFocus.current) {
      menuHandsFocus.current = false;
      return false;
    }
    return gradesFocus();
  };
  const openHint = () => {
    setHintFor(showing);
    setCardOffer((held) => ({ ...held, parked: true }));
  };
  const closeHint = () => {
    setHintFor(null);
    gradesFocus();
  };

  // Out of review at once, and out of a round's count, offline too; the write queues like a grade.
  const setArchivedLocally = (cardId: string, gone: boolean) => {
    const keys =
      leg?.kind === "today"
        ? (roundItems ?? []).filter((item) => item.card.id === cardId).map(gradedKey)
        : leg?.kind === "forgotten"
          ? leg.items.filter((d) => d.cardId === cardId).map((d) => drawKey(d.cardId, d.mode))
          : [];
    setArchived((ids) => (gone ? withKey(ids, cardId) : withoutKey(ids, cardId)));
    setLegCards((c) => ({
      ...c,
      dropped: keys.reduce(
        (set, key) => (gone ? withKey(set, key) : withoutKey(set, key)),
        c.dropped,
      ),
    }));
  };

  const importantOf = (card: Card) => marks.get(card.id) ?? card.important;
  const markImportant = async (card: Card, important: boolean) => {
    setMarks((m) => new Map(m).set(card.id, important));
    try {
      await writes.setImportant(card, important);
      qc.invalidateQueries({ queryKey: ["cards", card.id, "history"] });
    } catch (e) {
      setMarks((m) => new Map(m).set(card.id, !important));
      toast.add({ type: "error", title: errorMessage(e) });
    }
  };

  const archiveCurrent = async () => {
    if (!current) return;
    const card = current.card;
    const archivedTerm = shortQuote(card.term);
    setArchivedLocally(card.id, true);
    try {
      await writes.archiveCard(card.id);
    } catch (e) {
      setArchivedLocally(card.id, false);
      toast.add({ type: "error", title: errorMessage(e) });
      return;
    }
    toast.add({
      id: `archived-${card.id}`,
      title: t`Archived “${{ archivedTerm: isolate(archivedTerm) }}”`,
      actionProps: {
        children: t`Undo`,
        onClick: async () => {
          toast.close(`archived-${card.id}`);
          try {
            await writes.restoreCard(card.id);
            setArchivedLocally(card.id, false);
          } catch (e) {
            toast.add({ type: "error", title: errorMessage(e) });
          }
          await refreshAfterCardWrite(qc, card.id);
        },
      },
    });
    void refreshAfterCardWrite(qc, card.id);
  };

  // On touch the revealed card is the menu's handle: a tap opens it. A tap this soon after the
  // reveal is the reveal's own tap doubled, not a second one.
  const openFromCard = (e: React.MouseEvent<HTMLElement>) => {
    if (mouse || !revealed || writingHint) return;
    // A tap in a portal, such as the drawer's own backdrop, still bubbles here through React.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (performance.now() - revealedAt.current < REVEAL_TAP_GUARD_MS) return;
    const target = e.target as HTMLElement;
    if (target.closest(`button, a, input, textarea, [role="menu"], #${GRADES_ID}`)) return;
    // A press that selected text was a selection, not a tap.
    if (window.getSelection()?.toString()) return;
    setMenuOpen(true);
  };

  const cardMenu = current && (
    <CardMenu
      open={menuOpen}
      onOpenChange={setMenuOpen}
      visible={mouse}
      hasHint={!!current.card.hint}
      important={importantOf(current.card)}
      onImportantChange={(important) => void markImportant(current.card, important)}
      canEdit={owned}
      finalFocus={menuFinalFocus}
      onHint={() => {
        menuHandsFocus.current = true;
        openHint();
      }}
      onEdit={() => {
        menuHandsFocus.current = true;
        setEditing(current.card);
      }}
      onView={() => {
        menuHandsFocus.current = true;
        openPlace();
      }}
      onArchive={() => void archiveCurrent()}
      onReport={currentDeck && !owned ? () => setReporting(true) : undefined}
    />
  );

  const doneLink = (variant: "primary" | "secondary") => (
    <Button variant={variant} size="lg" className="w-full" render={<Link to="/today" />}>
      <Trans>Done</Trans>
    </Button>
  );

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-x-clip px-4 @3xl:overflow-x-visible pb-[calc(env(safe-area-inset-bottom)+12px)] @3xl:max-w-2xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
      <ReviewHeader
        attempts={state?.attempts ?? 0}
        goal={
          until !== null && data
            ? Math.min(data.goal, (state?.attempts ?? 0) + left)
            : (data?.goal ?? 0)
        }
        animateCount={animateNextCard}
        round={leg && until === null ? { done: legDone, size: legSize } : undefined}
        streak={streakNow}
        complete={!!end}
        loading={!data && !failed}
        onClose={leave}
      />

      {/* While the end waits for the last grade to land, the room stays empty rather than drawing a card. */}
      {!current && !end && !stopped && !unconfirmed && !failed && <ReviewSkeleton />}

      {failed && (
        <ReviewError
          retry={() => (listed ? roundQueue.refetch() : draw.refetch())}
          action={
            <Button variant="ghost" render={<Link to="/today" />}>
              <Trans>Back</Trans>
            </Button>
          }
        />
      )}

      {unconfirmed && !failed && (
        <ReviewError
          title={<Trans>Couldn’t check for more cards</Trans>}
          body={<Trans>Your grades are saved. Check your connection and try again.</Trans>}
          retry={() => draw.refetch()}
          action={
            <Button variant="ghost" render={<Link to="/today" />}>
              <Trans>Done</Trans>
            </Button>
          }
        />
      )}

      {/* The card steps back as the end arrives, popped out of the flow so the two overlap. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {end && data && state && (
          <motion.div
            key="end"
            className="flex min-h-0 flex-1 flex-col"
            exit={{ opacity: 0, transition: { duration: 0.14 } }}
          >
            <ReviewComplete
              end={end}
              attempts={state.attempts}
              from={mark?.attempts}
              scopeName={scopeName}
              streak={streakNow}
              streakBefore={held.week}
              lanternFrom={held.lantern.out ? "out" : (held.lantern.progress ?? "brand")}
              focusOnMount
              onOffer={onOffer}
              done={doneLink}
              addCards={
                <Button size="lg" className="w-full" onClick={() => add.openCard(deck)}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  <Trans>Add cards</Trans>
                </Button>
              }
            />
          </motion.div>
        )}
        {current && (
          <motion.div
            key="cards"
            className="relative flex min-h-0 flex-1 flex-col"
            onClick={openFromCard}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : {
                    opacity: 0,
                    y: 8,
                    scale: 0.98,
                    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                  }
            }
          >
            <ReviewCard
              key={`${itemKey(current)}-${done}`}
              item={current}
              deck={
                currentDeck && {
                  name: currentDeck.name,
                  language: currentDeck.defaultLanguage ?? null,
                  frontPronunciation: currentDeck.frontPronunciation,
                }
              }
              section={sectionName}
              knownReadings={knownReadings}
              revealed={revealed}
              animateReveal={animateReveal}
              animateIn={animateNextCard}
              nudge={nudge}
              focusOnMount={focusReveal}
              onReveal={() => {
                recordReveal();
                setAnimateReveal(true);
                setFocusGrades(document.activeElement instanceof HTMLButtonElement);
                setRevealed(true);
              }}
              onPlayAudio={canPlayPronunciation(current.card) ? playAudio : undefined}
              audioState={audioState}
              audioError={
                audioError && audioError.item === currentItemKey ? audioError.message : null
              }
              offer={
                offer
                  ? {
                      // Once the answer has settled: its lines take about half a second to land.
                      delay: animateReveal ? (reduce ? 0.7 : 0.95) : 0.5,
                      animate: animateReveal,
                      parked: cardOffer.parked,
                      onOpen: openHint,
                    }
                  : undefined
              }
              aid={
                steps.length > 0 && !writingHint
                  ? {
                      steps,
                      taken,
                      shown: shownAfter,
                      animate: aidState.key === showing ? aidState.animate : true,
                      onTake: takeAid,
                      onShow: showAid,
                    }
                  : undefined
              }
              headSlot={mouse && !wide}
              headEnd={
                mouse && !wide && revealed ? (
                  <span className="enter-fade">{cardMenu}</span>
                ) : undefined
              }
              hintEditor={
                writingHint ? (
                  <HintEditor
                    card={current.card}
                    onCancel={closeHint}
                    onSaved={() => {
                      closeHint();
                      // Written after the reveal, it shows at once where Show hint would have put it.
                      setAidState({
                        key: showing,
                        taken,
                        shown: true,
                        animate: !lastInputWasKey(),
                      });
                    }}
                  />
                ) : undefined
              }
              className="mt-4 @3xl:max-h-[600px] @3xl:[@media(min-height:40rem)]:min-h-[460px]"
            />
            {/* Only once the answer shows. With a mouse and room, beside the card, so nothing on it
                moves; on touch the card is the handle and this button is for a screen reader. */}
            {revealed && !(mouse && !wide) && (
              <span
                className={mouse ? "absolute -end-10 top-7 enter-fade" : "absolute top-0 start-0"}
              >
                {cardMenu}
              </span>
            )}
            <GradeBar
              id={GRADES_ID}
              revealed={revealed}
              animateIn={animateReveal}
              animateOut={animateNextCard}
              focusOnReveal={focusGrades}
              next={current.next}
              aid={aid}
              lockedNudge={lockedNudge.key === showing ? lockedNudge.presses : 0}
              onGrade={(rating) => onGrade(rating, "pointer")}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {current && currentDeck && (
        <CardPlace open={placeOpen} onClose={closePlace} titleId={placeTitleId}>
          <WordView
            key={current.card.id}
            card={{ ...current.card, important: importantOf(current.card) }}
            onImportantChange={(important) => void markImportant(current.card, important)}
            state={placeHistory?.states[0] ?? null}
            deckName={currentDeck.name}
            modes={current.card.reviewModes ?? currentDeck.reviewModes}
            knownReadings={knownReadings}
            history={placeHistory}
            titleId={placeTitleId}
            onPlayAudio={canPlayPronunciation(current.card) ? playAudio : undefined}
            onClose={closePlace}
            onReport={
              !owned
                ? () => {
                    closePlace();
                    setReporting(true);
                  }
                : undefined
            }
            owner={
              owned
                ? {
                    onEdit: () => setEditing(current.card),
                    enrichFields: currentDeck.enrichFields,
                    onEnrich: () =>
                      void api
                        .enrichCard(current.card.id)
                        .then(() => refreshAfterCardWrite(qc, current.card.id))
                        .catch((e: unknown) =>
                          toast.add({ type: "error", title: errorMessage(e) }),
                        ),
                    onArchive: () => {
                      closePlace();
                      void archiveCurrent();
                    },
                  }
                : undefined
            }
          />
        </CardPlace>
      )}
      {current && currentDeck && !owned && (
        <ReportDialog
          open={reporting}
          onOpenChange={setReporting}
          target={{ kind: "card", cardId: current.card.id }}
          name={current.card.term}
        />
      )}
      <EditCardSheet
        card={editing}
        decks={decks.data}
        onOpenChange={(open) => !open && setEditing(null)}
        onReopen={(card) => setEditing(card)}
        finalFocus={gradesFocus}
      />
    </div>
  );
}
