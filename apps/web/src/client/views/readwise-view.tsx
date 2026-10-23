import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { isolate } from "@lymi/core";
import { RefreshCw } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Button } from "../components/button";
import { DocLink } from "../components/connected-apps-section";
import { InlineError } from "../components/inline-error";
import { Screen } from "../components/layout/screen";
import { SettingsGroup } from "../components/settings-group";
import { Skeleton } from "../components/skeleton";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import type { Readwise } from "../lib/api";
import { useConfirmStep } from "../lib/use-confirm-step";

const TOKEN_PAGE = "https://readwise.io/access_token";

/** A plate of rows with hairlines between them, as Settings lists its import sources. */
const PLATE = "edge grid rounded-xl bg-plate";
const ROW = "border-edge px-4 py-3 [&:not(:first-child)]:border-t";

type DeckChoice = { id: string; name: string; language: string };

interface Props {
  /** Undefined while loading; null when Readwise is not connected. */
  connection: Readwise | null | undefined;
  loadError: boolean;
  onRetry: () => void;
  /** The learner's own decks that have a language, for each language's deck. */
  decks: DeckChoice[];
  onConnect: (token: string) => void;
  connecting: boolean;
  connectError: string | null;
  onFollow: (bookId: string, followed: boolean) => void;
  /** For a book Lymi could not place: the language its highlights are in. */
  onLanguage: (bookId: string, language: string) => void;
  onDeck: (language: string, deckId: string) => void;
  saveError: string | null;
  onPull: () => void;
  pulling: boolean;
  pullError: string | null;
  onDisconnect: () => void;
  disconnecting: boolean;
}

/** A language's name in the app language, capitalised for a label: "Italian", "Італійська". */
function useLanguageName() {
  const { i18n } = useLingui();
  const names = new Intl.DisplayNames([i18n.locale], { type: "language" });
  return (tag: string) => {
    const name = names.of(tag) ?? tag;
    return name.charAt(0).toLocaleUpperCase(i18n.locale) + name.slice(1);
  };
}

export function ReadwiseView(props: Props) {
  const { t } = useLingui();
  const { connection } = props;
  return (
    <Screen
      title={t`Readwise`}
      width="md"
      back={{ label: t`Settings`, to: "/settings" }}
      backOnDesktop
    >
      {connection === undefined && !props.loadError && <Skeleton className="h-40 w-full" />}
      {props.loadError && (
        <div className="grid justify-items-start gap-3">
          <p className="text-sm" role="alert">
            <InlineError>
              <Trans>
                Couldn’t load your Readwise connection. Check your connection and try again.
              </Trans>
            </InlineError>
          </p>
          <Button onClick={props.onRetry}>
            <Trans>Try again</Trans>
          </Button>
        </div>
      )}
      {connection === null && <Connect {...props} />}
      {connection && <Connected {...props} connection={connection} />}
    </Screen>
  );
}

function TokenForm({
  onConnect,
  connecting,
  error,
  label,
  action,
}: {
  onConnect: (token: string) => void;
  connecting: boolean;
  error: string | null;
  label: string;
  action: ReactNode;
}) {
  const [token, setToken] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (token.trim() && !connecting) onConnect(token.trim());
  };
  return (
    <form onSubmit={submit} className={`${PLATE} justify-items-start gap-4 p-5`}>
      <Field invalid={Boolean(error)} className="w-full max-w-md">
        <FieldLabel>{label}</FieldLabel>
        <Input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="font-mono"
        />
        {error ? (
          <FieldError>{error}</FieldError>
        ) : (
          <FieldDescription>
            <Trans>
              Copy it from <DocLink href={TOKEN_PAGE}>readwise.io/access_token</DocLink>.
            </Trans>
          </FieldDescription>
        )}
      </Field>
      <Button
        type="submit"
        variant="primary"
        loading={connecting}
        aria-disabled={connecting || !token.trim()}
      >
        {action}
      </Button>
    </form>
  );
}

function Connect(props: Props) {
  const { t } = useLingui();
  return (
    <>
      <SettingsGroup
        title={t`Connect Readwise`}
        description={t`Each word you highlight in a book in a language you’re learning becomes a card. Lymi checks Readwise every hour.`}
      >
        <TokenForm
          onConnect={props.onConnect}
          connecting={props.connecting}
          error={props.connectError}
          label={t`Readwise token`}
          action={<Trans>Connect</Trans>}
        />
      </SettingsGroup>
      <SettingsGroup title={t`What becomes a card`}>
        <ul className={`${PLATE} text-sm text-text-2`}>
          <li className={ROW}>
            <Trans>A highlight of a word or a short phrase.</Trans>
          </li>
          <li className={ROW}>
            <Trans>
              A longer passage with the word written in its note. The passage becomes the card’s
              example.
            </Trans>
          </li>
          <li className={ROW}>
            <Trans>
              Kindle, Kobo, Apple Books and Readwise Reader all count, once Readwise has them.
            </Trans>
          </li>
        </ul>
      </SettingsGroup>
    </>
  );
}

