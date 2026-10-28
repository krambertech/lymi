import { Trans, useLingui } from "@lingui/react/macro";
import { refusedForAiConsent } from "@lymi/client/ai-consent";
import { writes } from "@lymi/client/writes";
import { CARD_LIMITS, hintable } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type Card, errorMessage } from "../lib/api";
import { refreshAfterCardWrite } from "../lib/card-writes";
import { composing } from "../lib/composing";
import { settingsQuery } from "../lib/queries";
import { captureAnalytics } from "../lib/telemetry";
import { Button } from "./button";
import { HintIcon } from "./hint-icon";
import { InlineError } from "./inline-error";
import { toast } from "./ui/toast";

interface Props {
  card: Card;
  /** Closed without saving: Cancel, or Escape in the field. */
  onCancel: () => void;
  /** The hint is on the card; the editor closes with its toast. */
  onSaved: () => void;
}

/**
 * The card's hint, written in its own place under the cue, like a message composer: the
 * field on top and its actions along the foot. Enter saves and Escape lets go. Undo in the toast
 * puts back the hint the card had. Draft a hint asks the AI for one and puts it in the field to
 * edit; while the field still holds that draft, the button asks for another.
 */
export function HintEditor({ card, onCancel, onSaved }: Props) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const [text, setText] = useState(card.hint ?? "");
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
    hintable(card, settings.data.meaningLanguage) &&
    (empty || untouched || drafting);

  const draft = async () => {
    // One ask at a time: each counts against the hourly cap and replaces the draft the server keeps.
    if (drafting) return;
    const before = latest.current;
    setDrafting(true);
    setDraftNote(null);
    setProblem(null);
    const started = performance.now();
    const waited = () => Math.min(60_000, Math.round(performance.now() - started));
    try {
      const { hint } = await api.draftHint(card.id);
      captureAnalytics("hint_drafted", { outcome: hint ? "drafted" : "none", wait_ms: waited() });
      // Words typed while the draft was on its way are the learner's, so the draft gives way.
      if (latest.current !== before) return;
      if (hint) {
        setText(hint);
        setDrafted(hint);
        setProblem(null);
        field.current?.focus();
      } else {
        setDraftNote(t`No strong hint for this one. Try again, or write your own.`);
      }
    } catch (failure) {
      captureAnalytics("hint_drafted", { outcome: "failed", wait_ms: waited() });
      setDraftNote(
        refusedForAiConsent(failure)
          ? t`AI services are off for your account. Turn them on in Settings to draft hints.`
          : t`Couldn’t draft a hint. Try again in a moment.`,
      );
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

  const undo = async (written: Card, before: string | null, source: Card["hintSource"]) => {
    toast.close(`hint-${written.id}`);
    try {
      // A lesson or learner's hint comes back with its source. The AI's own cannot be claimed by a
      // client, so the server derives it again from the draft it kept, where it has one.
      await writes.updateCard(written, {
        hint: before ?? "",
        ...(source && source !== "ai" ? { hintSource: source } : {}),
      });
    } catch (e) {
      toast.add({ type: "error", title: errorMessage(e) });
    }
    await refreshAfterCardWrite(qc, written.id);
  };

  const save = async () => {
    const hint = text.trim();
    if (!hint) {
      setProblem(t`Write a hint.`);
      field.current?.focus();
      return;
    }
    if (hint === card.hint) {
      onCancel();
      return;
    }
    setProblem(null);
    setPending(true);
    try {
      const { card: written, queued } = await writes.updateCard(card, {
        hint,
        hintSource: "manual",
      });
      toast.add({
        id: `hint-${card.id}`,
        title: queued
          ? t`Saved on this device until Lymi can be reached.`
          : card.hint
            ? t`Hint saved`
            : t`Hint added`,
        actionProps: {
          children: t`Undo`,
          onClick: () => void undo(written, card.hint, card.hintSource),
        },
      });
      onSaved();
      // Not awaited, so the editor closes with the toast and the hint lands in its place.
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
      className="@container relative z-20 grid gap-1 rounded-md bg-plate-nested ps-4 pe-1.5 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-150 focus-within:outline-edge-strong"
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) void save();
      }}
    >
      <label className="flex min-w-0 items-start gap-2 pe-2.5">
        <HintIcon className="mt-[3px] size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="sr-only">{t`Hint`}</span>
        <textarea
          ref={field}
          rows={1}
          value={text}
          maxLength={CARD_LIMITS.hint}
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
            // A hint is one phrase, so Enter keeps it; Shift Enter still breaks the line.
            if (e.key !== "Enter" || e.shiftKey || composing(e)) return;
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }}
          autoComplete="off"
          enterKeyHint="done"
          className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent text-md leading-snug text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      {/* Like a composer: the field's helper at the start, the answer to it at the end. */}
      <div className="flex flex-wrap items-center gap-1">
        <p
          role="status"
          // A narrow card puts the status on its own line under the text, a wide one right after Draft; a note wraps rather than lose its end.
          className={`order-first min-w-0 basis-full ps-6 text-xs text-ink-muted empty:hidden @md:order-none @md:flex-1 @md:basis-0 @md:ps-0 @md:empty:block ${draftNote || problem ? "" : "@md:truncate"}`}
        >
          {problem ? <InlineError>{problem}</InlineError> : draftNote ? draftNote : null}
        </p>
        {draftable && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={
              drafting ? t`Drafting a hint…` : untouched ? t`Another draft` : t`Draft a hint`
            }
            // Not `loading`, which centres its spinner: the sparkle's own place keeps it under the life buoy.
            aria-busy={drafting || undefined}
            aria-disabled={drafting}
            // Sits 6 px in like Save, which puts its icon under the life buoy.
            className="-ms-2.5 @md:-order-1"
            onClick={() => void draft()}
          >
            {drafting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkle data-icon="inline-start" aria-hidden="true" />
            )}
            {drafting ? (
              <Trans>Drafting…</Trans>
            ) : untouched ? (
              <Trans>Another draft</Trans>
            ) : (
              <Trans>Draft</Trans>
            )}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="ms-auto" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button size="sm" variant="primary" type="submit" loading={pending} aria-disabled={pending}>
          <Trans>Save</Trans>
        </Button>
      </div>
    </form>
  );
}
