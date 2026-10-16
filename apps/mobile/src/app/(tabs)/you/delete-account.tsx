import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage } from "@lymi/client/api";
import { deletionQuery } from "@lymi/client/queries";
import type { AccountDeletionOut } from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Linking, View } from "react-native";
import { usePalette, useRoom } from "../../../theme/palette";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../../../ui/field";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { openWeb } from "../../../ui/on-the-web";
import { Button, Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Row, RowFace, Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Skeleton } from "../../../ui/skeleton";
import {
  APPLE_FAILED,
  AppleNotConfirmed,
  confirmWithApple,
  deleteAccount,
  REFUSALS,
  refusalOf,
} from "../../../you/delete-account";

const SUPPORT = "hello@lymi.app";

/**
 * Ending the account: what goes, the decks that stay for their members, the export, then the
 * confirmation, an emailed code or a fresh Sign in with Apple. docs/proposals/account-deletion.md.
 */
export default function DeleteAccount() {
  const { t } = useLingui();
  const summary = useQuery(deletionQuery);
  const failed = useLoadFailed(summary);
  return (
    <Screen
      title={t`Delete account`}
      back={{ label: t`You`, to: "/you" }}
      description={t`Your account and everything in it are deleted for good. Nothing can bring them back.`}
    >
      {summary.data ? (
        <Summary summary={summary.data} onBlocked={() => void summary.refetch()} />
      ) : failed ? (
        <LoadFailed
          query={summary}
          failed={t`Couldn’t load your account`}
          offline={t`Deleting your account needs a connection`}
        />
      ) : (
        <Skeleton height={120} />
      )}
    </Screen>
  );
}

function Summary({ summary, onBlocked }: { summary: AccountDeletionOut; onBlocked: () => void }) {
  const { t } = useLingui();
  return (
    <>
      <View>
        <SectionTitle>{t`What goes`}</SectionTitle>
        <View className="gap-2">
          <Plate className="flex-row gap-6 p-5">
            <Figure
              count={summary.decks}
              label={plural(summary.decks, { one: "deck", other: "decks" })}
            />
            <Figure
              count={summary.cards}
              label={plural(summary.cards, { one: "card", other: "cards" })}
            />
            <Figure
              count={summary.reviews}
              label={plural(summary.reviews, { one: "review", other: "reviews" })}
            />
          </Plate>
          <Text className="px-4 text-sm text-muted">
            {t`Your settings, photo, API keys and connected apps go too.`}
          </Text>
        </View>
      </View>

      {summary.sharedDecks.length > 0 && <Kept decks={summary.sharedDecks} />}

      <View className="gap-2">
        <Rows>
          <Row
            icon="export"
            label={t`Export your library`}
            end="web"
            onPress={() => openWeb("/settings#export")}
          />
        </Rows>
        <Text className="px-4 text-sm text-muted">
          {t`To keep a copy of your decks, export them first.`}
        </Text>
      </View>

      {summary.blocked === "publisher" ? (
        <Publisher />
      ) : summary.confirmWith === "apple" ? (
        <AppleConfirm onBlocked={onBlocked} />
      ) : (
        <CodeConfirm onBlocked={onBlocked} />
      )}
    </>
  );
}

function Figure({ count, label }: { count: number; label: string }) {
  const { i18n } = useLingui();
  return (
    <View className="gap-0.5">
      <Text className="text-2xl font-medium tracking-tight text-text">{i18n.number(count)}</Text>
      <Text className="text-sm text-muted">{label}</Text>
    </View>
  );
}

/** Owned decks other people study, which stay for them under a former owner. */
function Kept({ decks }: { decks: AccountDeletionOut["sharedDecks"] }) {
  const { t } = useLingui();
  return (
    <View>
      <SectionTitle>{t`Kept for their members`}</SectionTitle>
      <View className="gap-2">
        <Rows>
          {decks.map((deck) => (
            <RowFace
              key={deck.id}
              icon="deck"
              label={deck.name}
              value={plural(deck.members, { one: "# person", other: "# people" })}
              end="none"
            />
          ))}
        </Rows>
        <Text className="px-4 text-sm text-muted">
          {t`They keep studying these decks, and nobody can change them again. Each one goes when its last member leaves.`}
        </Text>
      </View>
    </View>
  );
}

