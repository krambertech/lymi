import { Trans, useLingui } from "@lingui/react/macro";
import { type Drawn, drawKey, modeKey, type Rating, ROUNDS, type Round } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonClass } from "../components/button";
import { GRADES } from "../components/grade";
import { toast } from "../components/ui/toast";
import { useAddCard } from "../lib/add-card";
import { api, deviceTimezone, type QueueItem } from "../lib/api";
import { usePrefetchPictures } from "../lib/card-images";
import { useDocumentTitle } from "../lib/document-title";
import { lanternFor } from "../lib/flame";
import { gradeStore, recordGrade, retireGrades } from "../lib/grades";
import { decksQuery, drawQuery, queueQuery, streakQuery } from "../lib/queries";
import { recordReveal, useRevealHint } from "../lib/reveal-hint";
import {
  drawableUpTo,
  EXTRA_ROUND,
  forgottenRound,
  type Offer,
  reviewEnd,
  streakWith,
} from "../lib/review-complete";
import { drawState, reviewItem, stateBefore } from "../lib/review-draw";
import { itemKey } from "../lib/review-modes";
import {
  GradeBar,
  ReviewCard,
  ReviewComplete,
  ReviewError,
  ReviewHeader,
  ReviewSkeleton,
} from "../views/review-view";

