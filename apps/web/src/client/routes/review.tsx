import { Trans, useLingui } from "@lingui/react/macro";
import { modeKey, type Rating, ROUNDS, type Round } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { buttonClass } from "../components/Button";
import { GRADES } from "../components/Grade";
import { api, deviceTimezone, type QueueItem } from "../lib/api";
import { usePrefetchPictures } from "../lib/card-images";
import { gradeStore, recordGrade, retireGrades } from "../lib/grades";
import { decksQuery, drawQuery, queueQuery, streakQuery } from "../lib/queries";
import { recordReveal, useRevealHint } from "../lib/reveal-hint";
import { drawState, type LocalGrade, reviewItem, stateBefore } from "../lib/review-draw";
import { itemKey } from "../lib/review-modes";
import {
  GradeBar,
  ReviewCard,
  ReviewError,
  ReviewHeader,
  ReviewSkeleton,
  SessionDone,
} from "../views/ReviewView";

export const Route = createFileRoute("/review")({
  validateSearch: (s: Record<string, unknown>): { deck?: string; round?: Round } => {
    const round = ROUNDS.find((r) => r === s.round);
    return {
      ...(typeof s.deck === "string" ? { deck: s.deck } : {}),
      ...(round ? { round } : {}),
    };
  },
  component: Review,
});

/** Pictures of this many cards after the current one are fetched ahead. */
const LOOKAHEAD = 3;
const NO_GRADES: never[] = [];
/** Local grades a fetch can fall behind by before the draw data is refreshed. */
const REFRESH_AFTER = 20;

type Pinned = { cardId: string; mode: string };

function Review() {
  const { t } = useLingui();
  const { deck, round } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
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
  const [roundGraded, setRoundGraded] = useState<ReadonlySet<string>>(() => new Set());
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  // Tied to the queue item, so a failure never carries onto the next card's button.
  const [audioError, setAudioError] = useState<{ item: string; message: string } | null>(null);
  const playingAudio = useRef<HTMLAudioElement | null>(null);
  const [pendingRating, setPendingRating] = useState<Rating | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
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
  const roundLeft = (roundQueue.data?.items ?? []).filter(
    (item) => !roundGraded.has(itemKey(item)),
  );
  const drawn =
    pinnedItem ?? (data && state?.next ? reviewItem(data, state.log, state.next) : null);
  const current: QueueItem | null = round ? (roundLeft[0] ?? null) : drawn;
  const currentCardId = current?.card.id;
  const currentItemKey = current ? itemKey(current) : undefined;
  const deckName = deck ? decks.data?.find((d) => d.id === deck)?.name : undefined;
  const hint = useRevealHint(current ? `${current.stateId}-${done}` : undefined, revealed);
  usePrefetchPictures(round ? roundLeft : (state?.upcoming ?? []), 0);

  // A pinned card a refetch no longer holds, such as one archived meanwhile, gives way.
  const repin = !!state?.next && (!pinned || !pinnedItem);
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
  const confirmedEmpty = exhausted && !!data && data.fetchedAt >= lastChange;
  const needsConfirming = !round && exhausted && !confirmedEmpty && !unreachable;
  useEffect(() => {
    if (needsConfirming && !draw.isFetching) void draw.refetch();
  }, [needsConfirming, draw.isFetching, draw.refetch]);
  const finished = round
    ? !!roundQueue.data && !current
    : !current && exhausted && !draw.isFetching && (confirmedEmpty || unreachable);
  const failed = round ? roundQueue.isError && !roundQueue.data : draw.isError && !draw.data;

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

  const grade = useMutation({
    // Grades work offline through the outbox, so they must not wait for a connection.
    networkMode: "always",
    mutationFn: async ({ item, rating }: { item: QueueItem; rating: Rating }) => {
      const key = modeKey(item.mode);
      const repeat = state?.log.some((e) => e.cardId === item.card.id && e.mode === key);
      const graded: LocalGrade = {
        cardId: item.card.id,
        mode: item.mode,
        rating,
        reviewedAt: new Date().toISOString(),
        stateBefore:
          data && state && repeat
            ? stateBefore(data, state.log, item.card.id, item.mode)
            : item.fsrsState,
      };
      const recorded = await recordGrade({ ...graded, timezone: deviceTimezone() });
      return { item, recorded };
    },
    onSuccess: ({ item, recorded }) => {
      if (round) setRoundGraded((keys) => new Set(keys).add(itemKey(item)));
      setGradeError(null);
      setPendingRating(null);
      setRevealed(false);
      setNow(new Date());
      setPinned(null);
      // Another device already graded this mode later, so the fetched data is behind.
      if (recorded.duplicate) {
        void qc.invalidateQueries({ queryKey: ["queue"] });
        return;
      }
      setDone((n) => n + 1);
      const behind = gradeStore
        .snapshot()
        .filter((g) => new Date(g.reviewedAt).getTime() >= (data?.fetchedAt ?? 0)).length;
      const runningShort = (state?.upcoming.length ?? 0) <= LOOKAHEAD;
      if (!recorded.queued && (behind >= REFRESH_AFTER || runningShort)) {
        void qc.invalidateQueries({ queryKey: ["queue"] });
      }
    },
    onError: () => {
      setPendingRating(null);
      setGradeError(t`Couldn’t save that grade. Try again.`);
    },
    onSettled: invalidateReviewData,
  });

  const onGrade = useCallback(
    (rating: Rating, input: "keyboard" | "pointer" = "pointer") => {
      if (!revealed || grade.isPending || !current) return;
      setGradeError(null);
      setPendingRating(rating);
      setAnimateNextCard(input !== "keyboard");
      grade.mutate({ item: current, rating });
    },
    [revealed, grade, current],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        navigate({ to: "/today" });
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
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
  }, [revealed, onGrade, navigate]);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] @3xl:max-w-2xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
      <ReviewHeader
        attempts={state?.attempts ?? 0}
        goal={data?.goal ?? 0}
        animateCount={animateNextCard}
        streak={streak.data}
        onClose={() => navigate({ to: "/today" })}
      />

      {!current && !finished && !failed && <ReviewSkeleton />}

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

      {finished && (
        <SessionDone
          done={done}
          deckName={deckName}
          round={!!round}
          streak={streak.data}
          action={
            <Link to="/today" className={buttonClass("primary", "lg")}>
              <Trans>Done</Trans>
            </Link>
          }
        />
      )}

      {current && (
        <>
          <ReviewCard
            key={`${itemKey(current)}-${done}`}
            item={current}
            revealed={revealed}
            animateReveal={animateReveal}
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
            className={`${animateNextCard ? "enter-card" : ""} mt-4 @3xl:max-h-[600px] @3xl:min-h-[460px]`}
          />
          <GradeBar
            revealed={revealed}
            animateIn={animateReveal}
            next={current.next}
            pending={grade.isPending}
            pendingRating={pendingRating}
            error={gradeError}
            onGrade={(rating) => onGrade(rating, "pointer")}
            className="pt-3"
          />
        </>
      )}
    </div>
  );
}