function LastPull({ connection }: { connection: Readwise }) {
  const { i18n } = useLingui();
  const pull = connection.lastPull;
  if (!pull) {
    return (
      <p className="text-sm text-muted">
        <Trans>Not checked yet. Lymi checks every hour.</Trans>
      </p>
    );
  }
  const at = new Date(pull.at);
  const today = at.toDateString() === new Date().toDateString();
  const when = i18n.date(
    at,
    today
      ? { hour: "numeric", minute: "2-digit" }
      : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
  );
  const { cards, highlights, skipped } = pull;
  return (
    <div className="grid gap-0.5 text-sm">
      <p className="text-text-2">
        {highlights === 0 ? (
          <Trans>Checked at {when}. No new highlights.</Trans>
        ) : (
          <Trans>
            Checked at {when}. <Plural value={cards} one="# new card" other="# new cards" /> from{" "}
            <Plural value={highlights} one="# highlight" other="# highlights" />.
          </Trans>
        )}
      </p>
      {skipped > 0 && (
        <p className="text-muted">
          <Plural
            value={skipped}
            one="# passage had no word in its note."
            other="# passages had no word in their notes."
          />
        </p>
      )}
    </div>
  );
}

function Connected(props: Props & { connection: Readwise }) {
  const { t } = useLingui();
  const { connection } = props;
  const refused = connection.status === "refused";
  const hint = connection.tokenHint;
  return (
    <>
      <SettingsGroup title={t`Connection`}>
        {refused ? (
          <>
            <p className="text-sm" role="alert">
              <InlineError>
                <Trans>Readwise no longer accepts this token. Paste a new one to carry on.</Trans>
              </InlineError>
            </p>
            <TokenForm
              onConnect={props.onConnect}
              connecting={props.connecting}
              error={props.connectError}
              label={t`New Readwise token`}
              action={<Trans>Use this token</Trans>}
            />
          </>
        ) : (
          <div
            className={`${PLATE} flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4`}
          >
            <div className="grid min-w-0 gap-1">
              <p className="text-base font-medium">
                <Trans>
                  Token ending in <span className="font-mono">{hint}</span>
                </Trans>
              </p>
              <LastPull connection={connection} />
            </div>
            <Button
              size="sm"
              loading={props.pulling}
              aria-disabled={props.pulling}
              onClick={props.onPull}
            >
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              <Trans>Check now</Trans>
            </Button>
          </div>
        )}
        {props.pullError && (
          <p className="text-sm" role="alert">
            <InlineError>{props.pullError}</InlineError>
          </p>
        )}
      </SettingsGroup>
      <Decks {...props} />
      <Books {...props} />
      <Disconnect {...props} />
    </>
  );
}

function Decks({ connection, decks, onDeck, saveError }: Props & { connection: Readwise }) {
  const { t } = useLingui();
  const nameOf = useLanguageName();
  return (
    <SettingsGroup title={t`Decks`} description={t`Where each language’s highlights go.`}>
      {connection.languages.length === 0 ? (
        <p className="max-w-[60ch] text-sm text-muted">
          <Trans>
            None of your decks has a language yet. Give a deck one, and highlights in it can come
            in.
          </Trans>
        </p>
      ) : (
        <div className={PLATE}>
          {connection.languages.map(({ language, deckId }) => {
            const items = decks
              .filter((d) => d.language === language)
              .map((d) => ({ value: d.id, label: d.name }));
            return (
              <Field
                key={language}
                orientation="horizontal"
                className={`${ROW} flex-wrap items-center gap-x-4 gap-y-2`}
              >
                <FieldLabel className="min-w-0 flex-1 text-base text-text">
                  {nameOf(language)}
                </FieldLabel>
                <div className="w-full sm:w-56">
                  <Select
                    value={deckId}
                    onValueChange={(v) => {
                      if (v && v !== deckId) onDeck(language, v as string);
                    }}
                    items={items}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t`Choose a deck`} />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>
              </Field>
            );
          })}
        </div>
      )}
      {saveError && (
        <p className="text-sm" role="alert">
          <InlineError>{saveError}</InlineError>
        </p>
      )}
    </SettingsGroup>
  );
}