function Publisher() {
  const { t } = useLingui();
  return (
    <View className="gap-2">
      <Plate className="px-4 py-3.5">
        <Text className="text-md text-text">
          {t`This account publishes decks, so it can’t be deleted in the app. Write to ${SUPPORT} and we’ll delete it for you.`}
        </Text>
      </Plate>
      <Rows>
        <Row
          icon="email"
          label={t`Write to ${SUPPORT}`}
          end="none"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT}`)}
        />
      </Rows>
    </View>
  );
}

/** An emailed six-digit code, the confirmation every account can use. */
function CodeConfirm({ onBlocked }: { onBlocked: () => void }) {
  const { t, i18n } = useLingui();
  const [sent, setSent] = useState<{ to: string | null } | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"send" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const fail = (set: () => void) => {
    set();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const send = async () => {
    setError(null);
    setCodeError(null);
    setPending("send");
    try {
      const { sentTo } = await api.sendDeletionCode();
      setSent({ to: sentTo });
      setCode("");
    } catch (err) {
      const refusal = refusalOf(err);
      // A code sent a moment ago still works, so the field opens for it.
      if (refusal === "code_sent") setSent((was) => was ?? { to: null });
      if (refusal === "publisher") onBlocked();
      fail(() => setError(refusal ? i18n._(REFUSALS[refusal]) : errorMessage(err)));
    } finally {
      setPending(null);
    }
  };

  const confirm = async () => {
    setError(null);
    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6)
      return fail(() => setCodeError(t`Enter the 6-digit code from the email.`));
    setPending("delete");
    try {
      await deleteAccount({ code: digits });
    } catch (err) {
      const refusal = refusalOf(err);
      if (refusal === "publisher") onBlocked();
      if (refusal === "code_wrong" || refusal === "code_expired")
        fail(() => setCodeError(i18n._(REFUSALS[refusal])));
      else fail(() => setError(refusal ? i18n._(REFUSALS[refusal]) : errorMessage(err)));
      setPending(null);
    }
  };

  if (!sent)
    return (
      <View className="gap-4">
        <Text className="px-1 text-base text-text-2">
          {t`To confirm it’s you, we’ll email you a 6-digit code.`}
        </Text>
        <Button
          label={t`Send code`}
          size="lg"
          loading={pending === "send"}
          onPress={() => void send()}
        />
        <FormError message={error} />
      </View>
    );

  return (
    <View className="gap-4">
      <Field>
        <FieldLabel>{t`Code`}</FieldLabel>
        <Input
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setCodeError(null);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          // Only the button deletes; the keyboard's Done just puts the keyboard away.
          returnKeyType="done"
          testID="deletion-code"
        />
        <FieldDescription>
          {sent.to
            ? t`We sent it to ${sent.to}. It works for 15 minutes.`
            : t`Use the code in the email we sent. It works for 15 minutes.`}
        </FieldDescription>
        <FieldError>{codeError}</FieldError>
      </Field>
      <Button
        label={t`Delete account`}
        variant="danger"
        size="lg"
        loading={pending === "delete"}
        disabled={pending === "send"}
        onPress={() => void confirm()}
        testID="delete-account"
      />
      <FormError message={error} />
      <Button
        label={t`Send a new code`}
        variant="ghost"
        loading={pending === "send"}
        disabled={pending === "delete"}
        onPress={() => void send()}
      />
    </View>
  );
}

/** Apple's own sheet, which proves it is the learner and lets Lymi revoke its Apple grant. */
function AppleConfirm({ onBlocked }: { onBlocked: () => void }) {
  const { t, i18n } = useLingui();
  const room = useRoom();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    try {
      const confirmation = await confirmWithApple();
      if (!confirmation) return;
      setPending(true);
      await deleteAccount(confirmation);
    } catch (err) {
      const refusal = refusalOf(err);
      if (refusal === "publisher") onBlocked();
      setError(
        err instanceof AppleNotConfirmed
          ? i18n._(APPLE_FAILED)
          : refusal
            ? i18n._(REFUSALS[refusal])
            : errorMessage(err),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPending(false);
    }
  };

  return (
    <View className="gap-4">
      <Text className="px-1 text-base text-text-2">
        {t`Confirm with Apple, and your account is deleted at once.`}
      </Text>
      <View
        className={pending ? "opacity-45" : undefined}
        pointerEvents={pending ? "none" : "auto"}
      >
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={
            room === "dark"
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={14}
          style={{ height: 48 }}
          onPress={() => void confirm()}
        />
      </View>
      <FormError message={error} />
    </View>
  );
}

function FormError({ message }: { message: string | null }) {
  const p = usePalette();
  if (!message) return null;
  return (
    <View className="flex-row items-start gap-1.5 px-1" accessibilityLiveRegion="polite">
      <View className="h-[21px] justify-center">
        <Icon name="alert" size={14} colour={p.danger} />
      </View>
      <Text className="flex-1 text-base text-danger">{message}</Text>
    </View>
  );
}
