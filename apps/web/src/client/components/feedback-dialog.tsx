import { Trans, useLingui } from "@lingui/react/macro";
import {
  FEEDBACK_DAILY_LIMIT,
  FEEDBACK_MESSAGE_MAX,
  FeedbackInput,
  type FeedbackKind,
} from "@lymi/core";
import { useMutation } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { Bug, Check, CircleAlert, Ellipsis, Lightbulb } from "lucide-react";
import { useRef, useState } from "react";
import { ApiError, api } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { isAppLanguage } from "../lib/i18n";
import { Button } from "./button";
import { Segmented } from "./segmented";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Textarea } from "./ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Where a learner writes to Lymi without leaving it. The note is kept whatever the send does, so a
 * failure stands in the dialog with the text still in the box and the address to write to instead.
 */
export function FeedbackDialog({ open, onOpenChange }: Props) {
  const { t, i18n } = useLingui();
  const screen = useRouterState({ select: (state) => state.location.pathname });
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const send = useMutation({ mutationFn: (input: FeedbackInput) => api.sendFeedback(input) });
  const overDailyLimit = send.error instanceof ApiError && send.error.status === 409;

  const close = () => {
    onOpenChange(false);
    // A sent note leaves an empty form behind; an unsent one is still there to try again.
    if (send.isSuccess) {
      setMessage("");
      setKind("bug");
    }
    send.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="w-[min(92vw,460px)]">
        {send.isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>{t`Feedback sent`}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3" role="status">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-good-soft text-good"
                aria-hidden="true"
              >
                <Check className="size-4" />
              </span>
              <p className="text-base text-text-2 text-pretty">
                <Trans>Thank you. Replies come to your email.</Trans>
              </p>
            </div>
            <DialogFooter>
              <Button variant="primary" onClick={close}>
                <Trans>Close</Trans>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t`Send feedback`}</DialogTitle>
              <DialogDescription>
                <Trans>
                  Tell Lymi what broke or what it should do. Replies come to your email.
                </Trans>
              </DialogDescription>
            </DialogHeader>
            <form
              ref={formRef}
              className="grid gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (send.isPending) return;
                const language = isAppLanguage(i18n.locale) ? i18n.locale : "en";
                const parsed = FeedbackInput.safeParse({ kind, message, screen, language });
                if (!parsed.success) {
                  setInvalid(
                    fieldErrors(parsed.error, {
                      message: message.trim()
                        ? t`Keep the message under ${FEEDBACK_MESSAGE_MAX} characters.`
                        : t`Write what you want to tell Lymi.`,
                    }),
                  );
                  focusFirstInvalid(formRef.current);
                  return;
                }
                setInvalid({});
                send.mutate(parsed.data);
              }}
            >
              <div className="grid gap-1.5">
                <span className="text-sm font-medium text-text-2">
                  <Trans>What this is about</Trans>
                </span>
                <Segmented<FeedbackKind>
                  label={t`What this is about`}
                  value={kind}
                  onValueChange={setKind}
                  disabled={send.isPending}
                  options={[
                    {
                      value: "bug",
                      label: (
                        <>
                          <Bug className="size-4" aria-hidden="true" />
                          <Trans>Bug</Trans>
                        </>
                      ),
                    },
                    {
                      value: "idea",
                      label: (
                        <>
                          <Lightbulb className="size-4" aria-hidden="true" />
                          <Trans>Idea</Trans>
                        </>
                      ),
                    },
                    {
                      value: "other",
                      label: (
                        <>
                          <Ellipsis className="size-4" aria-hidden="true" />
                          <Trans>Something else</Trans>
                        </>
                      ),
                    },
                  ]}
                />
              </div>
              <Field>
                <FieldLabel>{t`Message`}</FieldLabel>
                <Textarea
                  value={message}
                  maxLength={FEEDBACK_MESSAGE_MAX}
                  disabled={send.isPending}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setInvalid(({ message: _, ...rest }) => rest);
                  }}
                />
                {invalid.message && <FieldError>{invalid.message}</FieldError>}
              </Field>
              <p className="text-sm text-muted text-pretty">
                <Trans>
                  Lymi also gets the screen you are on, the app version, your browser and your app
                  language.
                </Trans>
              </p>
              {send.isError && (
                <div
                  role="alert"
                  className="grid gap-1 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-text-2"
                >
                  <span className="flex items-center gap-2 font-medium text-danger">
                    <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                    {t`Couldn’t send your feedback`}
                  </span>
                  <p className="text-pretty">
                    {overDailyLimit ? (
                      <Trans>
                        You can send {FEEDBACK_DAILY_LIMIT} messages a day. Try again tomorrow.
                      </Trans>
                    ) : (
                      <Trans>
                        Your message is still here. Try again, or write to{" "}
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
                <Button type="button" variant="ghost" onClick={close}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button type="submit" variant="primary" loading={send.isPending}>
                  <Trans>Send</Trans>
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