function Books({ connection, onFollow, onLanguage }: Props & { connection: Readwise }) {
  const { t } = useLingui();
  const nameOf = useLanguageName();
  const learned = new Set(connection.languages.map((l) => l.language));
  const yours = connection.books.filter((b) => b.language && learned.has(b.language));
  const unplaced = connection.books.filter((b) => !b.language);
  const others = connection.books.length - yours.length - unplaced.length;
  return (
    <SettingsGroup
      title={t`Books`}
      description={t`New highlights in the books you turn on become cards. A new book in one of your languages is turned on by itself.`}
    >
      {yours.length === 0 && unplaced.length === 0 ? (
        <p className="max-w-[60ch] text-sm text-muted">
          <Trans>
            No books in a language you’re learning yet. One appears here when you highlight in it.
          </Trans>
        </p>
      ) : yours.length === 0 ? null : (
        <ul className={PLATE}>
          {yours.map((book) => {
            const language = nameOf(book.language ?? "");
            const title = book.title || t`Untitled`;
            return (
              <li key={book.id} className={ROW}>
                <Field orientation="horizontal" className="gap-4">
                  <FieldContent className="min-w-0 gap-0.5">
                    <FieldLabel className="truncate text-base text-text">{title}</FieldLabel>
                    <FieldDescription className="truncate">
                      {book.author ? (
                        <Trans>
                          {isolate(book.author)} · {language} ·{" "}
                          <Plural value={book.highlights} one="# highlight" other="# highlights" />
                        </Trans>
                      ) : (
                        <Trans>
                          {language} ·{" "}
                          <Plural value={book.highlights} one="# highlight" other="# highlights" />
                        </Trans>
                      )}
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    className="self-center"
                    checked={book.followed}
                    onCheckedChange={(on) => onFollow(book.id, on)}
                  />
                </Field>
              </li>
            );
          })}
        </ul>
      )}
      {unplaced.length > 0 && learned.size > 0 && (
        <div className="grid gap-2">
          <p className="max-w-[60ch] text-sm text-text-2">
            <Plural
              value={unplaced.length}
              one="Lymi couldn’t tell which language this book is in. Choose one to bring in its highlights."
              other="Lymi couldn’t tell which language these books are in. Choose one to bring in their highlights."
            />
          </p>
          <ul className={PLATE}>
            {unplaced.map((book) => (
              <li key={book.id} className={ROW}>
                <Field orientation="horizontal" className="flex-wrap gap-x-4 gap-y-2">
                  <FieldContent className="min-w-0 flex-1 gap-0.5">
                    <FieldLabel className="truncate text-base text-text">
                      {book.title || t`Untitled`}
                    </FieldLabel>
                    <FieldDescription className="truncate">
                      {book.author ? (
                        <Trans>
                          {isolate(book.author)} ·{" "}
                          <Plural value={book.highlights} one="# highlight" other="# highlights" />
                        </Trans>
                      ) : (
                        <Plural value={book.highlights} one="# highlight" other="# highlights" />
                      )}
                    </FieldDescription>
                  </FieldContent>
                  <div className="w-full sm:w-56">
                    <Select
                      value={null}
                      onValueChange={(v) => {
                        if (v) onLanguage(book.id, v as string);
                      }}
                      items={[...learned].map((l) => ({ value: l, label: nameOf(l) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t`Choose a language`} />
                      </SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>
                </Field>
              </li>
            ))}
          </ul>
        </div>
      )}
      {others > 0 && (
        <p className="text-sm text-muted">
          <Plural
            value={others}
            one="# other book isn’t in a language you’re learning."
            other="# other books aren’t in a language you’re learning."
          />
        </p>
      )}
    </SettingsGroup>
  );
}

function Disconnect({ onDisconnect, disconnecting }: Props) {
  const { t } = useLingui();
  const confirm = useConfirmStep();
  return (
    <SettingsGroup
      title={t`Disconnect`}
      description={t`Lymi forgets your Readwise token and stops checking. Cards already added stay.`}
    >
      {confirm.confirming ? (
        <div {...confirm.groupProps} className="enter-fade flex gap-3">
          <Button ref={confirm.safe} variant="ghost" onClick={confirm.cancel}>
            <Trans>Stay connected</Trans>
          </Button>
          <Button
            variant="danger"
            loading={disconnecting}
            aria-disabled={disconnecting}
            onClick={onDisconnect}
          >
            <Trans>Disconnect Readwise</Trans>
          </Button>
        </div>
      ) : (
        <Button ref={confirm.trigger} className="justify-self-start" onClick={confirm.ask}>
          <Trans>Disconnect Readwise</Trans>
        </Button>
      )}
    </SettingsGroup>
  );
}
