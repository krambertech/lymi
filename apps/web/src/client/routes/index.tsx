import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { decksQuery } from "../lib/queries";

export const Route = createFileRoute("/")({
  component: Today,
});

function Today() {
  const decks = useQuery(decksQuery);
  const due = decks.data?.reduce((n, d) => n + d.due, 0) ?? 0;
  const total = decks.data?.reduce((n, d) => n + d.total, 0) ?? 0;
  const nothingYet = decks.isSuccess && total === 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 md:max-w-2xl md:px-8 md:pb-8">
      <header className="flex items-center justify-between pt-4 pb-2 md:pt-8">
        <h1 className="text-[22px] font-semibold">Today</h1>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
        {due > 0 ? (
          <>
            <Lantern className="size-32 text-ink" flicker halo />
            <h2 className="mt-3 text-[24px] font-semibold">
              {due} {due === 1 ? "card" : "cards"} due
            </h2>
            <p className="max-w-[26ch] text-[14.5px] text-muted">
              Across {decks.data?.filter((d) => d.due > 0).length ?? 0}{" "}
              {decks.data?.filter((d) => d.due > 0).length === 1 ? "deck" : "decks"}. Ten minutes,
              maybe less.
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/review">
                <Button variant="primary" size="lg" kbd="R">
                  Review {due} due
                </Button>
              </Link>
            </div>
          </>
        ) : nothingYet ? (
          <>
            <Lantern className="size-32 text-ink" variant="unlit" />
            <h2 className="mt-3 text-[24px] font-semibold">Nothing here yet</h2>
            <p className="max-w-[28ch] text-[14.5px] text-muted">
              Make a deck, add a word from your last lesson, and the lantern comes on.
            </p>
            <div className="mt-4 flex gap-2">
              <Link to="/decks">
                <Button variant="primary" size="lg">
                  Make a deck
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <Lantern className="size-32 text-ink" variant="unlit" />
            <h2 className="mt-3 text-[24px] font-semibold">Nothing due right now</h2>
            <p className="max-w-[28ch] text-[14.5px] text-muted">
              {total} {total === 1 ? "card" : "cards"} in your decks. Add something from today's
              lesson while it's fresh?
            </p>
          </>
        )}
      </section>

      {decks.data && decks.data.length > 0 && (
        <section className="grid gap-1.5">
          {decks.data.map((d) => (
            <Link
              key={d.id}
              to="/decks/$deckId"
              params={{ deckId: d.id }}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 hover:bg-hover"
            >
              <span className="font-medium">{d.name}</span>
              <span className="text-[13px] text-muted tabular-nums">
                {d.due > 0 && <b className="mr-2 font-semibold text-amber-text">{d.due} due</b>}
                {d.total}
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
