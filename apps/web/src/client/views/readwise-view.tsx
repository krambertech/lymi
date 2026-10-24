import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { isolate } from "@lymi/core";
import { RefreshCw } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { AppActivity, AppConnect, AppPage, AppSection, AppStop } from "../components/app-page";
import { Button } from "../components/button";
import { DocLink } from "../components/connected-apps-section";
import { InlineError } from "../components/inline-error";
import { ReadwiseMark } from "../components/readwise-mark";
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

/** Readwise's page, on the template every app shares. docs/design/app-pages.md. */
export function ReadwiseView(props: Props) {
  const { t } = useLingui();
  const { connection } = props;
  const status = useStatus(connection);
  return (
    <AppPage
      appKey="readwise"
      name="Readwise"
      mark={<ReadwiseMark className="size-14" />}
      status={status}
      does={t`Turns the words you highlight in Kindle, Kobo, Apple Books and Readwise Reader into cards.`}
      action={
        connection?.status === "active" && (
          <Button
            size="sm"
            loading={props.pulling}
            aria-disabled={props.pulling}
            onClick={props.onPull}
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            <Trans>Check now</Trans>
          </Button>
        )
      }
    >
      {props.pullError && (
        <p className="-mt-4 pb-6 text-sm" role="alert">
          <InlineError>{props.pullError}</InlineError>
        </p>
      )}
      {props.loadError ? (
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
      ) : connection === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : connection === null ? (
        <Connect {...props} />
      ) : (
        <>
          <Settings {...props} connection={connection} />
          <AppActivity appKey="readwise" app="readwise" name="Readwise" />
          <Connect {...props} />
          <AppStop
            consequence={t`Lymi forgets your Readwise token and stops checking. Cards already added stay.`}
            label={t`Disconnect Readwise`}
            keep={t`Stay connected`}
            onStop={props.onDisconnect}
            stopping={props.disconnecting}
          />
        </>
      )}
    </AppPage>
  );
}

