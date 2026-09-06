import type { Rating } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";
import { gradeWithOutbox, type QueueItem } from "../lib/api";
import { decksQuery, historyQuery, queueQuery } from "../lib/queries";
import {
  GRADES,
  GradeBar,
  ReviewCard,
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

  const items = queue.data?.items ?? [];
  const current: QueueItem | undefined = items[index];
  const total = queue.data?.total ?? 0;
  const finished = queue.isSuccess && !current;
  const deckName = deck ? decks.data?.find((d) => d.id === deck)?.name : undefined;

  const grade = useMutation({
    mutationFn: (rating: Rating) => {
      if (!current) throw new Error("No card");
      return gradeWithOutbox({ cardId: current.card.id, direction: current.direction, rating });
    },
    onSuccess: (_res, rating) => {
      if (rating >= 3) {
        setFlare(true);
        setTimeout(() => setFlare(false), 380);
      }
      setDone((n) => n + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const onGrade = useCallback(
    (r: Rating) => {
      if (!revealed || grade.isPending) return;
      grade.mutate(r);
    },
    [revealed, grade],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        else onGrade(3);
      }
      if (e.key === "Escape") navigate({ to: "/today" });
      const g = GRADES.find((x) => x.key === e.key);
      if (g) onGrade(g.rating);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onGrade, navigate]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-safe @3xl:max-w-xl @3xl:px-8 @3xl:pb-8 @3xl:pt-4">
      <ReviewHeader
        done={done}
        total={total}
        deckName={deckName}
        flare={flare}
        onClose={() => navigate({ to: "/today" })}
      />

      {queue.isPending && <ReviewSkeleton />}

      {finished && (
        <SessionDone
          done={done}
          history={history.data?.days}
          action={
            <Link to="/today">
              <Button variant="primary" size="lg" tabIndex={-1}>
                Done
              </Button>
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
            onReveal={() => setRevealed(true)}
            className="enter-card mt-5 @3xl:min-h-[440px] @3xl:flex-none"
          />
          <GradeBar
            item={current}
            enabled={revealed}
            pending={grade.isPending}
            onGrade={onGrade}
            className="mt-3 pb-3 @3xl:pb-0"
          />
        </>
      )}
    </div>
  );
}
