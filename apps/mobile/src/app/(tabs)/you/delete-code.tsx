import { useLingui } from "@lingui/react/macro";
import { api, refusalCode } from "@lymi/client/api";
import { meQuery } from "@lymi/client/queries";
import { dropQueued } from "@lymi/client/queued";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { authClient } from "../../../auth/client";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../../../ui/field";
import { FormHeader } from "../../../ui/form-header";
import { KeyboardRoom } from "../../../ui/keyboard";
import { Button, Text } from "../../../ui/primitives";
import { AppleNote, ErrorLine, useSendCode } from "../../../you/deletion";

/** The emailed code and the delete itself, on a sheet that keeps both above the keyboard. */
export default function DeleteCode() {
  const { t } = useLingui();
  const router = useRouter();
  const params = useLocalSearchParams<{ sentTo?: string; apple?: string }>();
  const me = useQuery(meQuery);
  const [sentTo, setSentTo] = useState(params.sentTo ?? null);
  const address = sentTo ?? me.data?.email;
  const [code, setCode] = useState("");
  const [formatError, setFormatError] = useState<string | null>(null);

  const resend = useSendCode({ onSent: (to) => to && setSentTo(to) });
  const remove = useMutation({
    mutationFn: (value: string) => api.deleteAccount({ code: value }),
    // The server ended every session; signing out here lets the root forget this learner.
    onSuccess: async () => {
      await authClient.signOut().catch(() => undefined);
      dropQueued();
    },
  });
  const deleteError = (() => {
    if (!remove.isError) return null;
    switch (refusalCode(remove.error)) {
      case "code_wrong":
        return t`That code isn’t right. Check the email and try again.`;
      case "code_expired":
        return t`This code has expired. Send a new one.`;
      case "publisher":
        return t`This is a Lymi publisher account. It publishes the decks in Explore, so it can’t be deleted here. Write to hello@lymi.app to delete it.`;
      default:
        return t`Couldn’t delete your account. Check your connection and try again.`;
    }
  })();

  const submit = () => {
    if (remove.isPending) return;
    const value = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(value)) {
      setFormatError(t`Enter the 6-digit code from the email.`);
      return;
    }
    setFormatError(null);
    remove.mutate(value);
  };

  return (
    <KeyboardRoom>
      <FormHeader
        close={{ label: t`Cancel`, onPress: () => router.back() }}
        title={t`Enter the code`}
      />
      <ScrollView
        contentContainerClassName="gap-5 px-5 pt-2 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="px-1 text-base text-text-2">
          {address ? t`Sent to ${address}. It works for 15 minutes.` : t`It works for 15 minutes.`}
        </Text>
        <Field disabled={remove.isPending}>
          <FieldLabel>{t`Code from the email`}</FieldLabel>
          <Input
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setFormatError(null);
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={7}
            autoFocus
          />
          <FieldDescription>{t`The account is deleted for good once you press Delete account.`}</FieldDescription>
          <FieldError>{formatError ?? deleteError}</FieldError>
        </Field>
        <Button
          label={t`Delete account`}
          variant="danger"
          size="lg"
          icon="delete"
          loading={remove.isPending}
          onPress={submit}
          testID="delete-account"
        />
        <Button
          label={t`Send a new code`}
          variant="ghost"
          loading={resend.pending}
          onPress={resend.send}
        />
        <ErrorLine>{resend.error}</ErrorLine>
        {params.apple === "1" && <AppleNote />}
      </ScrollView>
    </KeyboardRoom>
  );
}
