import { Trans, useLingui } from "@lingui/react/macro";
import {
  canSpeakTerm,
  type Drawn,
  drawKey,
  modeKey,
  type Rating,
  ROUNDS,
  type Round,
} from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonClass } from "../components/button";
import { GRADES } from "../components/grade";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { api, deviceTimezone, type QueueItem, scopeKey } from "../lib/api";
import { usePrefetchPictures } from "../lib/card-images";
import { useDocumentTitle } from "../lib/document-title";
import { lanternFor } from "../lib/flame";
import { gradeStore, recordGrade, retireGrades } from "../lib/grades";
import {
  decksQuery,
  drawQuery,
  queueQuery,
  sectionsQuery,
  seriesQuery,
  streakQuery,
} from "../lib/queries";
import { recordReveal, useRevealHint } from "../lib/reveal-hint";
import {
  drawableLeft,
  forgottenRound,
  type Offer,
  reviewEnd,
  streakAsOf,
  streakWith,
} from "../lib/review-complete";
import { drawState, reviewItem, stateBefore } from "../lib/review-draw";
import { itemKey } from "../lib/review-modes";
import { shortQuote } from "../lib/short-quote";
import {
  GradeBar,
  ReviewCard,
  ReviewComplete,
  ReviewError,
  ReviewHeader,
  ReviewSkeleton,
} from "../views/review-view";

export const Route = createFileRoute("/review")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { deck?: string; series?: string; section?: string; round?: Round } => {
    const round = ROUNDS.find((r) => r === s.round);
    return {
      ...(typeof s.deck === "string" ? { deck: s.deck } : {}),
      // A section belongs to its deck, whose sections name it.
      ...(typeof s.section === "string" && typeof s.deck === "string"
        ? { section: s.section }
        : {}),
      // One scope at a time: a deck wins over a series.
      ...(typeof s.series === "string" && typeof s.deck !== "string" ? { series: s.series } : {}),
      ...(round ? { round } : {}),
    };
  },
  component: ReviewPage,
});

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
  const { deck, series, section } = Route.useSearch();
  return <Review key={scopeKey({ deck, series, section })} />;
}

