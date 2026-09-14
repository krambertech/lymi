import { Trans, useLingui } from "@lingui/react/macro";
import { type Rating, ROUNDS, type Round } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "../components/Button";
import { GRADES } from "../components/Grade";
import { api, gradeWithOutbox, type QueueItem } from "../lib/api";
import { usePrefetchPictures } from "../lib/card-images";
import { decksQuery, queueQuery, streakQuery } from "../lib/queries";
import { recordReveal, useRevealHint } from "../lib/reveal-hint";
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

function Review() {
  const { t } = useLingui();
  const { deck, round } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const queue = useQuery(queueQuery(deck, round));
  const decks = useQuery(decksQuery);
  const streak = useQuery(streakQuery);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  // Tied to the queue item, so a failure never carries onto the next card's button.
  const [audioError, setAudioError] = useState<{ item: string; message: string } | null>(null);
  const playingAudio = useRef<HTMLAudioElement | null>(null);
  const [pendingRating, setPendingRating] = useState<Rating | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [animateNextCard, setAnimateNextCard] = useState(true);
  const [animateReveal, setAnimateReveal] = useState(true);
  const [startingNext, setStartingNext] = useState(false);

  const items = queue.data?.items ?? [];
  const current: QueueItem | undefined = items[index];
  const currentCardId = current?.card.id;
  const currentItemKey = current ? itemKey(current) : undefined;
  const total = queue.data?.total ?? 0;
  const sessionTotal = items.length;
  const finished = queue.isSuccess && !current;
  const deckName = deck ? decks.data?.find((d) => d.id === deck)?.name : undefined;
  // A session is one batch. What did not fit is offered as the next one rather than appended,
  // because fifty cards at a sitting is already more than an evening wants.
  const moreDue = Math.max(total - items.length, 0);
  const hint = useRevealHint(current ? `${current.stateId}-${index}` : undefined, revealed);
  usePrefetchPictures(items, index);

  /**
   * Start the next batch.
   *
   * The fetch has to land before the index moves. React Query keeps serving the batch just
   * finished until the new one replaces it, so resetting the index first reopens the card that
   * was graded fiftieth, ready to be revealed and graded a second time. Wait, then reset, and
   * hold the button in its loading state in between.
   */
  const nextBatch = useCallback(async () => {
    setStartingNext(true);
    try {
      await qc.refetchQueries({ queryKey: ["queue"], type: "active" });
      setIndex(0);
      setDone(0);
      setRevealed(false);
    } finally {
      setStartingNext(false);
    }
  }, [qc]);

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
    mutationFn: ({ item, rating }: { item: QueueItem; rating: Rating }) =>
      gradeWithOutbox({ cardId: item.card.id, mode: item.mode, rating }),
    onSuccess: () => {
      setGradeError(null);
      setPendingRating(null);
      setDone((n) => n + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
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
        done={done}
        total={sessionTotal}
        animateCount={animateNextCard}
        streak={streak.data}
        onClose={() => navigate({ to: "/today" })}
      />

      {queue.isPending && <ReviewSkeleton />}

      {queue.isError && (
        <ReviewError
          retry={() => queue.refetch()}
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
          moreDue={moreDue}
          deckName={deckName}
          round={!!round}
          streak={streak.data}
          action={
            moreDue > 0 ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  loading={startingNext}
                  onClick={() => void nextBatch()}
                >
                  <Trans>Keep going</Trans>
                </Button>
                <Link to="/today" className={buttonClass("ghost", "lg")}>
                  <Trans>Done</Trans>
                </Link>
              </>
            ) : (
              <Link to="/today" className={buttonClass("primary", "lg")}>
                <Trans>Done</Trans>
              </Link>
            )
          }
        />
      )}

      {current && (
        <>
          <ReviewCard
            key={itemKey(current)}
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
