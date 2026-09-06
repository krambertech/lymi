import type { Rating } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "../components/Button";
import { api, gradeWithOutbox, type QueueItem } from "../lib/api";
import { decksQuery, historyQuery, queueQuery } from "../lib/queries";
import {
  GRADES,
  GradeBar,
  ReviewCard,
  ReviewError,
  ReviewHeader,
  ReviewSkeleton,
  SessionDone,
} from "../views/ReviewView";

export const Route = createFileRoute("/review")({
  validateSearch: (s: Record<string, unknown>): { deck?: string } =>
    typeof s.deck === "string" ? { deck: s.deck } : {},
  component: Review,
});

function Review() {
  const { deck } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const queue = useQuery(queueQuery(deck));
  const decks = useQuery(decksQuery);
  const history = useQuery(historyQuery);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flare, setFlare] = useState(false);
  const [done, setDone] = useState(0);
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  const [audioError, setAudioError] = useState<string | null>(null);
  const playingAudio = useRef<HTMLAudioElement | null>(null);
  const [pendingRating, setPendingRating] = useState<Rating | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [animateNextCard, setAnimateNextCard] = useState(true);
  const [animateReveal, setAnimateReveal] = useState(true);

  const items = queue.data?.items ?? [];
  const current: QueueItem | undefined = items[index];
  const currentCardId = current?.card.id;
  const total = queue.data?.total ?? 0;
  const sessionTotal = items.length;
  const finished = queue.isSuccess && !current;
  const deckName = deck ? decks.data?.find((d) => d.id === deck)?.name : undefined;

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
        setAudioError("Pronunciation audio is unavailable. Try again in a moment.");
      }
    }
  }, [audioState, current, stopAudio]);

  const invalidateReviewData = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["decks"] });
    qc.invalidateQueries({ queryKey: ["history"] });
  }, [qc]);

  const grade = useMutation({
    mutationFn: ({ item, rating }: { item: QueueItem; rating: Rating }) =>
      gradeWithOutbox({ cardId: item.card.id, direction: item.direction, rating }),
    onSuccess: (_res, { rating }) => {
      setGradeError(null);
      setPendingRating(null);
      if (rating >= 3) {
        setFlare(true);
        window.setTimeout(() => setFlare(false), 380);
      }
      setDone((n) => n + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
    },
    onError: () => {
      setPendingRating(null);
      setGradeError("That grade didn’t save. Try once more.");
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
        navigate({ to: "/" });
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (!revealed) {
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
    <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 pb-safe @3xl:max-w-xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
      <ReviewHeader
        done={done}
        total={sessionTotal}
        deckName={deckName}
        flare={flare}
        onClose={() => navigate({ to: "/" })}
      />

      {queue.isPending && <ReviewSkeleton />}

      {queue.isError && (
        <ReviewError
          retry={() => queue.refetch()}
          action={
            <Link to="/" className={buttonClass("ghost")}>
              Back
            </Link>
          }
        />
      )}

      {finished && (
        <SessionDone
          done={done}
          moreDue={Math.max(total - items.length, 0)}
          history={history.data?.days}
          action={
            <Link to="/" className={buttonClass("primary", "lg")}>
              Done
            </Link>
          }
        />
      )}

      {current && (
        <>
          <ReviewCard
            key={`${current.card.id}-${current.direction}`}
            item={current}
            revealed={revealed}
            animateReveal={animateReveal}
            onReveal={() => {
              setAnimateReveal(true);
              setRevealed(true);
            }}
            onPlayAudio={current.card.language ? playAudio : undefined}
            audioState={audioState}
            className={`${animateNextCard ? "enter-card" : ""} mt-4 @3xl:min-h-[420px] @3xl:flex-none`}
          />
          {audioError && (
            <p className="mt-2 text-center text-sm text-danger" role="status">
              {audioError}
            </p>
          )}
          {revealed && (
            <GradeBar
              enabled
              pending={grade.isPending}
              pendingRating={pendingRating}
              error={gradeError}
              onGrade={(rating) => onGrade(rating, "pointer")}
              className={`${animateReveal ? "grade-enter" : ""} mt-3 pb-3 @3xl:pb-0`}
            />
          )}
        </>
      )}
    </div>
  );
}