function Review() {
  const { t } = useLingui();
  useDocumentTitle(t`Review`);
  const { deck, series, section, round } = Route.useSearch();
  const scope = useMemo(() => ({ deck, series, section }), [deck, series, section]);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const add = useAddCard();
  const reduce = useReducedMotion();
  // The draw also feeds the header's count, so it loads in a round too.
  const draw = useQuery(drawQuery(scope));
  // A round from Today is a fixed list rather than a draw, walked in order.
  const roundQueue = useQuery({ ...queueQuery(scope, round), enabled: !!round });
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
  const [animateNextCard, setAnimateNextCard] = useState(true);
  const [animateReveal, setAnimateReveal] = useState(true);

  // The persisted cache can predate the last grade, so the first card waits for this mount's fetch.
  const settled = draw.isFetchedAfterMount || draw.fetchStatus !== "fetching";
  const data = settled ? draw.data : undefined;
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
  const roundItems =
    roundQueue.isFetchedAfterMount || roundQueue.fetchStatus !== "fetching"
      ? roundQueue.data?.items
      : undefined;
  const streakSettled = streak.isFetchedAfterMount || streak.fetchStatus !== "fetching";
  const today = streak.data?.today;
  const scoped = !!deck || !!series;
  // The first leg is Today's round or the draw, which stops at the goal only for the whole day below it.
  useEffect(() => {
    if (leg || !data || !state || !streakSettled || (round && !roundItems)) return;
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
    if (round && roundItems) setLeg({ ...base, kind: "today", size: roundItems.length });
    else
      setLeg({ ...base, kind: "draw", until: !scoped && attempts < data.goal ? data.goal : null });
  }, [round, roundItems, leg, data, state, streakSettled, today, scoped]);

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
  const currentCardId = current?.card.id;
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
  const hint = useRevealHint(current ? `${current.stateId}-${done}` : undefined, revealed);
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
      stopped && !checking && !landing && !decksLoading && mark && data && state
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
  const failed = round ? roundQueue.isError && !roundQueue.data : draw.isError && !draw.data;

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
    // Today's round is over, so a reload continues the day rather than walking it again.
    if (round) {
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

  useEffect(() => {
    setAudioError(null);
    if (!currentCardId) stopAudio();
    return stopAudio;
  }, [currentCardId, stopAudio]);

  const playAudio = useCallback(async () => {
    if (!current?.card.language || audioState === "loading") return;
    stopAudio();
    setAudioError(null);
    setAudioState("loading");
    const audio = new Audio(api.audioUrl(current.card.id));
    playingAudio.current = audio;
    audio.addEventListener("ended", () => {
      if (playingAudio.current === audio) stopAudio();
    });
    try {
      await audio.play();
      if (playingAudio.current === audio) setAudioState("playing");
    } catch {
      if (playingAudio.current === audio) {
        playingAudio.current = null;
        setAudioState("idle");
        setAudioError({
          item: itemKey(current),
          message: t`Couldn’t play the pronunciation. Try again in a moment.`,
        });
      }
    }
  }, [audioState, current, stopAudio, t]);

  const invalidateReviewData = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["rounds"] });
    qc.invalidateQueries({ queryKey: ["streak"] });
    qc.invalidateQueries({ queryKey: ["insights"] });
  }, [qc]);

  const onGrade = useCallback(
    (rating: Rating, input: "keyboard" | "pointer" = "pointer") => {
      if (!revealed || !current || !data || !state) return;
      const item = current;
      const key = modeKey(item.mode);
      const repeat = state.log.some((e) => e.cardId === item.card.id && e.mode === key);
      const runningShort = state.upcoming.length <= LOOKAHEAD;
      const recorded = recordGrade({
        cardId: item.card.id,
        mode: item.mode,
        rating,
        reviewedAt: new Date().toISOString(),
        stateBefore: repeat
          ? stateBefore(data, state.log, item.card.id, item.mode)
          : item.fsrsState,
        timezone: deviceTimezone(),
      });
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
                  ? t`Couldn’t save your grade for “${term}”. The card is no longer in your decks.`
                  : t`Couldn’t save your grade for “${term}”. You’ll see it again.`,
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
    [revealed, current, data, state, leg, drawLeg, invalidateReviewData, qc, t],
  );

  // Leaving mid-stretch ends on the success screen, unless nothing was added since the last one.
  const leave = useCallback(() => {
    if (current && mark && attempts !== undefined && attempts > mark.attempts) setPaused(true);
    else void navigate({ to: "/today" });
  }, [current, mark, attempts, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A sheet over the review handles its own keys, Escape included.
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || add.open) return;
      if (e.key === "Escape") {
        leave();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
      if (!current) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!revealed) {
          recordReveal();
          setAnimateReveal(false);
          setRevealed(true);
        } else onGrade(3, "keyboard");
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (g) {
        e.preventDefault();
        onGrade(g.rating, "keyboard");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onGrade, leave, add.open, current]);

  const doneLink = (variant: "primary" | "secondary") => (
    <Link to="/today" className={buttonClass(variant, "lg", "w-full")}>
      <Trans>Done</Trans>
    </Link>
  );

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-x-clip px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] @3xl:max-w-2xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
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
        onClose={leave}
      />

      {!current && !end && !unconfirmed && !failed && <ReviewSkeleton />}

      {failed && (
        <ReviewError
          retry={() => (round ? roundQueue.refetch() : draw.refetch())}
          action={
            <Link to="/today" className={buttonClass("ghost")}>
              <Trans>Back</Trans>
            </Link>
          }
        />
      )}

      {unconfirmed && !failed && (
        <ReviewError
          title={<Trans>Couldn’t check for more cards</Trans>}
          body={<Trans>Your grades are saved. Check your connection and try again.</Trans>}
          retry={() => draw.refetch()}
          action={
            <Link to="/today" className={buttonClass("ghost")}>
              <Trans>Done</Trans>
            </Link>
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
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => add.openCard(deck)}
                >
                  <Plus aria-hidden="true" />
                  <Trans>Add cards</Trans>
                </Button>
              }
            />
          </motion.div>
        )}
        {current && (
          <motion.div
            key="cards"
            className="flex min-h-0 flex-1 flex-col"
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
                }
              }
              section={sectionName}
              revealed={revealed}
              animateReveal={animateReveal}
              animateIn={animateNextCard}
              hint={hint}
              onReveal={() => {
                recordReveal();
                setAnimateReveal(true);
                setRevealed(true);
              }}
              onPlayAudio={canSpeakTerm(current.card) ? playAudio : undefined}
              audioState={audioState}
              audioError={
                audioError && audioError.item === currentItemKey ? audioError.message : null
              }
              className="mt-4 @3xl:max-h-[600px] @3xl:[@media(min-height:40rem)]:min-h-[460px]"
            />
            <GradeBar
              revealed={revealed}
              animateIn={animateReveal}
              animateOut={animateNextCard}
              next={current.next}
              onGrade={(rating) => onGrade(rating, "pointer")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