export const Route = createFileRoute("/review")({
  validateSearch: (s: Record<string, unknown>): { deck?: string; round?: Round } => {
    const round = ROUNDS.find((r) => r === s.round);
    return {
      ...(typeof s.deck === "string" ? { deck: s.deck } : {}),
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
 * A stretch of one day's review: the draw to the goal, the draw for another round, or a fixed list,
 * which is a round from Today or the forgotten cards chosen at an end.
 */
type Leg = { date: string; from: number; satisfied: boolean } & (
  | { kind: "goal" | "more"; until: number }
  | { kind: "today"; size: number }
  | { kind: "forgotten"; items: Drawn[] }
);

const gradedKey = (item: Pick<QueueItem, "card" | "mode">) =>
  drawKey(item.card.id, modeKey(item.mode));

/** A review of another deck starts over, so nothing from this one carries into it. */
function ReviewPage() {
  const { deck } = Route.useSearch();
  return <Review key={deck ?? "all"} />;
}

function Review() {
  const { t } = useLingui();
  useDocumentTitle(t`Review`);
  const { deck, round } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const add = useAddCard();
  const reduce = useReducedMotion();
  // The draw also feeds the header's count, so it loads in a round too.
  const draw = useQuery(drawQuery(deck));
  // A round from Today is a fixed list rather than a draw, walked in order.
  const roundQueue = useQuery({ ...queueQuery(deck, round), enabled: !!round });
  const decks = useQuery(decksQuery);
  const streak = useQuery(streakQuery);
  const grades = useSyncExternalStore(gradeStore.subscribe, gradeStore.snapshot, () => NO_GRADES);
  // The card on screen stays put while a refetch lands; only a grade moves it.
  const [pinned, setPinned] = useState<Pinned | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [chosenLeg, setLeg] = useState<Leg | null>(null);
  const [legGraded, setLegGraded] = useState<ReadonlySet<string>>(() => new Set());
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
  // The first leg is Today's round, or the draw to the goal, or one more round once the goal is met.
  useEffect(() => {
    if (leg || !data || !state || !streakSettled || (round && !roundItems)) return;
    const { attempts } = state;
    const base = {
      date: state.day.date,
      from: attempts,
      satisfied:
        attempts >= data.goal ||
        (today?.date === state.day.date &&
          (today.outcome === "goal_met" || today.outcome === "exhausted")),
    };
    setLegGraded(new Set());
    if (round && roundItems) setLeg({ ...base, kind: "today", size: roundItems.length });
    else if (attempts < data.goal) setLeg({ ...base, kind: "goal", until: data.goal });
    else {
      // Sized by what is left, like the end's offer; an empty draw still stops on its own.
      const size = drawableUpTo(data, state, deck, EXTRA_ROUND) || EXTRA_ROUND;
      setLeg({ ...base, kind: "more", until: attempts + size });
    }
  }, [round, roundItems, leg, data, state, streakSettled, today, deck]);

  const drawLeg = leg?.kind === "goal" || leg?.kind === "more" ? leg : null;
  const atStop = !!drawLeg && !!state && state.attempts >= drawLeg.until;
  const listLeft: QueueItem[] =
    leg?.kind === "today"
      ? (roundItems ?? []).filter((item) => !legGraded.has(gradedKey(item)))
      : leg?.kind === "forgotten" && data && state
        ? leg.items
            .filter((d) => !legGraded.has(drawKey(d.cardId, d.mode)))
            .flatMap((d) => reviewItem(data, state.log, d) ?? [])
        : [];
  const current: QueueItem | null = !leg
    ? null
    : drawLeg
      ? atStop
        ? null
        : drawn
      : (listLeft[0] ?? null);
  const currentCardId = current?.card.id;
  const currentItemKey = current ? itemKey(current) : undefined;
  const deckName = deck ? decks.data?.find((d) => d.id === deck)?.name : undefined;
  const currentDeck = current ? decks.data?.find((d) => d.id === current.card.deckId) : undefined;
  const hint = useRevealHint(current ? `${current.stateId}-${done}` : undefined, revealed);
  usePrefetchPictures(drawLeg ? (state?.upcoming ?? []) : listLeft, 0);

  // What the header counts: the goal for its own stretch, and a round's own cards otherwise.
  const legDone = !leg || !state ? 0 : drawLeg ? state.attempts - leg.from : legGraded.size;
  const legSize = !leg
    ? 0
    : leg.kind === "today"
      ? leg.size
      : leg.kind === "forgotten"
        ? leg.items.length
        : leg.until - leg.from;

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
  const stopped = !!leg && !!data && !!state && !current && (!drawLeg || atStop || exhausted);
  const left = useMemo(
    () =>
      stopped && data && state
        ? drawableUpTo(data, state, deck, Math.max(EXTRA_ROUND, data.goal - state.attempts))
        : 0,
    [stopped, data, state, deck],
  );
  const forgottenItems = useMemo(
    () => (stopped && data && state ? forgottenRound(data, state, deck) : []),
    [stopped, data, state, deck],
  );
  // An empty draw waits for a fetch begun after the last grade, so the heading never changes once shown.
  const checking = stopped && left === 0 && !confirmed && !(unreachable && !draw.isFetching);
  useEffect(() => {
    if (checking && !unreachable && !draw.isFetching) void draw.refetch();
  }, [checking, unreachable, draw.isFetching, draw.refetch]);
  // A deck's end names the deck and weighs the other decks, so it waits for them while they load.
  const decksLoading = !!deck && !decks.data && decks.fetchStatus === "fetching";
  const result = useMemo(
    () =>
      stopped && !checking && !decksLoading && leg && data && state
        ? reviewEnd({
            stretch: drawLeg ? drawLeg.kind : "list",
            goal: data.goal,
            from: leg.from,
            attempts: state.attempts,
            satisfiedBefore: leg.satisfied,
            left,
            confirmed,
            scoped: !!deck,
            forgotten: forgottenItems.length,
            otherDecks: !deck ? [] : decks.data ? decks.data.filter((d) => d.id !== deck) : null,
          })
        : null,
    [
      stopped,
      checking,
      decksLoading,
      leg,
      drawLeg,
      data,
      state,
      left,
      confirmed,
      deck,
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
  const streakNow = useMemo(
    () =>
      streak.data && attempts !== undefined
        ? streakWith(streak.data, attempts, counts)
        : streak.data,
    [streak.data, attempts, counts],
  );
  // Frozen once the draw runs dry, before the grade's streak refetch can fill the light early.
  const legFrom = leg?.from;
  const before = useMemo(
    () => ({
      week:
        streak.data && legFrom !== undefined
          ? streakWith(streak.data, legFrom, false)
          : streak.data,
      lantern: lanternFor(streak.data),
    }),
    [streak.data, legFrom],
  );
  const [held, setHeld] = useState(before);
  const frozen = stopped || (exhausted && !!held.week);
  useEffect(() => {
    if (!frozen) setHeld(before);
  }, [frozen, before]);

  const startLeg = (next: Leg) => {
    // The pressed button fades out for a moment, and while it holds focus Space would not reach the card.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setLegGraded(new Set());
    setHeld({
      week: streak.data && streakWith(streak.data, next.from, false),
      lantern: lanternFor(streak.data),
    });
    setPinned(null);
    setRevealed(false);
    setAnimateNextCard(true);
    setAnimateReveal(true);
    setLeg(next);
  };

  const onOffer = (offer: Offer) => {
    if (!data || !state) return;
    if (offer.kind === "deck") {
      void navigate({ to: "/review", search: { deck: offer.id } });
      return;
    }
    const base = {
      date: state.day.date,
      from: state.attempts,
      satisfied: !!leg?.satisfied || !!end?.satisfied,
    };
    if (offer.kind === "forgotten") startLeg({ ...base, kind: "forgotten", items: forgottenItems });
    else if (offer.kind === "goal") startLeg({ ...base, kind: "goal", until: data.goal });
    else startLeg({ ...base, kind: "more", until: state.attempts + offer.count });
    // Today's round is over, so a reload continues the day rather than walking it again.
    if (round) void navigate({ to: "/review", search: deck ? { deck } : {}, replace: true });
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
      if (leg && !drawLeg) setLegGraded((keys) => new Set(keys).add(gradedKey(item)));
      setAnimateNextCard(input !== "keyboard");
      setRevealed(false);
      setNow(new Date());
      setPinned(null);
      setDone((n) => n + 1);

      void recorded.then((outcome) => {
        invalidateReviewData();
        if (outcome === "queued") return;
        if (outcome === "refused") {
          toast.add({ type: "error", title: t`Couldn’t save your last grade.` });
        }
        // A dropped grade leaves the fetched data behind, and so does a long run of sent ones.
        const behind = gradeStore
          .snapshot()
          .filter((g) => new Date(g.reviewedAt).getTime() >= data.fetchedAt).length;
        if (outcome !== "sent" || behind >= REFRESH_AFTER || runningShort) {
          void qc.invalidateQueries({ queryKey: ["queue"] });
        }
      });
    },
    [revealed, current, data, state, leg, drawLeg, invalidateReviewData, qc, t],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A sheet over the review handles its own keys, Escape included.
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || add.open) return;
      if (e.key === "Escape") {
        navigate({ to: "/today" });
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
  }, [revealed, onGrade, navigate, add.open, current]);

  const doneLink = (variant: "primary" | "secondary") => (
    <Link to="/today" className={buttonClass(variant, "lg", "w-full")}>
      <Trans>Done</Trans>
    </Link>
  );

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-x-clip px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] @3xl:max-w-2xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
      <ReviewHeader
        attempts={state?.attempts ?? 0}
        goal={data?.goal ?? 0}
        animateCount={animateNextCard}
        round={leg && drawLeg?.kind !== "goal" ? { done: legDone, size: legSize } : undefined}
        streak={streak.data}
        complete={!!end}
        onClose={() => navigate({ to: "/today" })}
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
              goal={data.goal}
              from={leg?.from}
              roundCount={legDone}
              deckName={deckName}
              streak={streakNow}
              streakBefore={held.week}
              lanternFrom={held.lantern.out ? "out" : (held.lantern.progress ?? "brand")}
              focusOnMount
              onOffer={onOffer}
              actions={
                end.heading === "nothing_due" ? (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => add.openCard(deck)}
                    >
                      <Plus aria-hidden="true" />
                      <Trans>Add cards</Trans>
                    </Button>
                    {doneLink("secondary")}
                  </>
                ) : (
                  doneLink("primary")
                )
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
              revealed={revealed}
              animateReveal={animateReveal}
              animateIn={animateNextCard}
              hint={hint}
              onReveal={() => {
                recordReveal();
                setAnimateReveal(true);
                setRevealed(true);
              }}
              onPlayAudio={current.card.language ? playAudio : undefined}
              audioState={audioState}
              audioError={
                audioError && audioError.item === currentItemKey ? audioError.message : null
              }
              className="mt-4 @3xl:max-h-[600px] @3xl:min-h-[460px]"
            />
            <GradeBar
              revealed={revealed}
              animateIn={animateReveal}
              animateOut={animateNextCard}
              next={current.next}
              onGrade={(rating) => onGrade(rating, "pointer")}
              className="pt-3"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
