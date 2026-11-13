import { Trans, useLingui } from "@lingui/react/macro";
import { type ApiKeySummary, api, errorMessage } from "@lymi/client/api";
import { YOMITAN_ACTIVITY_APP, YOMITAN_KEY_NAME, yomitanKey } from "@lymi/client/apps";
import { keysQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import {
  AppActivity,
  AppConnect,
  AppPage,
  AppSection,
  AppStop,
  B,
  CopyField,
  StatusLine,
  Step,
} from "../../../../apps/app-page";
import { YomitanMark } from "../../../../apps/marks";
import { API_URL, siteUrl } from "../../../../auth/client";
import { FieldError } from "../../../../ui/field";
import { LoadFailed, useLoadFailed } from "../../../../ui/load-failed";
import { Button, Plate, Text } from "../../../../ui/primitives";
import { Skeleton } from "../../../../ui/skeleton";
import { toast } from "../../../../ui/toast-host";
import { lastUsed, shortDate } from "../../../../you/key-dates";

/**
 * Yomitan talks to Lymi as it would to Anki, so connecting it is pasting Lymi's address and a key
 * into its Anki settings. Its page is on the template every app shares. docs/design/app-pages.md.
 */
export default function Yomitan() {
  const { t, i18n } = useLingui();
  const qc = useQueryClient();
  const keys = useQuery(keysQuery);
  const keysFailed = useLoadFailed(keys);
  // An old key that failed to revoke, kept until it leaves the key list so its note stays up.
  const [stuck, setStuck] = useState<string | null>(null);
  const current = keys.data ? yomitanKey(keys.data.filter((k) => k.id !== stuck)) : undefined;
  // A new key replaces the one this page shows, so a key thought leaked stops working.
  const make = useMutation({
    mutationFn: async (replacing: string | null) => {
      const made = await api.createKey({ name: YOMITAN_KEY_NAME, scope: "write" });
      // The new key is shown once whatever happens to the old one, which can be revoked by hand.
      if (replacing) await api.revokeKey(replacing).catch(() => setStuck(replacing));
      return made;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keysQuery.queryKey }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeKey(id),
    onSuccess: (_, id) => {
      // Revoking the key just made only takes back that key; revoking the one in use disconnects.
      if (id === current?.id && !make.data) toast.add({ title: t`Yomitan is disconnected` });
      make.reset();
      void qc.invalidateQueries({ queryKey: keysQuery.queryKey });
    },
  });
  const failed = make.error ?? revoke.error ?? (keys.isError ? keys.error : null);
  const error = failed
    ? errorMessage(failed)
    : stuck && keys.data?.some((k) => k.id === stuck)
      ? t`Couldn’t revoke the old key. Revoke it under API keys in You.`
      : null;
  const fresh = make.data?.key ?? null;

  return (
    <AppPage
      appKey="yomitan"
      name="Yomitan"
      mark={<YomitanMark size={56} />}
      status={keysFailed ? null : statusOf(current)}
      does={t`A pop-up dictionary for Chrome, Edge and Firefox. Hold Shift over a word on any page and press + to add it as a card, with its reading, its meaning and the sentence you read it in.`}
    >
      {keysFailed ? (
        // Making a key here would leave Yomitan's own key working beside a second one.
        <LoadFailed
          query={keys}
          failed={t`Couldn’t load your keys`}
          offline={t`Your keys need a connection`}
          size="inline"
        />
      ) : current === undefined ? (
        <Skeleton height={200} />
      ) : !current ? (
        <Connect
          first
          making={make.isPending}
          onMake={() => make.mutate(null)}
          fresh={fresh}
          onDone={() => make.reset()}
          error={error}
        />
      ) : (
        <>
          <AppSection title={t`Settings`}>
            <Plate className="items-start gap-3 p-4">
              {fresh ? (
                <KeyReady value={fresh} onDone={() => make.reset()} />
              ) : (
                <>
                  <View className="gap-0.5">
                    <Text className="text-md font-medium text-ink">{t`API key`}</Text>
                    <Text className="text-sm text-ink-muted">
                      {t`A new key replaces this one, and this one stops working.`}
                    </Text>
                  </View>
                  <Button
                    label={t`Replace the key`}
                    icon="keys"
                    loading={make.isPending}
                    onPress={() => make.mutate(current.id)}
                  />
                </>
              )}
              <FieldError>{error}</FieldError>
            </Plate>
          </AppSection>
          <AppActivity appKey="yomitan" app={YOMITAN_ACTIVITY_APP} name="Yomitan" />
          <Connect first={false} />
          <AppStop
            consequence={t`Lymi revokes Yomitan’s key, so Yomitan can no longer add cards or find duplicates. Cards it added stay.`}
            label={t`Disconnect Yomitan`}
            keep={t`Stay connected`}
            onStop={() => revoke.mutate(current.id)}
            stopping={revoke.isPending}
          />
        </>
      )}
    </AppPage>
  );

  function statusOf(key: ApiKeySummary | null | undefined) {
    if (key === undefined) return undefined;
    if (key === null) return { label: t`Not connected`, tone: "muted" as const };
    const made = shortDate(i18n, key.createdAt);
    if (!key.lastRequest) {
      return {
        label: t`Not used yet`,
        tone: "muted" as const,
        detail: (
          <StatusLine>{t`Key made ${made}. Paste it into Yomitan’s Anki settings.`}</StatusLine>
        ),
      };
    }
    const used = lastUsed(i18n, key.lastRequest);
    return {
      label: t`Connected`,
      tone: "good" as const,
      detail: (
        <StatusLine>
          <Trans>
            Key made {made} · {used}
          </Trans>
        </StatusLine>
      ),
    };
  }
}

/** How it connects: the steps, Lymi's address, and the first key until there is one. */
function Connect(
  props:
    | { first: false }
    | {
        first: true;
        making: boolean;
        onMake: () => void;
        fresh: string | null;
        onDone: () => void;
        error: string | null;
      },
) {
  const { t } = useLingui();
  return (
    <AppConnect
      name="Yomitan"
      intro={t`Yomitan adds cards to Lymi as it would to Anki. It sends each word you look up to check for a duplicate, and Lymi keeps nothing from a check.`}
      steps={[
        <Step key="copy">
          <Trans>Copy Lymi’s address and make a key for Yomitan.</Trans>
        </Step>,
        <Step key="paste">
          <Trans>
            In Yomitan’s settings, turn on <B>Anki</B> and paste both.
          </Trans>
        </Step>,
        <Step key="deck">
          <Trans>
            For each dictionary, choose a Lymi deck and the note type <B>Lymi card</B>.
          </Trans>
        </Step>,
      ]}
      guide={siteUrl("/docs/yomitan")}
    >
      <View className="gap-4 border-t border-edge pt-4">
        <CopyField label={t`AnkiConnect server address`} value={`${API_URL}/api/anki-connect`} />
        {props.first &&
          (props.fresh ? (
            <KeyReady value={props.fresh} onDone={props.onDone} />
          ) : (
            <View className="gap-2">
              <Button
                label={t`Make a key for Yomitan`}
                icon="keys"
                variant="primary"
                loading={props.making}
                onPress={props.onMake}
              />
              <FieldError>{props.error}</FieldError>
            </View>
          ))}
      </View>
    </AppConnect>
  );
}

/** The key just made: shown once, to copy into Yomitan. */
function KeyReady({ value, onDone }: { value: string; onDone: () => void }) {
  const { t } = useLingui();
  return (
    <View className="gap-3 self-stretch">
      <Text className="text-base text-ink" accessibilityLiveRegion="polite">
        {t`Your key is ready. Copy it now. You won’t see it again.`}
      </Text>
      <CopyField label={t`API key for Yomitan`} value={value} />
      <View className="items-start">
        <Button label={t`Done`} onPress={onDone} />
      </View>
    </View>
  );
}
