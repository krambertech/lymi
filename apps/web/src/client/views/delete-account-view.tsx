import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { AccountDeletionOut } from "@lymi/core";
import { Download, Trash2 } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Button } from "../components/button";
import { ErrorState } from "../components/empty-state";
import { InlineError } from "../components/inline-error";
import { Screen } from "../components/layout/screen";
import { SettingsGroup } from "../components/settings-group";
import { Skeleton } from "../components/skeleton";
import { Field, FieldDescription, FieldError, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";

export interface DeleteAccountProps {
  /** Undefined while it loads. */
  summary: AccountDeletionOut | undefined;
  loadError?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
  onExportLibrary?: (() => void) | undefined;
  /** The address the code went to, once it was sent. */
  sentTo: string | null;
  onSendCode: () => void;
  sending: boolean;
  sendError: string | null;
  onDelete: (code: string) => void;
  deleting: boolean;
  /** Why the code was refused, or why the delete failed. */
  deleteError: string | null;
}

/**
 * Ending the account, from Settings. A page rather than a dialog, so what goes and what stays are
 * read before anything is sent; the emailed code is the confirmation. Proposal: account-deletion.md.
 */
export function DeleteAccountView({
  summary,
  loadError,
  onRetry,
  retrying,
  onExportLibrary,
  sentTo,
  onSendCode,
  sending,
  sendError,
  onDelete,
  deleting,
  deleteError,
}: DeleteAccountProps) {
  const { t } = useLingui();
  return (
    <Screen
      title={t`Delete account`}
      width="md"
      back={{ label: t`Settings`, to: "/settings" }}
      backOnDesktop
    >
      {loadError && !summary ? (
        <ErrorState
          title={<Trans>Couldn’t load what your account holds</Trans>}
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : !summary ? (
        <div className="grid gap-3 pb-6">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-5 w-1/2 rounded-md" />
          <Skeleton className="mt-4 h-24 w-full rounded-lg" />
        </div>
      ) : summary.blocked === "publisher" ? (
        <SettingsGroup title={t`This is a Lymi publisher account`}>
          <p className="max-w-[60ch] text-base text-ink-secondary">
            <Trans>
              It publishes the decks in Explore, so it can’t be deleted here. Write to{" "}
              <a className="font-medium text-ink underline" href="mailto:hello@lymi.app">
                hello@lymi.app
              </a>{" "}
              to delete it.
            </Trans>
          </p>
        </SettingsGroup>
      ) : (
        <>
          <WhatGoes summary={summary} />
          {summary.sharedDecks.length > 0 && <WhatStays decks={summary.sharedDecks} />}
          <SettingsGroup
            title={t`Keep a copy`}
            description={t`Export your library before deleting your account to keep a copy of your cards.`}
          >
            <Button
              className="justify-self-start"
              onClick={onExportLibrary}
              aria-disabled={!onExportLibrary}
            >
              <Download data-icon="inline-start" aria-hidden="true" />
              <Trans>Export library</Trans>
            </Button>
          </SettingsGroup>
          <Confirm
            apple={summary.confirmWith === "apple"}
            sentTo={sentTo}
            onSendCode={onSendCode}
            sending={sending}
            sendError={sendError}
            onDelete={onDelete}
            deleting={deleting}
            deleteError={deleteError}
          />
        </>
      )}
    </Screen>
  );
}

function WhatGoes({ summary }: { summary: AccountDeletionOut }) {
  const { t, i18n } = useLingui();
  return (
    <SettingsGroup
      title={t`Your account data`}
      description={t`Deleting your account removes your private decks, cards and review history. You can’t undo this.`}
    >
      <dl className="grid grid-cols-3 gap-3">
        <Count label={t`Decks`}>{i18n.number(summary.decks)}</Count>
        <Count label={t`Cards`}>{i18n.number(summary.cards)}</Count>
        <Count label={t`Reviews`}>{i18n.number(summary.reviews)}</Count>
      </dl>
      <p className="max-w-[60ch] text-sm text-ink-muted">
        <Trans>
          Archived decks and cards go too, with your settings, photo, connected apps and API keys.
          You leave every deck you joined, and every device is signed out.
        </Trans>
      </p>
    </SettingsGroup>
  );
}

function Count({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 rounded-lg bg-plate px-4 py-3 edge">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-lg font-medium text-ink tabular-nums">{children}</dd>
    </div>
  );
}

function WhatStays({ decks }: { decks: AccountDeletionOut["sharedDecks"] }) {
  const { t } = useLingui();
  return (
    <SettingsGroup
      title={t`Decks other people review`}
      description={t`Each person who reviews these decks keeps their own copy, with their progress and without your name. To take a deck away from them, archive it first. Archived decks go with your account.`}
    >
      <ul className="grid">
        {decks.map((deck) => (
          <li
            key={deck.id}
            className="flex items-baseline justify-between gap-4 border-t border-edge py-3 first:border-t-0 first:pt-0"
          >
            <span dir="auto" className="min-w-0 truncate text-base text-ink">
              {deck.name}
            </span>
            <span className="shrink-0 text-sm text-ink-muted">
              <Plural value={deck.members} one="# person" other="# people" />
            </span>
          </li>
        ))}
      </ul>
      {decks.some((deck) => deck.published) && (
        <p className="max-w-[60ch] text-sm text-ink-muted">
          <Trans>Published decks leave Explore, so nobody new can add them.</Trans>
        </p>
      )}
    </SettingsGroup>
  );
}

function Confirm({
  apple,
  sentTo,
  onSendCode,
  sending,
  sendError,
  onDelete,
  deleting,
  deleteError,
}: Pick<
  DeleteAccountProps,
  "sentTo" | "onSendCode" | "sending" | "sendError" | "onDelete" | "deleting" | "deleteError"
> & { apple: boolean }) {
  const { t } = useLingui();
  const [code, setCode] = useState("");
  const [formatError, setFormatError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (deleting) return;
    const trimmed = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(trimmed)) {
      setFormatError(t`Enter the 6-digit code from the email.`);
      return;
    }
    setFormatError(null);
    onDelete(trimmed);
  };

  // A code delete cannot revoke Apple's grant; only the phone's Apple sheet can.
  const appleNote = apple && (
    <p className="max-w-[60ch] text-sm text-ink-muted">
      <Trans>
        You sign in with Apple, so once the account is deleted, also remove Lymi under Sign in with
        Apple in your Apple Account settings.
      </Trans>
    </p>
  );

  if (!sentTo) {
    return (
      <SettingsGroup
        title={t`Confirm it’s you`}
        description={t`We’ll email you a 6-digit code. Enter it below, then choose Delete account.`}
      >
        <Button
          className="justify-self-start"
          onClick={onSendCode}
          loading={sending}
          aria-disabled={sending}
        >
          <Trans>Send code</Trans>
        </Button>
        {appleNote}
        {sendError && (
          <p className="text-sm" role="alert">
            <InlineError>{sendError}</InlineError>
          </p>
        )}
      </SettingsGroup>
    );
  }

  return (
    <SettingsGroup title={t`Confirm it’s you`}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field className="max-w-sm">
          <FieldLabel>{t`Code from the email`}</FieldLabel>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="max-w-56 tabular-nums tracking-widest"
            autoFocus
          />
          <FieldDescription>
            <Trans>Sent to {sentTo}. It works for 15 minutes.</Trans>
          </FieldDescription>
          <FieldError>{formatError ?? deleteError}</FieldError>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="danger" loading={deleting} aria-disabled={deleting}>
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            <Trans>Delete account</Trans>
          </Button>
          <Button
            variant="ghost"
            onClick={onSendCode}
            loading={sending}
            aria-disabled={sending || deleting}
          >
            <Trans>Send a new code</Trans>
          </Button>
        </div>
        {appleNote}
        {sendError && (
          <p className="text-sm" role="alert">
            <InlineError>{sendError}</InlineError>
          </p>
        )}
      </form>
    </SettingsGroup>
  );
}
