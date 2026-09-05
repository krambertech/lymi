import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AddCardSheet } from "../components/AddCardSheet";
import { Button } from "../components/Button";
import { StateChip } from "../components/Chip";
import { api } from "../lib/api";
import { deckCardsQuery, decksQuery } from "../lib/queries";

export const Route = createFileRoute("/decks/$deckId")({
  component: DeckPage,
});

function DeckPage() {
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const deck = decks.data?.find((d) => d.id === deckId);
  const [addOpen, setAddOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: string; term: string } | null>(null);

  const archive = useMutation({
    mutationFn: (id: string) => api.archiveCard(id),
    onSuccess: (_r, id) => {
      const term = cards.data?.find((c) => c.card.id === id)?.card.term ?? "Card";
      setUndo({ id, term });
      setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 6000);
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
  });
  const restore = useMutation({
    mutationFn: (id: string) => api.restoreCard(id),
    onSuccess: () => {
      setUndo(null);
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-24 md:max-w-3xl md:px-8 md:pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-4 pb-3 md:pt-8">
        <div>
          <Link to="/decks" className="text-[13px] text-muted hover:text-ink md:hidden">
            ← Decks
          </Link>
          <h1 className="text-[22px] font-semibold">
            {deck?.name ?? "Deck"}{" "}
            {deck?.defaultLanguage && (
              <small className="text-[14px] font-medium text-muted uppercase">
                {deck.defaultLanguage}
              </small>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)} kbd="N">
            Add word
          </Button>
          {deck && deck.due > 0 && (
            <Link to="/review" search={{ deck: deckId }}>
              <Button variant="primary" size="sm">
                Review {deck.due} due
              </Button>
            </Link>
          )}
        </div>
      </header>

      {deck && (
        <p className="mb-4 text-[13.5px] text-muted">
          {deck.due > 0 && (
            <b className="mr-3 font-semibold text-amber-text">{deck.due} due today</b>
          )}
          {deck.total} {deck.total === 1 ? "card" : "cards"}
        </p>
      )}

      {cards.isSuccess && cards.data.length === 0 && (
        <p className="text-[14.5px] text-muted">Empty. Add the first word from your lesson.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12.5px] font-medium text-muted">
              <th className="border-b border-border px-2.5 py-1.5">Word</th>
              <th className="border-b border-border px-2.5 py-1.5">Meaning</th>
              <th className="border-b border-border px-2.5 py-1.5">Status</th>
              <th className="border-b border-border px-2.5 py-1.5 text-right">Next</th>
              <th className="border-b border-border px-2.5 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {cards.data?.map(({ card, state }) => (
              <tr key={card.id} className="group hover:bg-surface">
                <td className="border-b border-border px-2.5 py-2.5 font-semibold whitespace-nowrap">
                  {card.term}
                </td>
                <td className="min-w-40 border-b border-border px-2.5 py-2.5 text-ink-2">
                  {card.meaning ?? <span className="text-muted">—</span>}
                </td>
                <td className="border-b border-border px-2.5 py-2.5">
                  <StateChip state={state?.state} />
                </td>
                <td className="border-b border-border px-2.5 py-2.5 text-right text-muted tabular-nums whitespace-nowrap">
                  {state ? nextLabel(new Date(state.due)) : "—"}
                </td>
                <td className="border-b border-border px-2.5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => archive.mutate(card.id)}
                    className="rounded-sm px-2 py-1 text-[12.5px] text-muted opacity-0 transition-opacity hover:bg-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {undo && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-md bg-ink py-2.5 pl-3.5 pr-2.5 text-[14px] text-bg shadow-ambient md:bottom-6"
        >
          <span>Archived “{undo.term}”</span>
          <button
            type="button"
            onClick={() => restore.mutate(undo.id)}
            className="rounded-sm px-2 py-1 font-semibold text-amber"
          >
            Undo
          </button>
        </div>
      )}

      <AddCardSheet open={addOpen} onOpenChange={setAddOpen} deckId={deckId} />
    </div>
  );
}

function nextLabel(due: Date): string {
  const now = Date.now();
  if (due.getTime() <= now) return "today";
  const days = Math.round((due.getTime() - now) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days} d`;
  return `${Math.round(days / 30)} mo`;
}
