import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Section } from "@lymi/client/api";
import { isolate, type SectionArchiveInput } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Sheet, SheetGroup, SheetRow } from "../ui/sheet";
import { toast } from "../ui/toast-host";

type SectionCards = SectionArchiveInput["cards"];

/**
 * Archiving a section, as the web's: one with cards asks first, because the owner says whether
 * they stay in the deck or leave with it; either way it happens at once and offers Undo. `archive`
 * a section, and render `sheet`.
 */
export function useArchiveSection(onArchived?: (section: Section) => void) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [asking, setAsking] = useState<Section | null>(null);
  // Kept while the sheet closes, so its title does not change on the way out.
  const [shown, setShown] = useState<Section | null>(null);
  // The choice runs once the sheet has gone, so the toast lands on the page rather than under it.
  const chosen = useRef<SectionCards | null>(null);

  const refresh = () =>
    Promise.all(
      ["decks", "series", "queue", "rounds", "cards"].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const failed = (e: unknown) => toast.add({ error: true, title: errorMessage(e) });
  const archive = useMutation({
    mutationFn: ({ section, cards }: { section: Section; cards: SectionCards }) =>
      api.archiveSection(section.id, { cards }),
    onSuccess: (_r, { section, cards }) => {
      const sectionName = section.name;
      toast.add({
        id: `archive-section-${section.id}`,
        title:
          cards === "archive" && section.total > 0
            ? t`Archived “${{ sectionName: isolate(sectionName) }}” and its cards`
            : t`Archived “${{ sectionName: isolate(sectionName) }}”`,
        // Not a mutation of the page's: Undo can be pressed after the learner has left it.
        action: {
          label: t`Undo`,
          onPress: () =>
            void api
              .restoreSection(section.id)
              .then(refresh)
              .catch((e) => failed(e)),
        },
      });
      onArchived?.(section);
    },
    onError: failed,
    onSettled: refresh,
  });

  const choose = (cards: SectionCards) => {
    chosen.current = cards;
    setAsking(null);
  };
  const count = shown?.total ?? 0;
  const sectionName = shown?.name ?? "";

  return {
    archive: (section: Section) => {
      if (section.total === 0) return archive.mutate({ section, cards: "keep" });
      chosen.current = null;
      setShown(section);
      setAsking(section);
    },
    sheet: (
      <Sheet
        title={t`Archive “${{ sectionName: isolate(sectionName) }}”?`}
        description={t`Nothing is deleted. Restore it from Archived sections.`}
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        onDismiss={() => {
          const cards = chosen.current;
          chosen.current = null;
          if (cards && shown) archive.mutate({ section: shown, cards });
        }}
      >
        <SheetGroup>
          <SheetRow
            label={plural(count, { one: "Keep the card", other: "Keep the cards" })}
            detail={plural(count, {
              one: "It stays in the deck without a section, and keeps coming up in review.",
              other: "They stay in the deck without a section, and keep coming up in review.",
            })}
            onPress={() => choose("keep")}
          />
          <SheetRow
            label={plural(count, { one: "Archive its card too", other: "Archive its # cards too" })}
            detail={plural(count, {
              one: "It leaves the deck and stops coming up in review until you restore the section.",
              other:
                "They leave the deck and stop coming up in review until you restore the section.",
            })}
            destructive
            onPress={() => choose("archive")}
          />
        </SheetGroup>
      </Sheet>
    ),
  };
}
