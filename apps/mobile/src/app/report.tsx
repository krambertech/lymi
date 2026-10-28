import { Trans, useLingui } from "@lingui/react/macro";
import { ApiError, api } from "@lymi/client/api";
import {
  CONTENT_REPORT_DAILY_LIMIT,
  CONTENT_REPORT_NOTE_MAX,
  type ContentReportReason,
  type ContentReportTarget,
  isolate,
} from "@lymi/core";
import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { FieldName } from "../capture/composer-field";
import { haptics } from "../theme/haptics";
import { usePalette } from "../theme/palette";
import { Field, FieldDescription, FieldError, FieldLabel, Textarea } from "../ui/field";
import { FormHeader } from "../ui/form-header";
import { KeyboardRoom } from "../ui/keyboard";
import { Icon, Plate, Text } from "../ui/primitives";
import { Radio } from "../ui/radio";
import { toast } from "../ui/toast-host";

/** Where a link to this sheet says what is being reported. */
export type ReportParams =
  | { kind: "deck"; id: string; name: string }
  | { kind: "card"; id: string; name: string };

function targetOf(params: Partial<ReportParams>): ContentReportTarget | null {
  if (!params.id) return null;
  if (params.kind === "deck") return { kind: "deck", deckId: params.id };
  if (params.kind === "card") return { kind: "card", cardId: params.id };
  return null;
}

/**
 * The web's report dialog as a sheet: what's wrong, an optional note, and Send in the header. A
 * sent report closes the sheet with a toast; a failed one keeps the form and offers the address.
 */
export default function Report() {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const params = useLocalSearchParams<Partial<ReportParams>>();
  const target = targetOf(params);
  const [reason, setReason] = useState<ContentReportReason | null>(null);
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);

  const send = useMutation({
    mutationFn: (input: { target: ContentReportTarget; reason: ContentReportReason }) =>
      api.reportContent({ ...input, note: note.trim() || undefined }),
    onSuccess: () => {
      haptics.success();
      router.back();
      toast.add({ title: t`Report sent. We’ll look within a day.` });
    },
  });
  const overDailyLimit = send.error instanceof ApiError && send.error.status === 409;

  const submit = () => {
    if (send.isPending || !target) return;
    if (!reason) {
      setMissing(true);
      return;
    }
    send.mutate({ target, reason });
  };

  const reasons: { value: ContentReportReason; label: string }[] = [
    { value: "offensive", label: t`Hateful or offensive` },
    { value: "sexual", label: t`Sexual content` },
    { value: "harassment", label: t`Harassment or bullying` },
    { value: "spam", label: t`Spam or a scam` },
    { value: "other", label: t`Something else` },
  ];
  const name = params.name ?? "";

  return (
    <KeyboardRoom>
      <FormHeader
        close={{ label: t`Cancel`, onPress: () => router.back() }}
        title={params.kind === "card" ? t`Report card` : t`Report deck`}
        action={{ icon: "send", label: t`Send report`, busy: send.isPending, onPress: submit }}
      />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-2 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="px-1 text-base text-ink-secondary">
          {t`Tell Lymi what’s wrong with “${isolate(name)}”. We read every report within a day, and the owner isn’t told who sent it.`}
        </Text>
        <View className="gap-2.5">
          <FieldName>{t`What’s wrong`}</FieldName>
          <Plate className="overflow-hidden" accessibilityRole="radiogroup">
            {reasons.map((o, i) => {
              const chosen = reason === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    haptics.tick();
                    setReason(o.value);
                    setMissing(false);
                  }}
                  disabled={send.isPending}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={o.label}
                  className={`min-h-12 flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
                  style={({ pressed }) => (pressed ? { backgroundColor: p["plate-hover"] } : null)}
                >
                  <Text className="flex-1 text-md text-ink">{o.label}</Text>
                  <Radio on={chosen} />
                </Pressable>
              );
            })}
          </Plate>
          {missing && <FieldError>{t`Choose what’s wrong with it.`}</FieldError>}
        </View>
        <Field disabled={send.isPending}>
          <FieldLabel>{t`Note`}</FieldLabel>
          <Textarea value={note} maxLength={CONTENT_REPORT_NOTE_MAX} onChangeText={setNote} />
          <FieldDescription>{t`Optional. Anything that helps us understand.`}</FieldDescription>
        </Field>
        {send.isError && (
          <View
            className="gap-1 rounded-lg bg-danger-soft px-3.5 py-3"
            accessibilityLiveRegion="assertive"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="alert" size={16} colour={p.danger} />
              <Text className="text-base font-medium text-danger">
                {t`Couldn’t send your report`}
              </Text>
            </View>
            <Text className="text-base text-ink-secondary">
              {overDailyLimit ? (
                <Trans>
                  You can send {CONTENT_REPORT_DAILY_LIMIT} reports a day. Write to hello@lymi.app
                  if this can’t wait.
                </Trans>
              ) : (
                <Trans>
                  Try again, or write to{" "}
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
