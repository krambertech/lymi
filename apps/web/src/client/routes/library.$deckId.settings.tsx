import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { deckCardsQuery, decksQuery } from "../lib/queries";
import { type DeckSettingsPatch, DeckSettingsView } from "../views/DeckSettingsView";

export const Route = createFileRoute("/library/$deckId/settings")({
  component: DeckSettings,
});

function DeckSettings() {
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const deck = decks.data?.find((d) => d.id === deckId);
  // The oldest card with a meaning, so the direction rows read the same way twice running.
  const example = cards.data?.filter((c) => c.card.meaning).at(-1)?.card;

  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = useMutation({
    mutationFn: (patch: DeckSettingsPatch) => api.updateDeck(deckId, patch),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["decks"] }),
        qc.invalidateQueries({ queryKey: ["queue"] }),
        qc.invalidateQueries({ queryKey: ["decks", deckId, "cards"] }),
      ]);
      setSaved(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 2500);
    },
  });

  const archive = useMutation({
    mutationFn: () => api.archiveDeck(deckId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      navigate({ to: "/library", search: { archived: deckId, name: deck?.name ?? "Deck" } });
    },
  });

  return (
    <DeckSettingsView
      deck={deck}
      example={example ? { term: example.term, meaning: example.meaning } : undefined}
      onSave={(patch) => save.mutate(patch)}
      saving={save.isPending}
      saved={saved}
      error={save.isError ? (save.error as Error).message : undefined}
      onArchive={() => archive.mutate()}
    />
  );
}
