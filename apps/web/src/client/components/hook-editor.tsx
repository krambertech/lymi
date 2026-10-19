import { Trans, useLingui } from "@lingui/react/macro";
import { writes } from "@lymi/client/writes";
import { CARD_LIMITS, hookable } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Anchor, Loader2, Sparkle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type Card, errorMessage } from "../lib/api";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { composing } from "../lib/composing";
import { settingsQuery } from "../lib/queries";
import { captureAnalytics } from "../lib/telemetry";
import { Button, IconButton } from "./button";
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
 * puts back the hook the card had. Draft a hook asks the AI for one and puts it in the field to
 * edit; while the field still holds that draft, the button asks for another.
 */
export function HookEditor({ card, onCancel, onSaved }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [text, setText] = useState(card.hook ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const [drafted, setDrafted] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  // What the field holds now, read when a draft lands after the learner may have typed.
  const latest = useRef(text);
  latest.current = text;
  const settings = useQuery(settingsQuery);
  const empty = !text.trim();
  const untouched = drafted !== null && text === drafted;
  // Only where the server drafts at all, and never over the learner's own words.
  const draftable =
    !!settings.data &&
    hookable(card, settings.data.meaningLanguage) &&
    (empty || untouched || drafting);

  const draft = async () => {
    const before = latest.current;
    setDrafting(true);
    setDraftNote(null);
    setProblem(null);
    const started = performance.now();
    const waited = () => Math.min(60_000, Math.round(performance.now() - started));
    try {
      const { hook } = await api.draftHook(card.id);
      captureAnalytics("hook_drafted", { outcome: hook ? "drafted" : "none", wait_ms: waited() });
      // Words typed while the draft was on its way are the learner's, so the draft gives way.
      if (latest.current !== before) return;
      if (hook) {
        setText(hook);
        setDrafted(hook);
        setProblem(null);
        field.current?.focus();
      } else {
        setDraftNote(t`No strong hook for this one. Try again, or write your own.`);
      }
    } catch {
      captureAnalytics("hook_drafted", { outcome: "failed", wait_ms: waited() });
      setDraftNote(t`Couldn’t draft a hook. Try again in a moment.`);
    } finally {
      setDrafting(false);
    }
  };

  useEffect(() => {
    const node = field.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    node.setSelectionRange(node.value.length, node.value.length);
  }, []);

  const undo = async (written: Card, before: string | null, source: Card["hookSource"]) => {
    toast.close(`hook-${written.id}`);
    try {
      // A lesson or learner's hook comes back with its source. The AI's own cannot be claimed by a
      // client, so the server derives it again from the draft it kept, where it has one.
      await writes.updateCard(written, {
        hook: before ?? "",
        ...(source && source !== "ai" ? { hookSource: source } : {}),
      });
    } catch (e) {
      toast.add({ type: "error", title: errorMessage(e) });
    }
    await refreshAfterCardWrite(qc, written.id);
  };

  const save = async () => {
    const hook = text.trim();
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
        actionProps: {
          children: t`Undo`,
          onClick: () => void undo(written, card.hook, card.hookSource),
        },
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
      className="@container relative z-20 grid gap-1 rounded-md bg-plate-2 ps-3 pe-1.5 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-150 focus-within:outline-edge-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) void save();
      }}
    >
      <div className="flex items-start gap-1">
        <label className="flex min-w-0 flex-1 items-start gap-2 pe-1.5">
          <Anchor className="mt-[3px] size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">{t`Memory hook`}</span>
          <textarea
            ref={field}
            rows={1}
            value={text}
            maxLength={CARD_LIMITS.hook}
            placeholder={t`A sound-alike, or something to picture`}
            aria-invalid={!!problem || undefined}
            onChange={(e) => {
              setText(e.target.value);
              setProblem(null);
              setDraftNote(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                // The review leaves on Escape; here it only closes the editor.
                e.preventDefault();
                e.stopPropagation();
                onCancel();
                return;
              }
              // A hook is one phrase, so Enter keeps it; Shift Enter still breaks the line.
              if (e.key !== "Enter" || e.shiftKey || composing(e)) return;
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }}
            autoComplete="off"
            enterKeyHint="done"
            className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent text-md leading-snug text-text outline-none placeholder:text-faint"
          />
        </label>
        {/* The field's own helper, so the foot keeps two actions: labelled while the field is empty, an icon once a draft is in. */}
        {draftable &&
          (untouched ? (
            <IconButton
              size="sm"
              label={t`Another draft`}
              aria-busy={drafting || undefined}
              aria-disabled={drafting || undefined}
              className="-my-1.5"
              onClick={() => void draft()}
            >
              {drafting ? <Loader2 className="animate-spin" /> : <Sparkle />}
            </IconButton>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              aria-label={t`Draft a hook`}
              loading={drafting}
              aria-disabled={drafting}
              className="-my-1.5"
              onClick={() => {
                if (!drafting) void draft();
              }}
            >
              <Sparkle data-icon="inline-start" aria-hidden="true" />
              <Trans>Draft</Trans>
            </Button>
          ))}
      </div>
      {/* A narrow card puts the status on its own line, so Save never leaves the edge. */}
      <div className="flex flex-wrap items-center justify-end gap-1 ps-6">
        <p
          role="status"
          // A note wraps rather than lose its second half beside the buttons.
          className={`min-w-0 basis-full text-xs text-muted empty:hidden @md:flex-1 @md:basis-0 @md:empty:invisible @md:empty:block ${draftNote ? "" : "@md:truncate"}`}
        >
          {problem ? (
            <InlineError>{problem}</InlineError>
          ) : drafting ? (
            <Trans>Drafting a hook…</Trans>
          ) : draftNote ? (
            draftNote
          ) : untouched ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkle className="size-3.5 shrink-0" aria-hidden="true" />
              <Trans>AI draft</Trans>
            </span>
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
