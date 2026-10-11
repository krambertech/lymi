import { Trans, useLingui } from "@lingui/react/macro";
import { CARD_LIMITS, headword } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { type ComponentProps, useId, useRef, useState } from "react";
import { type Card, errorMessage, type QueueItem } from "../lib/api";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { useOverlayShape } from "../lib/device";
import { writes } from "../lib/writes";
import { Button } from "./button";
import { InlineError } from "./inline-error";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Textarea } from "./ui/textarea";
import { toast } from "./ui/toast";

interface Props {
  /** The card on screen; the sheet is open while `open` says so. */
  item: QueueItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The hook is on the card; the sheet closes with its toast. */
  onSaved?: (() => void) | undefined;
  /** Where focus goes on closing, since the offer that opened the sheet leaves with it. */
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"];
}

/**
 * A memory hook the learner writes for the card on screen. A drawer on touch and a centred dialog
 * on a desktop, with the title pinned and the actions at the foot. Undo in the toast takes it off.
 */
export function HookSheet({ item, open, onOpenChange, onSaved, finalFocus }: Props) {
  // Held while the sheet closes, so its contents do not vanish mid-animation.
  const [shown, setShown] = useState(item);
  if (item && item !== shown) setShown(item);
  const titleId = useId();
  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        finalFocus={finalFocus}
        // The title, so a drawer settles before the field asks for the keyboard, overlays.md.
        initialFocus={() => document.getElementById(titleId)}
      >
        {shown && (
          <HookForm
            key={shown.card.id}
            item={shown}
            titleId={titleId}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  item: QueueItem;
  titleId: string;
  onClose: () => void;
  onSaved?: (() => void) | undefined;
}

function HookForm({ item, titleId, onClose, onSaved }: FormProps) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const shape = useOverlayShape(true);
  const { card, mode } = item;
  const [hook, setHook] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const term = headword(card.term);
  const cue = mode.cue === "meaning" ? (card.meaning ?? card.term) : card.term;
  const cueLanguage = mode.cue === "term" ? (card.language ?? undefined) : undefined;

  const undo = async (written: Card) => {
    toast.close(`hook-${written.id}`);
    try {
      await writes.updateCard(written, { hook: "" });
    } catch (e) {
      toast.add({ type: "error", title: errorMessage(e) });
    }
    await refreshAfterCardWrite(qc, written.id);
  };

  const submit = async () => {
    const text = hook.trim();
    if (!text) {
      setError(t`Write a hook.`);
      field.current?.focus();
      return;
    }
    setFailure(null);
    setPending(true);
    try {
      const { card: written, queued } = await writes.updateCard(card, {
        hook: text,
        hookSource: "manual",
      });
      toast.add({
        id: `hook-${card.id}`,
        title: queued ? t`Saved on this device until Lymi can be reached.` : t`Hook added`,
        actionProps: { children: t`Undo`, onClick: () => void undo(written) },
      });
      onClose();
      onSaved?.();
      // Not awaited, so the sheet closes with the toast and the hook lands on the card in view.
      void refreshAfterCardWrite(qc, card.id);
    } catch (e) {
      setFailure(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      noValidate
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) void submit();
      }}
    >
      <DialogTitle id={titleId} tabIndex={-1} className="text-balance">
        <Trans>
          A memory hook for <span lang={card.language ?? undefined}>{term}</span>
        </Trans>
      </DialogTitle>
      <DialogDescription className="-mt-2 text-pretty">
        {mode.cue === "image" ? (
          <Trans>Think of it when the card shows its picture.</Trans>
        ) : (
          <Trans>
            Think of it when the card shows “<span lang={cueLanguage}>{cue}</span>”.
          </Trans>
        )}
      </DialogDescription>
      <Field invalid={!!error}>
        <FieldLabel>{t`Memory hook`}</FieldLabel>
        <Textarea
          ref={field}
          rows={2}
          value={hook}
          maxLength={CARD_LIMITS.hook}
          placeholder={t`A sound-alike, or something to picture`}
          onChange={(e) => {
            setHook(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            // A hook is one phrase, so Enter keeps it; Shift Enter still breaks the line.
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          autoComplete="off"
          enterKeyHint="done"
        />
        <FieldDescription>
          <Trans>
            Peek at it before you reveal the card, or show it after. After a peek, you can’t choose
            Easy.
          </Trans>
        </FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>
      <p role="status" className="text-sm empty:hidden">
        {failure && <InlineError>{failure}</InlineError>}
      </p>
      <DialogFooter
        className={cn(
          "sticky z-10 bg-plate",
          shape === "desktop"
            ? "-bottom-5 -mx-5 -mb-5 px-5 pt-3 pb-5"
            : "bottom-0 -mx-4 -mb-5 px-4 pt-3 pb-5",
        )}
      >
        <Button variant="ghost" onClick={onClose}>
          <Trans>Not now</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending} aria-disabled={pending}>
          <Trans>Save hook</Trans>
        </Button>
      </DialogFooter>
    </form>
  );
}
