import { useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useReducer, useRef, useState } from "react";
import type { Card, DeckSummary } from "../lib/api";
import { errorMessage } from "../lib/api";
import { cardPatch, hasChanges, refreshAfterCardWrite, savePicture } from "../lib/card-writes";
import { useOverlayShape } from "../lib/device";
import { sheetPhase } from "../lib/sheet-phase";
import {
  CardForm,
  type CardFormDraft,
  type CardFormOutcome,
  type CardFormValues,
  type EditFocus,
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
  /** Opens at this field rather than the top. */
  focus?: EditFocus | undefined;
  /** Where focus goes on closing, when what opened the sheet is gone. */
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
  /** After a save, with the deck the card is in now. */
  onSaved?: ((card: Card, movedFrom: string | null) => void) | undefined;
}

/** The add form, filled in, for changing every field of a card at once. */
export function EditCardSheet({
  card,
  decks,
  onOpenChange,
  onReopen,
  focus,
  finalFocus,
  onSaved,
}: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const shape = useOverlayShape(!!card);
  const [phase, dispatch] = useReducer(sheetPhase, { status: card ? "editing" : "closed" });
  if (card && phase.status === "closed") dispatch({ type: "open" });
  if (!card && phase.status === "editing") dispatch({ type: "close" });
  // Held while the sheet closes, so its contents do not vanish mid-animation.
  const [shown, setShown] = useState(card);
  if (card && card !== shown) setShown(card);
  const draft = useRef<CardFormDraft | null>(null);
  const [restored, setRestored] = useState<{ draft: CardFormDraft; key: number } | null>(null);
  // The save the open sheet is waiting on; closing during its picture step lets it go.
  const attempt = useRef(0);

  const close = (keepWork: boolean, saved = false) => {
    // The card write holds the sheet until it answers.
    if (phase.status === "saving" && !saved) return;
    // Once the card is written, the sheet can go and the save finishes on its own.
    const written = phase.status === "finishing";
    if (written) attempt.current++;
    dispatch({ type: "close", saved });
    const work = draft.current;
    const edited = card;
    draft.current = null;
    setRestored(null);
    onOpenChange(false);
    if (written || !keepWork || !work || !edited || !hasChanges(edited, work)) return;
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
    const id = ++attempt.current;
    dispatch({ type: "save" });
    try {
      const patch = cardPatch(card, values);
      const { card: written, queued } = Object.keys(patch).length
        ? await writes.updateCard(card, patch)
        : { card, queued: false };
      dispatch({ type: "written" });
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
      // Closed while the picture was on the way, the sheet is already gone.
      if (id === attempt.current) close(false, true);
      return undefined;
    } catch (e) {
      // Whatever landed before the failure stays; saving again sends only what is still different.
      await refreshAfterCardWrite(qc, card.id);
      return { status: "failed", message: errorMessage(e) };
    } finally {
      dispatch({ type: "settle" });
    }
  };

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && close(true)}>
      <DialogContent
        size="lg"
        finalFocus={finalFocus}
        className="max-h-[92dvh] [scrollbar-color:var(--edge-strong)_transparent] [scrollbar-width:thin]"
      >
        <DialogTitle>{t`Edit card`}</DialogTitle>
        {shown && (
          <CardForm
            key={`${shown.id}:${restored?.key ?? 0}`}
            mode="edit"
            card={shown}
            draft={card ? restored?.draft : undefined}
            decks={decks}
            pending={phase.status === "saving" || phase.status === "finishing"}
            held={phase.status === "saving"}
            layout={shape === "desktop" ? "whole" : "chips"}
            focus={focus}
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
