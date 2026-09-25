import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { Card, DeckSummary } from "../lib/api";
import { errorMessage } from "../lib/api";
import { cardPatch, hasChanges, refreshAfterCardWrite, savePicture } from "../lib/card-writes";
import { useOverlayShape } from "../lib/device";
import { writes } from "../lib/writes";
import {
  CardForm,
  type CardFormDraft,
  type CardFormOutcome,
  type CardFormValues,
} from "./card-form";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { toast } from "./ui/toast";

interface Props {
  /** The card to change; the sheet is open while there is one. */
  card: Card | null;
  decks: DeckSummary[] | undefined;
  /** Called with false when the sheet closes; handing it a card is what opens it. */
  onOpenChange: (open: boolean) => void;
  /** Undo on a discarded edit opens the same card again. */
  onReopen: (card: Card) => void;
  /** Opens at the picture field. */
  openPicture?: boolean | undefined;
  /** After a save, with the deck the card is in now. */
  onSaved?: ((card: Card, movedFrom: string | null) => void) | undefined;
}

/** The add form, filled in, for changing every field of a card at once. */
export function EditCardSheet({
  card,
  decks,
  onOpenChange,
  onReopen,
  openPicture,
  onSaved,
}: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const shape = useOverlayShape(!!card);
  const [pending, setPending] = useState(false);
  // Held while the sheet closes, so its contents do not vanish mid-animation.
  const [shown, setShown] = useState(card);
  if (card && card !== shown) setShown(card);
  const draft = useRef<CardFormDraft | null>(null);
  const [restored, setRestored] = useState<{ draft: CardFormDraft; key: number } | null>(null);

  const close = (keepWork: boolean) => {
    const work = draft.current;
    const edited = card;
    draft.current = null;
    setRestored(null);
    onOpenChange(false);
    if (!keepWork || !work || !edited || !hasChanges(edited, work)) return;
    toast.add({
      id: "edit-discarded",
      title: t`Changes discarded`,
      actionProps: {
        children: t`Undo`,
        onClick: () => {
          toast.close("edit-discarded");
          setRestored({ draft: work, key: Date.now() });
          onReopen(edited);
        },
      },
    });
  };

  const submit = async (values: CardFormValues): Promise<CardFormOutcome | undefined> => {
    if (!card) return;
    setPending(true);
    try {
      const patch = cardPatch(card, values);
      const { card: written, queued } = Object.keys(patch).length
        ? await writes.updateCard(card, patch)
        : { card, queued: false };
      const latest = queued ? written : ((await savePicture(written, values)) ?? written);
      await refreshAfterCardWrite(qc, card.id);
      if (queued) {
        // A picture goes to the card on the server, so one chosen offline waits for the learner.
        const picked = values.picture.kind === "file" || values.picture.kind === "link";
        toast.add({
          title: picked
            ? t`Saved on this device. Pictures need a connection, so add it once you’re back online.`
            : t`Saved on this device until Lymi can be reached.`,
        });
      }
      onSaved?.(latest, patch.deckId ? card.deckId : null);
      close(false);
      return undefined;
    } catch (e) {
      // Whatever landed before the failure stays; saving again sends only what is still different.
      await refreshAfterCardWrite(qc, card.id);
      return { status: "failed", message: errorMessage(e) };
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && close(true)}>
      <DialogContent className="max-h-[92dvh] w-[min(92vw,560px)] [scrollbar-color:var(--edge-2)_transparent] [scrollbar-width:thin]">
        <DialogTitle>{t`Edit card`}</DialogTitle>
        {shown && (
          <CardForm
            key={`${shown.id}:${restored?.key ?? 0}`}
            mode="edit"
            card={shown}
            draft={card ? restored?.draft : undefined}
            decks={decks}
            pending={pending}
            layout={shape === "desktop" ? "whole" : "chips"}
            openPicture={openPicture}
            onCancel={() => close(true)}
            onSubmit={submit}
            onDraftChange={(next) => {
              draft.current = next;
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
