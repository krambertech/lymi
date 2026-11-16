import { useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { isolate } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useReducer, useRef, useState } from "react";
import type { Card } from "../lib/api";
import { errorMessage } from "../lib/api";
import { addInput, refreshAfterCardWrite, savePicture } from "../lib/card-writes";
import { useOverlayShape } from "../lib/device";
import { createMoreChosen, rememberCreateMore, rememberDeck } from "../lib/last-deck";
import { decksQuery } from "../lib/queries";
import { sheetPhase } from "../lib/sheet-phase";
import { shortQuote } from "../lib/short-quote";
import {
  CardForm,
  type CardFormDraft,
  type CardFormOutcome,
  type CardFormValues,
  draftHasWork,
} from "./card-form";
import { EditCardSheet } from "./edit-card-sheet";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { toast } from "./ui/toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselect a deck, e.g. when opened from a deck page. */
  deckId?: string | undefined;
  /** Preselect a section of that deck. */
  sectionId?: string | undefined;
  /** Start from a term typed elsewhere. */
  term?: string | undefined;
  /** A word needs a deck to land in, so the first run offers to make one. */
  onCreateDeck?: (() => void) | undefined;
}

/** Quick capture: term, meaning and deck, with the rest of the card one tap away. */
export function AddCardSheet({ open, onOpenChange, deckId, sectionId, term, onCreateDeck }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const decks = useQuery(decksQuery);
  const shape = useOverlayShape(open);
  const [phase, dispatch] = useReducer(sheetPhase, { status: open ? "editing" : "closed" });
  if (open && phase.status === "closed") dispatch({ type: "open" });
  if (!open && phase.status === "editing") dispatch({ type: "close" });
  const [createMore, setCreateMore] = useState(createMoreChosen);
  // The form as it stood, so a sheet closed by mistake can come back with Undo.
  const draft = useRef<CardFormDraft | null>(null);
  const [restored, setRestored] = useState<{ draft: CardFormDraft; key: number } | null>(null);
  // A card added without its picture, opened in the edit sheet to try the picture again.
  const [pictureFor, setPictureFor] = useState<Card | null>(null);
  const [pictureMissing, setPictureMissing] = useState<Card | null>(null);
  // The save the open sheet is waiting on; closing during its picture step lets it go.
  const attempt = useRef(0);

  const close = (keepWork: boolean, saved = false) => {
    // The card write holds the sheet until it answers.
    if (phase.status === "saving" && !saved) return;
    // Once the card is in, the sheet can go and the save finishes on its own, with nothing to undo.
    const written = phase.status === "finishing";
    if (written) attempt.current++;
    dispatch({ type: "close", saved });
    const work = draft.current;
    draft.current = null;
    // A brought-back draft is for the one reopening Undo makes, not every opening after it.
    setRestored(null);
    onOpenChange(false);
    if (written || !keepWork || !work || !draftHasWork(work)) return;
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
    const id = ++attempt.current;
    dispatch({ type: "save" });
    try {
      const { outcome, queued } = await writes.addCard(addInput(values));
      if (outcome.status === "skipped") {
        return {
          status: "skipped",
          term: shortQuote(outcome.existing.term),
          deckName: outcome.deckName,
        };
      }
      rememberDeck(values.deckId);
      dispatch({ type: "written" });
      // The card is in either way; a refused picture is said beside it, not instead of it.
      let pictureError: string | undefined;
      // A picture is uploaded to the card on the server, so one chosen offline waits for the learner.
      const picked = values.picture.kind === "file" || values.picture.kind === "link";
      if (queued && picked)
        pictureError = t`Pictures need a connection. Add it once you’re back online.`;
      else if (!queued) {
        await savePicture(outcome.card, values).catch((e: unknown) => {
          pictureError = errorMessage(e);
        });
      }
      // The card already shows where it was added, so the sheet answers without waiting on the lists.
      void refreshAfterCardWrite(qc);
      const term = shortQuote(outcome.card.term);
      setPictureMissing(pictureError ? outcome.card : null);
      // Closed while the picture was on the way: the toast below is all that is left to say.
      const waited = id === attempt.current;
      if (createMore && waited) return { status: "added", term, pictureError };
      if (waited) close(false, true);
      if (!pictureError) {
        toast.add({
          title: queued
            ? t`Added “${{ term: isolate(term) }}”. It’s saved on this device until Lymi can be reached.`
            : t`Added “${{ term: isolate(term) }}”`,
        });
        return undefined;
      }
      const card = outcome.card;
      toast.add({
        id: "picture-missing",
        title: t`Added “${{ term: isolate(term) }}” without its picture. ${pictureError}`,
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
      dispatch({ type: "settle" });
    }
  };

  const pictureSheet = (
    <EditCardSheet
      card={pictureFor}
      decks={decks.data}
      focus="picture"
      onOpenChange={() => setPictureFor(null)}
      onReopen={setPictureFor}
    />
  );

  return (
    <>
      {!open && pictureSheet}
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close(true))}>
        <DialogContent
          size="lg"
          className="max-h-[92dvh] [scrollbar-color:var(--edge-strong)_transparent] [scrollbar-width:thin]"
        >
          <DialogTitle>{t`Add a card`}</DialogTitle>
          <CardForm
            key={
              open
                ? `open:${deckId ?? "default"}:${sectionId ?? ""}:${term ?? ""}:${restored?.key ?? 0}`
                : "closed"
            }
            mode="add"
            decks={decks.data}
            deckId={deckId}
            sectionId={sectionId}
            term={term}
            draft={open ? restored?.draft : undefined}
            pending={phase.status === "saving" || phase.status === "finishing"}
            held={phase.status === "saving"}
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