function useStatus(connection: Readwise | null | undefined) {
  const { t, i18n } = useLingui();
  if (connection === undefined) return undefined;
  if (connection === null) return { label: t`Not connected`, tone: "muted" as const };
  if (connection.status === "unreadable") {
    return {
      label: t`Token needed`,
      tone: "danger" as const,
      detail: t`Lymi can no longer read your saved token. Paste it again below.`,
    };
  }
  if (connection.status === "refused") {
    return {
      label: t`Token refused`,
      tone: "danger" as const,
      detail: t`Readwise no longer accepts your token. Paste a new one below.`,
    };
  }
  const pull = connection.lastPull;
  if (!pull) {
    return {
      label: t`Connected`,
      tone: "good" as const,
      detail: t`Not checked yet. Lymi checks every hour.`,
    };
  }
  const at = new Date(pull.at);
  const today = at.toDateString() === new Date().toDateString();
  const when = i18n.date(
    at,
    today
      ? { hour: "numeric", minute: "2-digit" }
      : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
  );
  const nextAt = new Date(at.getTime() + 60 * 60 * 1000);
  const next = i18n.date(nextAt, { hour: "numeric", minute: "2-digit" });
  return {
    label: t`Connected`,
    tone: "good" as const,
    detail: (
      <>
        {/* A stalled check would otherwise promise a time that has passed. */}
        {nextAt.getTime() > Date.now() ? (
          <Trans>
            Checked at {when} · next around {next}
          </Trans>
        ) : (
          <Trans>Checked at {when}</Trans>
        )}
        {pull.skipped > 0 && (
          <span className="block">
            <Plural
              value={pull.skipped}
              one="# passage had no word in its note."
              other="# passages had no word in their notes."
            />
          </span>
        )}
      </>
    ),
  };
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
    <form onSubmit={submit} className="grid justify-items-start gap-4 border-t border-edge pt-4">
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
        {error && <FieldError>{error}</FieldError>}
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

/** How it connects: the token steps, with the token field until one is accepted. */
function Connect(props: Props) {
  const { t } = useLingui();
  const { connection } = props;
  const needsToken = !connection || connection.status !== "active";
  return (
    <AppConnect
      name="Readwise"
      intro={
        connection && !needsToken ? (
          <Trans>
            Lymi checks Readwise every hour with your token, ending in{" "}
            <span className="font-mono">{connection.tokenHint}</span>. A highlight of a word becomes
            a card, and so does a passage with the word written in its note.
          </Trans>
        ) : (
          <Trans>
            Lymi checks Readwise every hour with your token. A highlight of a word becomes a card,
            and so does a passage with the word written in its note.
          </Trans>
        )
      }
      steps={[
        <Trans key="open">
          Open <DocLink href={TOKEN_PAGE}>readwise.io/access_token</DocLink> and sign in.
        </Trans>,
        <Trans key="copy">
          Choose <span className="font-medium text-text">Get Access Token</span>, then copy it.
        </Trans>,
        <Trans key="paste">Paste it in Lymi and connect.</Trans>,
      ]}
    >
      {needsToken && (
        <TokenForm
          onConnect={props.onConnect}
          connecting={props.connecting}
          error={props.connectError}
          label={connection ? t`New Readwise token` : t`Readwise token`}
          action={connection ? <Trans>Use this token</Trans> : <Trans>Connect</Trans>}
        />
      )}
    </AppConnect>
  );
}

/** Settings: which books bring their highlights, and where each language's highlights go. */
function Settings(props: Props & { connection: Readwise }) {
  const { t } = useLingui();
  return (
    <AppSection title={t`Settings`}>
      <div className="grid gap-5">
        <Books {...props} />
        <Decks {...props} />
        {props.saveError && (
          <p className="text-sm" role="alert">
            <InlineError>{props.saveError}</InlineError>
          </p>
        )}
      </div>
    </AppSection>
  );
}

function Decks({ connection, decks, onDeck }: Props & { connection: Readwise }) {
  const { t } = useLingui();
  const nameOf = useLanguageName();
  if (connection.languages.length === 0) {
    return (
      <p className="max-w-[60ch] text-sm text-muted">
        <Trans>
          None of your decks has a language yet. Give a deck one, and highlights in it can come in.
        </Trans>
      </p>
    );
  }
  return (
    <div className={PLATE}>
      {connection.languages.map(({ language, deckId }) => {
        const items = decks
          .filter((d) => d.language === language)
          .map((d) => ({ value: d.id, label: d.name }));
        const name = nameOf(language);
        return (
          <Field
            key={language}
            orientation="horizontal"
            className={`${ROW} flex-wrap items-center gap-x-4 gap-y-2`}
          >
            <FieldLabel className="min-w-0 flex-1 text-base text-text">
              <Trans>{{ language: name }} highlights go to</Trans>
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
  );
}

function Books({ connection, onFollow, onLanguage }: Props & { connection: Readwise }) {
  const { t } = useLingui();
  const nameOf = useLanguageName();
  const learned = new Set(connection.languages.map((l) => l.language));
  const yours = connection.books.filter((b) => b.language && learned.has(b.language));
  const unplaced = learned.size > 0 ? connection.books.filter((b) => !b.language) : [];
  const others = connection.books.filter((b) => b.language && !learned.has(b.language)).length;
  const highlights = (n: number) => <Plural value={n} one="# highlight" other="# highlights" />;
  return (
    <div className="grid gap-2">
      {yours.length === 0 && unplaced.length === 0 ? (
        <p className="max-w-[60ch] text-sm text-muted">
          <Trans>
            No books in a language you’re learning yet. One appears here when you highlight in it.
          </Trans>
        </p>
      ) : (
        <ul className={PLATE}>
          {yours.map((book) => {
            const language = nameOf(book.language ?? "");
            return (
              <li key={book.id} className={ROW}>
                <Field orientation="horizontal" className="gap-4">
                  <FieldContent className="min-w-0 gap-0.5">
                    <FieldLabel className="truncate text-base text-text">
                      {book.title || t`Untitled`}
                    </FieldLabel>
                    <FieldDescription className="truncate">
                      {book.author ? (
                        <Trans>
                          {isolate(book.author)} · {language} · {highlights(book.highlights)}
                        </Trans>
                      ) : (
                        <Trans>
                          {language} · {highlights(book.highlights)}
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
          {unplaced.map((book) => (
            <li key={book.id} className={ROW}>
              <Field orientation="horizontal" className="flex-wrap gap-x-4 gap-y-2">
                <FieldContent className="min-w-0 flex-1 gap-0.5">
                  <FieldLabel className="truncate text-base text-text">
                    {book.title || t`Untitled`}
                  </FieldLabel>
                  <FieldDescription>
                    <Trans>
                      Lymi couldn’t tell its language. Choose one to bring in its highlights.
                    </Trans>
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
      )}
      <p className="text-sm text-muted">
        <Trans>New highlights in the books you turn on become cards.</Trans>{" "}
        {others > 0 && (
          <Plural
            value={others}
            one="# other book isn’t in a language you’re learning."
            other="# other books aren’t in a language you’re learning."
          />
        )}
      </p>
    </div>
  );
}
