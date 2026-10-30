import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { deletionQuery } from "@lymi/client/queries";
import { dropQueued } from "@lymi/client/queued";
import type { AccountDeletionOut } from "@lymi/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { Linking, View } from "react-native";
import {
  appleSignInCancelled,
  requestAppleCredential,
  useAppleAvailable,
} from "../../../auth/apple";
import { authClient } from "../../../auth/client";
import { ExportSheet } from "../../../export/export-sheet";
import { LoadFailed } from "../../../ui/load-failed";
import { Button, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Row, Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Skeleton } from "../../../ui/skeleton";
import { AppleNote, ErrorLine, useSendCode } from "../../../you/deletion";

/**
 * Ending the account, from You, as the web's page: what goes and what stays are read before
 * anything is sent, and the emailed code is the confirmation. Proposal: account-deletion.md.
 */
export default function DeleteAccount() {
  const { t } = useLingui();
  const summary = useQuery(deletionQuery);
  const [exporting, setExporting] = useState(false);
  return (
    <Screen title={t`Delete account`} back={{ label: t`You`, to: "/you" }}>
      {summary.data?.blocked === "publisher" ? (
        <Publisher />
      ) : summary.data ? (
        <>
          <WhatGoes summary={summary.data} />
          {summary.data.sharedDecks.length > 0 && <WhatStays decks={summary.data.sharedDecks} />}
          <View>
            <SectionTitle>{t`Keep a copy`}</SectionTitle>
            <Rows>
              <Row icon="export" label={t`Export library`} onPress={() => setExporting(true)} />
            </Rows>
            <Note>{t`Lymi keeps nothing once the account is gone.`}</Note>
          </View>
          <Confirm apple={summary.data.confirmWith === "apple"} />
        </>
      ) : summary.isError ? (
        <LoadFailed
          query={summary}
          failed={t`Couldn’t load what your account holds`}
          offline={t`Connect to the internet to delete your account.`}
        />
      ) : (
        <View className="gap-3">
          <Skeleton height={20} width="70%" />
          <Skeleton height={72} />
        </View>
      )}
      <ExportSheet open={exporting} onOpenChange={setExporting} scope={{ kind: "library" }} />
    </Screen>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <Text className="px-1 pt-2 text-base text-ink-muted">{children}</Text>;
}

/** Lymi's own publisher accounts hold the decks in Explore, so the server refuses them. */
function Publisher() {
  const { t } = useLingui();
  return (
    <View className="gap-4">
      <Plate className="px-4 py-3.5">
        <Text className="text-md text-ink">
          {t`This is a Lymi publisher account. It publishes the decks in Explore, so it can’t be deleted here. Write to hello@lymi.app to delete it.`}
        </Text>
      </Plate>
      <Button
        label={t`Write to Lymi`}
        icon="email"
        onPress={() => void Linking.openURL("mailto:hello@lymi.app")}
      />
    </View>
  );
}

function WhatGoes({ summary }: { summary: AccountDeletionOut }) {
  const { t, i18n } = useLingui();
  return (
    <View>
      <SectionTitle>{t`What goes`}</SectionTitle>
      <View className="flex-row gap-2">
        <Count label={t`Decks`} value={i18n.number(summary.decks)} />
        <Count label={t`Cards`} value={i18n.number(summary.cards)} />
        <Count label={t`Reviews`} value={i18n.number(summary.reviews)} />
      </View>
      <Note>
        {t`Deleting your account erases it for good. Archived decks and cards go too, with your settings, photo, connected apps and API keys. You leave every deck you joined, and every device is signed out.`}
      </Note>
    </View>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  return (
    <Plate
      className="flex-1 gap-0.5 px-4 py-3"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text className="text-sm text-ink-muted">{label}</Text>
      <Text className="text-lg font-medium text-ink">{value}</Text>
    </Plate>
  );
}

function WhatStays({ decks }: { decks: AccountDeletionOut["sharedDecks"] }) {
  const { t } = useLingui();
  return (
    <View>
      <SectionTitle>{t`Decks other people review`}</SectionTitle>
      <Plate className="px-4">
        {decks.map((deck, index) => (
          <View
            key={deck.id}
            className={`flex-row items-baseline justify-between gap-4 py-3.5 ${index > 0 ? "border-t border-edge" : ""}`}
          >
            <Text className="flex-1 text-md text-ink" numberOfLines={1}>
              {deck.name}
            </Text>
            <Text className="text-base text-ink-muted">
              {plural(deck.members, { one: "# person", other: "# people" })}
            </Text>
          </View>
        ))}
      </Plate>
      <Note>
        {t`Each person who reviews these decks keeps their own copy, with their progress and without your name. To take a deck away from them, archive it first. Archived decks go with your account.`}
      </Note>
      {decks.some((deck) => deck.published) && (
        <Note>{t`Published decks leave Explore, so nobody new can add them.`}</Note>
      )}
    </View>
  );
}

/** Sends the code, then the code step rises as a sheet that rides the keyboard. */
function Confirm({ apple }: { apple: boolean }) {
  const { t } = useLingui();
  const router = useRouter();
  const appleAvailable = useAppleAvailable();
  const remove = useMutation({
    mutationFn: async () => {
      const credential = await requestAppleCredential();
      if (!credential.authorizationCode) throw new Error("Apple returned no authorization code");
      return api.deleteAccount({
        apple: {
          idToken: credential.token,
          nonce: credential.nonce,
          authorizationCode: credential.authorizationCode,
        },
      });
    },
    onSuccess: async () => {
      await authClient.signOut().catch(() => undefined);
      dropQueued();
    },
  });
  const nativeApple = apple && appleAvailable;
  const code = useSendCode({
    onSent: (sentTo) =>
      router.push({
        pathname: "/you/delete-code",
        params: { ...(sentTo ? { sentTo } : {}), ...(apple ? { apple: "1" } : {}) },
      }),
  });
  return (
    <View className="gap-3">
      <View>
        <SectionTitle>{t`Confirm it’s you`}</SectionTitle>
        <Text className="px-1 text-base text-ink-secondary">
          {nativeApple
            ? t`Confirm with Apple to delete your account for good.`
            : t`We’ll email you a 6-digit code. The account is deleted only once you enter it.`}
        </Text>
      </View>
      {nativeApple ? (
        <>
          <Button
            label={t`Delete account`}
            variant="danger"
            size="lg"
            loading={remove.isPending}
            onPress={() => remove.mutate()}
          />
          <ErrorLine>
            {remove.isError && !appleSignInCancelled(remove.error)
              ? t`Couldn’t delete your account. Check your connection and try again.`
              : null}
          </ErrorLine>
        </>
      ) : (
        <>
          <Button label={t`Send code`} size="lg" loading={code.pending} onPress={code.send} />
          <ErrorLine>{code.error}</ErrorLine>
          {apple && <AppleNote />}
        </>
      )}
    </View>
  );
}
