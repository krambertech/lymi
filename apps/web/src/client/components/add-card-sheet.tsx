import { useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type Card, errorMessage } from "../lib/api";
import { addInput, refreshAfterCardWrite, savePicture } from "../lib/card-writes";
import { useOverlayShape } from "../lib/device";
import { createMoreChosen, rememberCreateMore, rememberDeck } from "../lib/last-deck";
import { decksQuery } from "../lib/queries";
import {
  CardForm,
  type CardFormDraft,
  type CardFormOutcome,
  type CardFormValues,
} from "./card-form";
import { EditCardSheet } from "./edit-card-sheet";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { toast } from "./ui/toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string | undefined;
  /** A word needs a deck to land in, so the first run offers to make one. */
  onCreateDeck?: (() => void) | undefined;
}

/** Whether a draft holds anything the learner typed or chose for this card. */
const hasWork = (d: CardFormDraft | null) =>
  !!d &&
  !!(d.term || d.meaning || d.example || d.notes || d.pronunciation || d.picture.kind !== "none");

/** Quick capture: term, meaning and deck, with the rest of the card one tap away. */
export function AddCardSheet({ open, onOpenChange, deckId, onCreateDeck }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const shape = useOverlayShape(open);
  const [pending, setPending] = useState(false);
  const [createMore, setCreateMore] = useState(createMoreChosen);
  // The form as it stood, so a sheet closed by mistake can come back with Undo.
  const draft = useRef<CardFormDraft | null>(null);
  const [restored, setRestored] = useState<{ draft: CardFormDraft; key: number } | null>(null);
  // A card added without its picture, opened in the edit sheet to try the picture again.
  const [pictureFor, setPictureFor] = useState<Card | null>(null);
  const [pictureMissing, setPictureMissing] = useState<Card | null>(null);

  const close = (keepWork: boolean) => {
    const work = draft.current;
    draft.current = null;
    onOpenChange(false);
    if (!keepWork || !hasWork(work) || !work) return;
    toast.add({
      id: "card-discarded",
      title: t`Card discarded`,
      actionProps: {
        children: t`Undo`,
        onClick: () => {
          toast.close("card-discarded");
          setRestored({ draft: work, key: Date.now() });
          onOpenChange(true);
        },
      },
    });
  };

  const submit = async (values: CardFormValues): Promise<CardFormOutcome | undefined> => {
    setPending(true);
    try {
      const outcome = await api.addCard(addInput(values));
      if (outcome.status === "skipped") {
        return { status: "skipped", term: outcome.existing.term, deckName: outcome.deckName };
      }
      rememberDeck(values.deckId);
      // The card is in either way; a refused picture is said beside it, not instead of it.
      let pictureError: string | undefined;
      await savePicture(outcome.card, values).catch((e: unknown) => {
        pictureError = errorMessage(e);
      });
      await refreshAfterCardWrite(qc);
      const term = outcome.card.term;
      setPictureMissing(pictureError ? outcome.card : null);
      if (createMore) return { status: "added", term, pictureError };
      close(false);
      if (!pictureError) {
        toast.add({ title: t`Added “${term}”` });
        return undefined;
      }
      const card = outcome.card;
      toast.add({
        id: "picture-missing",
        title: t`Added “${term}” without its picture. ${pictureError}`,
        actionProps: {
          children: t`Add picture`,
          onClick: () => {
            toast.close("picture-missing");
            setPictureFor(card);
          },
        },
      });
      return undefined;
    } catch (e) {
      return { status: "failed", message: errorMessage(e) };
    } finally {
      setPending(false);
    }
  };

  const pictureSheet = (
    <EditCardSheet
      card={pictureFor}
      decks={decks.data}
      openPicture
      onClose={() => setPictureFor(null)}
      onReopen={setPictureFor}
    />
  );

  return (
    <>
      {!open && pictureSheet}
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close(true))}>
        <DialogContent className="max-h-[92dvh] w-[min(92vw,560px)] [scrollbar-color:var(--edge-2)_transparent] [scrollbar-width:thin]">
          <DialogTitle>{t`Add a card`}</DialogTitle>
          <CardForm
            key={open ? `open:${deckId ?? "default"}:${restored?.key ?? 0}` : "closed"}
            mode="add"
            decks={decks.data}
            deckId={deckId}
            draft={open ? restored?.draft : undefined}
            pending={pending}
            layout={shape === "desktop" ? "whole" : "chips"}
            createMore={createMore}
            onCreateMoreChange={(on) => {
              setCreateMore(on);
              rememberCreateMore(on);
            }}
            onCancel={() => close(true)}
            onCreateDeck={
              onCreateDeck &&
              (() => {
                close(false);
                onCreateDeck();
              })
            }
            onSubmit={submit}
            onDraftChange={(next) => {
              draft.current = next;
            }}
            onRetryPicture={pictureMissing ? () => setPictureFor(pictureMissing) : undefined}
          />
          {/* Opened from inside the sheet with Create more, so it stacks on it. */}
          {open && pictureSheet}
        </DialogContent>
      </Dialog>
    </>
  );
}
