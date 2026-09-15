import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { deckCardsQuery, decksQuery, joinLinkQuery, sectionsQuery } from "../lib/queries";
import { useArchiveDeck } from "../lib/use-archive-deck";
import { type DeckSettingsPatch, DeckSettingsView } from "../views/deck-settings-view";

export const Route = createFileRoute("/library/$deckId/settings")({
  component: DeckSettings,
});

function DeckSettings() {
  const { t } = useLingui();
  const { deckId } = Route.useParams();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const cards = useQuery(deckCardsQuery(deckId));
  const deck = decks.data?.find((d) => d.id === deckId);
  useDocumentTitle(t`Deck settings`);
  // The oldest card with a meaning, so the direction rows read the same way twice running.
  const isOwner = deck?.role === "owner";
  const joinLink = useQuery({ ...joinLinkQuery(deckId), enabled: isOwner });
  const sections = useQuery({ ...sectionsQuery(deckId), enabled: isOwner });
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

  const archive = useArchiveDeck(deckId, deck?.name);

  const turnOn = useMutation({
    mutationFn: () => api.turnOnJoinLink(deckId),
    onSuccess: (value) => qc.setQueryData(joinLinkQuery(deckId).queryKey, value),
  });
  const turnOff = useMutation({
    mutationFn: () => api.turnOffJoinLink(deckId),
    onSuccess: () =>
      qc.setQueryData(joinLinkQuery(deckId).queryKey, (prev) => ({
        link: null,
        members: prev?.members ?? 0,
      })),
  });
  const sharingError = turnOn.isError
    ? t`Could not turn on the join link. Try again.`
    : turnOff.isError
      ? t`Could not turn off the join link. Try again.`
      : joinLink.isError
        ? t`Could not load the join link.`
        : undefined;

  return (
    <DeckSettingsView
      deck={deck}
      example={example ? { term: example.term, meaning: example.meaning } : undefined}
      onSave={(patch) => save.mutate(patch)}
      saving={save.isPending}
      saved={saved}
      error={save.isError ? errorMessage(save.error) : undefined}
      onArchive={() => archive.mutate()}
      sectionCount={sections.data?.sections.length}
      sharing={
        isOwner
          ? {
              deckName: deck.name,
              link: joinLink.data?.link,
              members: joinLink.data?.members ?? 0,
              onTurnOn: () => turnOn.mutate(),
              onTurnOff: () => turnOff.mutate(),
              pending: turnOn.isPending ? "on" : turnOff.isPending ? "off" : undefined,
              error: sharingError,
            }
          : undefined
      }
    />
  );
}
