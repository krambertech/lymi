import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../components/Button";
import { api } from "../lib/api";
import { decksQuery } from "../lib/queries";

export const Route = createFileRoute("/decks")({
  component: Decks,
});

function Decks() {
  const matches = useMatches();
  const hasChild = matches.some((m) => m.routeId === "/decks/$deckId");
  if (hasChild) return <Outlet />;
  return <DeckList />;
}

function DeckList() {
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: () => api.createDeck({ name: name.trim() }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["decks"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 md:max-w-2xl md:px-8 md:pb-8">
      <header className="flex items-center justify-between pt-4 pb-4 md:pt-8">
        <h1 className="text-[22px] font-semibold">Decks</h1>
      </header>

      <form
        className="mb-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New deck, e.g. Lesson 14"
          className="h-10 flex-1 rounded-md border border-border-strong bg-bg px-3.5 text-[16px] placeholder:text-muted focus:border-amber focus:outline-none focus:ring-[3px] focus:ring-amber-soft"
        />
        <Button variant="primary" type="submit" disabled={!name.trim() || create.isPending}>
          Create
        </Button>
      </form>

      {decks.isSuccess && decks.data.length === 0 && (
        <p className="text-[14.5px] text-muted">
          No decks yet. One per lesson works well, or one per topic. You can move cards later.
        </p>
      )}

      <ul className="grid gap-1.5">
        {decks.data?.map((d) => (
          <li key={d.id}>
            <Link
              to="/decks/$deckId"
              params={{ deckId: d.id }}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 hover:bg-hover"
            >
              <span>
                <span className="font-medium">{d.name}</span>
                {d.defaultLanguage && (
                  <span className="ml-2 text-[12.5px] text-muted uppercase">
                    {d.defaultLanguage}
                  </span>
                )}
              </span>
              <span className="text-[13px] text-muted tabular-nums">
                {d.due > 0 && <b className="mr-2 font-semibold text-amber-text">{d.due} due</b>}
                {d.total}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
