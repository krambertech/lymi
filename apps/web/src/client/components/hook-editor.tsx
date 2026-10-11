import { Trans, useLingui } from "@lingui/react/macro";
import { CARD_LIMITS } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Anchor, Sparkle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Card, errorMessage } from "../lib/api";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { useMouse } from "../lib/device";
import { hookDraftQuery } from "../lib/queries";
import { writes } from "../lib/writes";
import { Button } from "./button";
import { InlineError } from "./inline-error";
import { toast } from "./ui/toast";

interface Props {
  card: Card;
  /** Closed without saving: Cancel, or Escape in the field. */
  onCancel: () => void;
  /** The hook is on the card; the editor closes with its toast. */
  onSaved: () => void;
}

/**
 * The card's memory hook, written in its own place under the cue, like a message composer: the
 * field on top and its actions along the foot. Enter saves and Escape lets go. Undo in the toast
 * puts back the hook the card had. A card with no hook shows the AI's draft as the placeholder;
 * Tab, or saving the empty field, keeps it.
 */
export function HookEditor({ card, onCancel, onSaved }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [text, setText] = useState(card.hook ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const mouse = useMouse();
  const draft = useQuery({ ...hookDraftQuery(card), enabled: !card.hook });
  const drafted = draft.data ?? null;
  const empty = !text.trim();

  useEffect(() => {
    const node = field.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.setSelectionRange(node.value.length, node.value.length);
  }, []);

  const undo = async (written: Card, before: string | null) => {
    toast.close(`hook-${written.id}`);
    try {
      await writes.updateCard(written, { hook: before ?? "" });
    } catch (e) {
      toast.add({ type: "error", title: errorMessage(e) });
    }
    await refreshAfterCardWrite(qc, written.id);
  };

  const save = async () => {
    const hook = text.trim() || drafted || "";
    if (!hook) {
      setProblem(t`Write a hook.`);
      field.current?.focus();
      return;
    }
    if (hook === card.hook) {
      onCancel();
      return;
    }
    setProblem(null);
    setPending(true);
    try {
      const { card: written, queued } = await writes.updateCard(card, {
        hook,
        hookSource: "manual",
      });
      toast.add({
        id: `hook-${card.id}`,
        title: queued
          ? t`Saved on this device until Lymi can be reached.`
          : card.hook
            ? t`Hook saved`
            : t`Hook added`,
        actionProps: { children: t`Undo`, onClick: () => void undo(written, card.hook) },
      });
      onSaved();
      // Not awaited, so the editor closes with the toast and the hook lands in its place.
      void refreshAfterCardWrite(qc, card.id);
    } catch (e) {
      setProblem(errorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      noValidate
      className="relative z-20 grid gap-1 rounded-md bg-plate-2 ps-3 pe-1.5 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-150 focus-within:outline-edge-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) void save();
      }}
    >
      <label className="flex items-start gap-2 pe-1.5">
        <Anchor className="mt-[3px] size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="sr-only">{t`Memory hook`}</span>
        <textarea
          ref={field}
          rows={1}
          value={text}
          maxLength={CARD_LIMITS.hook}
          placeholder={drafted ?? t`A sound-alike, or something to picture`}
          aria-invalid={!!problem || undefined}
          onChange={(e) => {
            setText(e.target.value);
            setProblem(null);
          }}
          onKeyDown={(e) => {
            // Tab on an empty field keeps the AI's draft, as an editor takes a completion.
            if (e.key === "Tab" && !e.shiftKey && empty && drafted) {
              e.preventDefault();
              setText(drafted);
              return;
            }
            if (e.key === "Escape") {
              // The review leaves on Escape; here it only closes the editor.
              e.preventDefault();
              e.stopPropagation();
              onCancel();
              return;
            }
            // A hook is one phrase, so Enter keeps it; Shift Enter still breaks the line.
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          autoComplete="off"
          enterKeyHint="done"
          className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent text-md leading-snug text-text outline-none placeholder:text-faint"
        />
      </label>
      <div className="flex items-center gap-1 ps-6">
        <p role="status" className="min-w-0 flex-1 truncate text-xs text-muted empty:invisible">
          {problem ? (
            <InlineError>{problem}</InlineError>
          ) : empty && drafted ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkle className="size-3.5 shrink-0" aria-hidden="true" />
              {mouse ? <Trans>AI draft · Tab keeps it</Trans> : <Trans>AI draft</Trans>}
            </span>
          ) : empty && draft.isFetching ? (
            <Trans>Drafting a hook…</Trans>
          ) : null}
        </p>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={pending} aria-disabled={pending}>
          <Trans>Save</Trans>
        </Button>
      </div>
    </form>
  );
}
