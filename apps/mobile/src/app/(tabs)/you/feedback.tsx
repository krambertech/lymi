import { Trans, useLingui } from "@lingui/react/macro";
import { ApiError, api } from "@lymi/client/api";
import {
  FEEDBACK_DAILY_LIMIT,
  FEEDBACK_MESSAGE_MAX,
  FeedbackInput,
  type FeedbackKind,
} from "@lymi/core";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { isAppLanguage } from "../../../i18n";
import { usePalette } from "../../../theme/palette";
import { Field, FieldError, FieldLabel, Textarea } from "../../../ui/field";
import { GlassButton } from "../../../ui/glass";
import { KeyboardRoom } from "../../../ui/keyboard";
import { Button, Icon, Text } from "../../../ui/primitives";
import { Segmented } from "../../../ui/segmented";

/**
 * Where a learner writes to Lymi without leaving the app, as the web's feedback dialog. The note
 * stays whatever the send does, so a failure keeps the text and offers the address instead.
 */
export default function Feedback() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const send = useMutation({ mutationFn: (input: FeedbackInput) => api.sendFeedback(input) });
  const overDailyLimit = send.error instanceof ApiError && send.error.status === 409;

  const submit = () => {
    if (send.isPending) return;
    const language = isAppLanguage(i18n.locale) ? i18n.locale : "en";
    const parsed = FeedbackInput.safeParse({ kind, message, screen: "/you", language });
    if (!parsed.success) {
      setInvalid(
        message.trim()
          ? t`Keep the message under ${FEEDBACK_MESSAGE_MAX} characters.`
          : t`Write what you want to tell Lymi.`,
      );
      return;
    }
    setInvalid(null);
    send.mutate(parsed.data);
  };

  if (send.isSuccess) {
    return (
      <View className="gap-5 px-6 pt-10 pb-8" accessibilityLiveRegion="polite">
        <View className="size-12 items-center justify-center rounded-full bg-good-soft">
          <Icon name="check" size={22} colour={p.good} strokeWidth={2.25} />
        </View>
        <View className="gap-1.5">
          <Text className="text-2xl font-medium text-text" accessibilityRole="header">
            {t`Feedback sent`}
          </Text>
          <Text className="text-base text-text-2">
            <Trans>Thank you. Replies come to your email.</Trans>
          </Text>
        </View>
        <Button label={t`Close`} variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardRoom>
      <View className="flex-row items-center justify-between px-4 pt-5 pb-2">
        <GlassButton icon="close" label={t`Cancel`} onPress={() => router.back()} />
        <GlassButton icon="send" label={t`Send`} primary busy={send.isPending} onPress={submit} />
      </View>
      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-2 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1.5">
          <Text className="text-2xl font-medium text-text" accessibilityRole="header">
            {t`Send feedback`}
          </Text>
          <Text className="text-base text-text-2">
            <Trans>Tell Lymi what broke or what it should do. Replies come to your email.</Trans>
          </Text>
        </View>
        <View className="gap-1.5">
          <Text className="px-1 text-sm font-medium text-text-2">
            <Trans>What this is about</Trans>
          </Text>
          <Segmented<FeedbackKind>
            label={t`What this is about`}
            value={kind}
            onChange={setKind}
            options={[
              { value: "bug", label: t`Bug` },
              { value: "idea", label: t`Idea` },
              { value: "other", label: t`Other` },
            ]}
          />
        </View>
        <Field disabled={send.isPending}>
          <FieldLabel>{t`Message`}</FieldLabel>
          <Textarea
            value={message}
            autoFocus
            maxLength={FEEDBACK_MESSAGE_MAX}
            onChangeText={(text) => {
              setMessage(text);
              setInvalid(null);
            }}
          />
          <FieldError>{invalid}</FieldError>
        </Field>
        <Text className="px-1 text-sm text-muted">
          <Trans>
            Lymi also gets the screen you are on, the app version, your phone and your app language.
          </Trans>
        </Text>
        {send.isError && (
          <View
            className="gap-1 rounded-lg bg-danger-soft px-3.5 py-3"
            accessibilityLiveRegion="assertive"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="alert" size={16} colour={p.danger} />
              <Text className="text-base font-medium text-danger">
                {t`Couldn’t send your feedback`}
              </Text>
            </View>
            <Text className="text-base text-text-2">
              {overDailyLimit ? (
                <Trans>
                  You can send {FEEDBACK_DAILY_LIMIT} messages a day. Try again tomorrow.
                </Trans>
              ) : (
                <Trans>
                  Your message is still here. Try again, or write to{" "}
                  <Text
                    className="font-medium underline"
                    onPress={() => Linking.openURL("mailto:hello@lymi.app")}
                  >
                    hello@lymi.app
                  </Text>
                  .
                </Trans>
              )}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardRoom>
  );
}
