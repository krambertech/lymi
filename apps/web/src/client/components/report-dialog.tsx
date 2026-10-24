import { Trans, useLingui } from "@lingui/react/macro";
import {
  CONTENT_REPORT_DAILY_LIMIT,
  CONTENT_REPORT_NOTE_MAX,
  type ContentReportReason,
  type ContentReportTarget,
  isolate,
} from "@lymi/core";
import { useMutation } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import { ApiError, api } from "../lib/api";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";
import { toast } from "./ui/toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ContentReportTarget;
  /** The deck's name or the card's term, as the title names it. */
  name: string;
}

/**
 * Where a learner tells Lymi a deck or card someone else wrote breaks the rules. One sheet: a
 * reason, an optional note, Send. A sent report closes with a toast; a failed one keeps the form.
 */
export function ReportDialog({ open, onOpenChange, target, name }: Props) {
  const { t } = useLingui();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t`Report “${isolate(name)}”`}</DialogTitle>
          <DialogDescription>
            <Trans>We read every report within a day. The owner isn’t told who sent it.</Trans>
          </DialogDescription>
        </DialogHeader>
        <ReportForm
          target={target}
          onSent={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** The form mounts with the open dialog, so each opening starts empty and nothing sends while closed. */
function ReportForm({
  target,
  onSent,
  onCancel,
}: {
  target: ContentReportTarget;
  onSent: () => void;
  onCancel: () => void;
}) {
  const { t } = useLingui();
  const [reason, setReason] = useState<ContentReportReason | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);

  const send = useMutation({
    mutationFn: (chosen: ContentReportReason) =>
      api.reportContent({ target, reason: chosen, note: note.trim() || undefined }),
    onSuccess: () => {
      onSent();
      toast.add({ title: t`Report sent. We’ll look within a day.`, actionProps: undefined });
    },
  });
  const overDailyLimit = send.error instanceof ApiError && send.error.status === 409;

  const reasons: { value: ContentReportReason; label: string }[] = [
    { value: "offensive", label: t`Hateful or offensive` },
    { value: "sexual", label: t`Sexual content` },
    { value: "harassment", label: t`Harassment or bullying` },
    { value: "spam", label: t`Spam or a scam` },
    { value: "other", label: t`Something else` },
  ];

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (send.isPending) return;
        if (!reason) {
          setMissing(true);
          return;
        }
        send.mutate(reason);
      }}
    >
      <FieldSet>
        <FieldLegend variant="label">{t`What’s wrong`}</FieldLegend>
        <RadioGroup
          value={reason}
          onValueChange={(value) => {
            setReason(value as ContentReportReason);
            setMissing(false);
          }}
          disabled={send.isPending}
          aria-invalid={missing || undefined}
          className="gap-0"
        >
          {reasons.map((option) => (
            <Field key={option.value} orientation="horizontal" className="min-h-11">
              <RadioGroupItem value={option.value} />
              <FieldLabel className="text-base text-text">{option.label}</FieldLabel>
            </Field>
          ))}
        </RadioGroup>
        {missing && (
          <p role="alert" className="text-sm text-danger">
            <Trans>Choose what’s wrong with it.</Trans>
          </p>
        )}
      </FieldSet>
      <Field>
        <FieldLabel>{t`Note`}</FieldLabel>
        <Textarea
          value={note}
          maxLength={CONTENT_REPORT_NOTE_MAX}
          disabled={send.isPending}
          onChange={(e) => setNote(e.target.value)}
        />
        <FieldDescription>{t`Optional. Anything that helps us understand.`}</FieldDescription>
      </Field>
      {send.isError && (
        <div
          role="alert"
          className="grid gap-1 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-text-2"
        >
          <span className="flex items-center gap-2 font-medium text-danger">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t`Couldn’t send your report`}
          </span>
          <p className="text-pretty">
            {overDailyLimit ? (
              <Trans>
                You can send {CONTENT_REPORT_DAILY_LIMIT} reports a day. Write to hello@lymi.app if
                this can’t wait.
              </Trans>
            ) : (
              <Trans>
                Try again, or write to{" "}
                <a className="font-medium underline" href="mailto:hello@lymi.app">
                  hello@lymi.app
                </a>
                .
              </Trans>
            )}
          </p>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
        <Button type="submit" variant="primary" loading={send.isPending}>
          <Trans>Send report</Trans>
        </Button>
      </DialogFooter>
    </form>
  );
}
