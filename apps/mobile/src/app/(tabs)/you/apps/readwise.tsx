import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { api, type Readwise, refusalCode } from "@lymi/client/api";
import { readwiseQuery } from "@lymi/client/queries";
import { isolate, languageKey } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import {
  AppActivity,
  AppConnect,
  AppPage,
  AppSection,
  AppStop,
  B,
  StatusLine,
  Step,
} from "../../../../apps/app-page";
import { ReadwiseMark } from "../../../../apps/marks";
import { languageName } from "../../../../data/languages";
import { useDecks } from "../../../../data/queries";
import { usePalette } from "../../../../theme/palette";
import { Field, FieldError, FieldLabel, Input } from "../../../../ui/field";
import { Select } from "../../../../ui/menu";
import { Button, Icon, Plate, Text } from "../../../../ui/primitives";
import { Skeleton } from "../../../../ui/skeleton";
import { Switch } from "../../../../ui/switch";
import { toast } from "../../../../ui/toast-host";

const TOKEN_PAGE = "https://readwise.io/access_token";

type DeckChoice = { id: string; name: string; language: string };

/** Readwise's page, on the template every app shares. docs/design/app-pages.md. */
export default function ReadwisePage() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const router = useRouter();
  const state = useQuery(readwiseQuery);
  const decks = useDecks();
  const settle = (next: { connection: Readwise | null }) =>
    qc.setQueryData(readwiseQuery.queryKey, next);

  const connect = useMutation({ mutationFn: api.connectReadwise, onSuccess: settle });
  const update = useMutation({
    mutationFn: api.updateReadwise,
    // A switch moves on the tap and moves back if the server refuses.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: readwiseQuery.queryKey });
      const previous = qc.getQueryData(readwiseQuery.queryKey);
      const connection = previous?.connection;
      if (connection) {
        const patches = new Map((patch.books ?? []).map((b) => [b.id, b]));
        const deckFor = (language: string) =>
          connection.languages.find((l) => l.language === language)?.deckId;
        settle({
          connection: {
            ...connection,
            books: connection.books.map((b) => {
              const next = patches.get(b.id);
              if (!next) return b;
              const language = next.language ?? b.language;
              const followed =
                next.followed ?? (next.language ? Boolean(deckFor(next.language)) : b.followed);
              return { ...b, language, followed };
            }),
            languages: connection.languages.map((l) => ({
              ...l,
              deckId: patch.decks?.[l.language] ?? l.deckId,
            })),
          },
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) settle(context.previous);
    },
    onSuccess: (next, patch) => {
      settle(next);
      // Following a book pulls its highlights at once, so Activity may have new rows.
      if (patch.books?.length) void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const pull = useMutation({
    mutationFn: api.pullReadwise,
    onSuccess: (next) => {
      settle(next);
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const disconnect = useMutation({
    mutationFn: api.disconnectReadwise,
    onSuccess: () => {
      settle({ connection: null });
      router.back();
      toast.add({ title: t`Readwise is disconnected` });
    },
  });

  const connectError = (error: unknown) =>
    refusalCode(error) === "readwise_refused"
      ? t`Readwise didn’t accept that token. Copy it again from readwise.io/access_token.`
      : t`Couldn’t reach Readwise. Check your connection and try again.`;
  const connection = state.isSuccess ? state.data.connection : undefined;
  const choices: DeckChoice[] = (decks.data ?? []).flatMap((d) =>
    d.role === "owner" && !d.archivedAt && d.defaultLanguage
      ? [{ id: d.id, name: d.name, language: languageKey(d.defaultLanguage) }]
      : [],
  );
  const connectProps = {
    connection,
    onConnect: (token: string) => connect.mutate(token),
    connecting: connect.isPending,
    connectError: connect.isError ? connectError(connect.error) : null,
  };

  return (
    <AppPage
      appKey="readwise"
      name="Readwise"
      mark={<ReadwiseMark size={56} />}
      status={useStatus(connection)}
      does={t`Turns the words you highlight in Kindle, Kobo, Apple Books and Readwise Reader into cards.`}
      action={
        connection?.status === "active" && (
          <View className="gap-2">
            <Button
              label={t`Check now`}
              icon="reset"
              loading={pull.isPending}
              onPress={() => {
                if (!pull.isPending) pull.mutate();
              }}
            />
            <FieldError>
              {pull.isError ? t`Couldn’t reach Readwise. Try again in a minute.` : null}
            </FieldError>
          </View>
        )
      }
    >
      {state.isError ? (
        <View className="items-start gap-3">
          <FieldError>
            {t`Couldn’t load your Readwise connection. Check your connection and try again.`}
          </FieldError>
          <Button label={t`Try again`} onPress={() => void state.refetch()} />
        </View>
      ) : connection === undefined ? (
        <Skeleton height={200} />
      ) : connection === null ? (
        <Connect {...connectProps} />
      ) : (
        <>
          <AppSection title={t`Settings`}>
            <Books
              connection={connection}
              onFollow={(id, followed) => update.mutate({ books: [{ id, followed }] })}
              onLanguage={(id, language) => update.mutate({ books: [{ id, language }] })}
            />
            <Decks
              connection={connection}
              decks={choices}
              onDeck={(language, deckId) => update.mutate({ decks: { [language]: deckId } })}
            />
            <FieldError>
              {update.isError
                ? t`Couldn’t save that change. Check your connection and try again.`
                : null}
            </FieldError>
          </AppSection>
          <AppActivity appKey="readwise" app="readwise" name="Readwise" />
          <Connect {...connectProps} />
          <AppStop
            consequence={t`Lymi forgets your Readwise token and stops checking. Cards already added stay.`}
            label={t`Disconnect Readwise`}
            keep={t`Stay connected`}
            onStop={() => disconnect.mutate()}
            stopping={disconnect.isPending}
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
      detail: (
        <StatusLine>{t`Lymi can no longer read your saved token. Paste it again below.`}</StatusLine>
      ),
    };
  }
  if (connection.status === "refused") {
    return {
      label: t`Token refused`,
      tone: "danger" as const,
      detail: (
        <StatusLine>{t`Readwise no longer accepts your token. Paste a new one below.`}</StatusLine>
      ),
    };
  }
  const pull = connection.lastPull;
  if (!pull) {
    return {
      label: t`Connected`,
      tone: "good" as const,
      detail: <StatusLine>{t`Not checked yet. Lymi checks every hour.`}</StatusLine>,
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
      <View className="gap-0.5">
        <StatusLine>
          {/* A stalled check would otherwise promise a time that has passed. */}
          {nextAt.getTime() > Date.now() ? (
            <Trans>
              Checked at {when} · next around {next}
            </Trans>
          ) : (
            <Trans>Checked at {when}</Trans>
          )}
        </StatusLine>
        {pull.skipped > 0 && (
          <StatusLine>
            {plural(pull.skipped, {
              one: "# passage had no word in its note.",
              other: "# passages had no word in their notes.",
            })}
          </StatusLine>
        )}
      </View>
    ),
  };
}

/** How it connects: the token steps, with the token field until one is accepted. */
function Connect({
  connection,
  onConnect,
  connecting,
  connectError,
}: {
  connection: Readwise | null | undefined;
  onConnect: (token: string) => void;
  connecting: boolean;
  connectError: string | null;
}) {
  const { t } = useLingui();
  const needsToken = connection?.status !== "active";
  return (
    <AppConnect
      name="Readwise"
      intro={
        connection && !needsToken
          ? t`Lymi checks Readwise every hour with your token, ending in ${connection.tokenHint}. A highlight of a word becomes a card, and so does a passage with the word written in its note.`
          : t`Lymi checks Readwise every hour with your token. A highlight of a word becomes a card, and so does a passage with the word written in its note.`
      }
      steps={[
        <Step key="open">
          <Trans>
            Open{" "}
            <Text
              className="font-medium text-text underline"
              accessibilityRole="link"
              onPress={() => void openBrowserAsync(TOKEN_PAGE)}
            >
              readwise.io/access_token
            </Text>{" "}
            and sign in.
          </Trans>
        </Step>,
        <Step key="copy">
          <Trans>
            Choose <B>Get Access Token</B>, then copy it.
          </Trans>
        </Step>,
        <Step key="paste">
          <Trans>Paste it in Lymi and connect.</Trans>
        </Step>,
      ]}
    >
      {needsToken && (
        <TokenForm
          onConnect={onConnect}
          connecting={connecting}
          error={connectError}
          label={connection ? t`New Readwise token` : t`Readwise token`}
          action={connection ? t`Use this token` : t`Connect`}
        />
      )}
    </AppConnect>
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
  action: string;
}) {
  const [token, setToken] = useState("");
  const submit = () => {
    if (token.trim() && !connecting) onConnect(token.trim());
  };
  return (
    <View className="gap-4 border-t border-edge pt-4">
      <Field invalid={Boolean(error)}>
        <FieldLabel>{label}</FieldLabel>
        <Input
          value={token}
          onChangeText={setToken}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <Button
        label={action}
        variant="primary"
        loading={connecting}
        disabled={!token.trim()}
        onPress={submit}
      />
    </View>
  );
}

/** A row of a settings plate, with a hairline above every row but the first. */
function SettingRow({ first, children }: { first: boolean; children: ReactNode }) {
  return (
    <View
      className={`min-h-[60px] flex-row items-center gap-3 py-3 ps-4 pe-4 ${first ? "" : "border-t border-edge"}`}
    >
      {children}
    </View>
  );
}

/** A choice at a row's end: what is chosen now, or the prompt, and the chevron that opens the list. */
function ChoiceFace({ value, under = false }: { value: string; under?: boolean }) {
  const p = usePalette();
  return (
    <View className={`flex-row items-center gap-1 ${under ? "pt-1" : "max-w-[55%]"}`}>
      <Text
        className={`shrink text-md ${under ? "font-medium text-text" : "text-muted"}`}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Icon name="down" size={16} colour={p.muted} />
    </View>
  );
}

/** Which books bring their highlights: those in a language being learned, and those Lymi couldn't place. */
function Books({
  connection,
  onFollow,
  onLanguage,
}: {
  connection: Readwise;
  onFollow: (bookId: string, followed: boolean) => void;
  onLanguage: (bookId: string, language: string) => void;
}) {
  const { t } = useLingui();
  const learned = new Set(connection.languages.map((l) => l.language));
  const yours = connection.books.filter((b) => b.language && learned.has(b.language));
  const unplaced = learned.size > 0 ? connection.books.filter((b) => !b.language) : [];
  const others = connection.books.filter((b) => b.language && !learned.has(b.language)).length;
  const highlights = (n: number) => plural(n, { one: "# highlight", other: "# highlights" });
  const languages = [...learned].map((l) => ({ value: l, label: languageName(l) }));
  return (
    <View className="gap-2">
      {yours.length === 0 && unplaced.length === 0 ? (
        <Text className="px-1 text-base text-muted">
          {t`No books in a language you’re learning yet. One appears here when you highlight in it.`}
        </Text>
      ) : (
        <Plate className="overflow-hidden">
          {yours.map((book, i) => {
            const language = languageName(book.language ?? "");
            const count = highlights(book.highlights);
            const title = book.title || t`Untitled`;
            return (
              <SettingRow key={book.id} first={i === 0}>
                <View className="flex-1 gap-0.5">
                  <Text className="text-md text-text" numberOfLines={1}>
                    {title}
                  </Text>
                  <Text className="text-sm text-muted" numberOfLines={1}>
                    {book.author
                      ? t`${isolate(book.author)} · ${language} · ${count}`
                      : t`${language} · ${count}`}
                  </Text>
                </View>
                <Switch
                  checked={book.followed}
                  onCheckedChange={(on) => onFollow(book.id, on)}
                  accessibilityLabel={title}
                />
              </SettingRow>
            );
          })}
          {unplaced.map((book, i) => (
            <Select
              key={book.id}
              label={t`Choose a language`}
              value={"" as string}
              options={languages}
              onChange={(language) => onLanguage(book.id, language)}
              trigger={
                <SettingRow first={yours.length === 0 && i === 0}>
                  <View className="flex-1 gap-1">
                    <Text className="text-md text-text" numberOfLines={1}>
                      {book.title || t`Untitled`}
                    </Text>
                    <Text className="text-sm text-muted">
                      {t`Lymi couldn’t tell its language. Choose one to bring in its highlights.`}
                    </Text>
                    <ChoiceFace value={t`Choose a language`} under />
                  </View>
                </SettingRow>
              }
            />
          ))}
        </Plate>
      )}
      <Text className="px-1 text-sm text-muted">
        {others > 0
          ? `${t`New highlights in the books you turn on become cards.`} ${plural(others, {
              one: "# other book isn’t in a language you’re learning.",
              other: "# other books aren’t in a language you’re learning.",
            })}`
          : t`New highlights in the books you turn on become cards.`}
      </Text>
    </View>
  );
}

/** Where each language's highlights go. */
function Decks({
  connection,
  decks,
  onDeck,
}: {
  connection: Readwise;
  decks: DeckChoice[];
  onDeck: (language: string, deckId: string) => void;
}) {
  const { t } = useLingui();
  if (connection.languages.length === 0) {
    return (
      <Text className="px-1 text-base text-muted">
        {t`None of your decks has a language yet. Give a deck one, and highlights in it can come in.`}
      </Text>
    );
  }
  return (
    <Plate className="overflow-hidden">
      {connection.languages.map(({ language, deckId }, i) => {
        const options = decks
          .filter((d) => d.language === language)
          .map((d) => ({ value: d.id, label: d.name }));
        const chosen = options.find((o) => o.value === deckId)?.label;
        const name = languageName(language);
        return (
          <Select
            key={language}
            label={t`${{ language: name }} highlights go to`}
            value={deckId ?? ""}
            options={options}
            onChange={(id) => onDeck(language, id)}
            trigger={
              <SettingRow first={i === 0}>
                <Text className="flex-1 text-md text-text">
                  {t`${{ language: name }} highlights go to`}
                </Text>
                <ChoiceFace value={chosen ?? t`Choose a deck`} />
              </SettingRow>
            }
          />
        );
      })}
    </Plate>
  );
}
