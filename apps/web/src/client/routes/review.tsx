import { formatInterval, type Rating } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Chip, StateChip } from "../components/Chip";
import { Lantern } from "../components/Lantern";
import { gradeWithOutbox, type QueueItem } from "../lib/api";
import { queueQuery } from "../lib/queries";

export const Route = createFileRoute("/review")({
  validateSearch: (s: Record<string, unknown>): { deck?: string } =>
    typeof s.deck === "string" ? { deck: s.deck } : {},
  component: Review,
});

const GRADES: { rating: Rating; label: string; key: string }[] = [
  { rating: 1, label: "Again", key: "1" },
  { rating: 2, label: "Hard", key: "2" },
  { rating: 3, label: "Good", key: "3" },
  { rating: 4, label: "Easy", key: "4" },
];

function Review() {
  const { deck } = Route.useSearch();
  const qc = useQueryClient();
  const queue = useQuery(queueQuery(deck));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flare, setFlare] = useState(false);
  const [done, setDone] = useState(0);

  const items = queue.data?.items ?? [];
  const current: QueueItem | undefined = items[index];
  const total = queue.data?.total ?? 0;
  const finished = queue.isSuccess && !current;

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
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        else onGrade(3);
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (g) onGrade(g.rating);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, onGrade]);

  useEffect(() => {
    if (finished) qc.invalidateQueries({ queryKey: ["queue"] });
  }, [finished, qc]);

  const progress = total > 0 ? Math.min(1, done / total) : 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-4 md:max-w-lg md:py-8">
      <div className="flex items-center gap-3 px-1 pt-3 text-[13px] text-muted">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-ink"
          aria-label="Back to Today"
        >
          <Lantern className="size-[18px]" flicker={!flare} flare={flare} />
        </Link>
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i
            className="block h-full rounded-full bg-amber transition-[width] duration-300 ease-out-quart"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="tabular-nums">
          {Math.min(done + 1, total)} / {total}
        </span>
      </div>

      {queue.isPending && (
        <div className="mt-4 flex-1 rounded-xl border border-border bg-surface" aria-busy="true" />
      )}

      {finished && (
        <section className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <Lantern className="size-32 text-ink" flicker halo litUp={done > 0} />
          <h2 className="mt-3 text-[24px] font-semibold">
            {done > 0 ? "That's the lot" : "Nothing due"}
          </h2>
          <p className="max-w-[26ch] text-[14.5px] text-muted">
            {done > 0
              ? `${done} reviewed. The rest can wait a while.`
              : "Come back later, or add something new."}
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/">
              <Button variant="primary" size="lg">
                Done
              </Button>
            </Link>
          </div>
        </section>
      )}

      {current && (
        <>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-4 flex flex-1 flex-col rounded-xl border border-border bg-surface p-5 text-left shadow-ambient outline-none focus-visible:ring-2 focus-visible:ring-amber"
            aria-label={revealed ? undefined : "Show meaning"}
          >
            <div className="flex items-center justify-between text-[12.5px] text-muted">
              <span>{current.direction === "recognition" ? "Recognise" : "Produce"}</span>
              <StateChip state={current.fsrsState} />
            </div>
            <p className="mt-8 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em]">
              {current.direction === "recognition"
                ? current.card.term
                : (current.card.meaning ?? current.card.term)}
            </p>
            {current.direction === "recognition" && current.card.pronunciation && (
              <p className="mt-2 text-[14px] text-muted">{current.card.pronunciation}</p>
            )}

            <div
              className={clsx(
                "mt-6 border-t border-border pt-4 transition-opacity duration-200",
                revealed ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={!revealed}
            >
              <p className="text-[18px] font-medium leading-[1.4]">
                {current.direction === "recognition"
                  ? (current.card.meaning ?? "No meaning yet")
                  : current.card.term}
              </p>
              {current.card.example && (
                <p className="mt-2.5 text-[14.5px] leading-[1.5] text-ink-2">
                  {current.card.example}
                </p>
              )}
              {current.card.notes && (
                <p className="mt-2 text-[13.5px] text-muted">{current.card.notes}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {current.card.meaningSource === "ai" && <Chip tone="ai">AI meaning</Chip>}
                {current.card.exampleSource === "ai" && <Chip tone="ai">AI example</Chip>}
                {current.card.source && <Chip>{current.card.source}</Chip>}
              </div>
            </div>
            {!revealed && (
              <p className="mt-auto pt-6 text-center text-[13px] text-muted">Tap to show</p>
            )}
          </button>

          <div className="mt-3.5 grid grid-cols-4 gap-2 pb-safe">
            {GRADES.map((g) => (
              <button
                key={g.rating}
                type="button"
                disabled={!revealed || grade.isPending}
                onClick={() => onGrade(g.rating)}
                className={clsx(
                  "grid h-14 content-center gap-px rounded-md border text-[14px] font-medium transition-[transform,background-color,opacity] duration-150 ease-out-quart",
                  "disabled:opacity-40",
                  g.rating === 3
                    ? "border-amber bg-amber text-amber-ink shadow-amber enabled:hover:-translate-y-px"
                    : "border-border-strong bg-bg text-ink enabled:hover:-translate-y-px enabled:hover:bg-hover",
                )}
              >
                {g.label}
                <small
                  className={clsx(
                    "text-[11.5px] font-normal tabular-nums",
                    g.rating === 3 ? "text-amber-ink/75" : "text-muted",
                  )}
                >
                  {formatInterval(new Date(), new Date(current.next[g.rating]))}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
