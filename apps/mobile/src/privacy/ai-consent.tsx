import { useLingui } from "@lingui/react/macro";
import { type AiConsentPlace, aiChoice, saveAiChoice } from "@lymi/client/ai-consent";
import { settingsQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openBrowserAsync } from "expo-web-browser";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { siteUrl } from "../auth/client";
import { captureEvent } from "../telemetry/posthog";
import { usePalette } from "../theme/palette";
import type { IconName } from "../ui/icons";
import { Button, Icon, Text } from "../ui/primitives";
import { Row, RowFace } from "../ui/row";
import { Sheet, SheetError, SheetGroup, SheetNote } from "../ui/sheet";
import { Switch } from "../ui/switch";

// Lymi sends nothing to an AI service from the phone until the learner allows it here. ADR 0038.

function ServiceLine({ icon, label, line }: { icon: IconName; label: string; line: string }) {
  const p = usePalette();
  return (
    <View className="flex-row items-start gap-3 py-3 ps-4 pe-3.5" accessible>
      <View className="w-5 items-center pt-0.5">
        <Icon name={icon} size={20} colour={p["text-2"]} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-md text-text">{label}</Text>
        <Text className="text-sm text-muted">{line}</Text>
      </View>
    </View>
  );
}

/** What each feature sends and where, the same wherever the learner is asked. */
export function AiServices() {
  const { t } = useLingui();
  return (
    <SheetGroup>
      <ServiceLine
        icon="manual"
        label={t`Filling in cards`}
        line={t`The term, meaning, example and notes go to OpenAI.`}
      />
      <ServiceLine
        icon="camera"
        label={t`Smart add`}
        line={t`Your photos, PDFs and notes go to Anthropic and Cloudflare.`}
      />
      <ServiceLine
        icon="pronunciation"
        label={t`Pronunciation`}
        line={t`The term goes to Google, OpenAI or ElevenLabs to be spoken.`}
      />
    </SheetGroup>
  );
}

export function openPrivacyPolicy() {
  void openBrowserAsync(siteUrl("/privacy"));
}

/**
 * The account's answer and a way to ask for it. `ask` opens the sheet and settles once it has gone:
 * true after Allow, false after Not now or a swipe. Render `sheet` in the screen that asks.
 */
export function useAiConsent(place: AiConsentPlace) {
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const choice = aiChoice(settings.data);
  const [open, setOpen] = useState(false);
  const answer = useRef<boolean>(false);
  const settle = useRef<((allowed: boolean) => void) | null>(null);

  const ask = useCallback((): Promise<boolean> => {
    if (choice === true) return Promise.resolve(true);
    captureEvent("ai_consent_shown", { place });
    answer.current = false;
    setOpen(true);
    return new Promise((resolve) => {
      settle.current = resolve;
    });
  }, [choice, place]);

  const sheet = (
    <AiConsentSheet
      open={open}
      onAnswer={async (allowed) => {
        // A failed yes keeps the sheet up with its error; a failed no changes nothing on the server.
        if (allowed) await saveAiChoice(qc, true, place);
        else void saveAiChoice(qc, false, place).catch(() => undefined);
        answer.current = allowed;
        setOpen(false);
      }}
      onClose={() => setOpen(false)}
      onDismiss={() => {
        settle.current?.(answer.current);
        settle.current = null;
      }}
    />
  );
  return {
    choice,
    allowed: choice === true,
    ready: settings.isSuccess,
    userId: settings.data?.userId,
    ask,
    sheet,
  };
}

function AiConsentSheet({
  open,
  onAnswer,
  onClose,
  onDismiss,
}: {
  open: boolean;
  onAnswer: (allowed: boolean) => Promise<void>;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const { t } = useLingui();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const answer = async (allowed: boolean) => {
    setFailed(false);
    setBusy(allowed);
    try {
      await onAnswer(allowed);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      onDismiss={onDismiss}
      title={t`Use AI with your cards?`}
      description={t`Lymi sends what you add to these services. You can change this any time in You.`}
    >
      <AiServices />
      {failed && <SheetError>{t`Couldn’t save. Check your connection and try again.`}</SheetError>}
      <ConsentButtons
        busy={busy}
        onAllow={() => void answer(true)}
        onLater={() => void answer(false)}
      >
        {t`Without it, you add and review cards as usual.`}
      </ConsentButtons>
    </Sheet>
  );
}

/** Allow and Not now, with the line under them; Welcome's step uses the same. */
export function ConsentButtons({
  busy,
  onAllow,
  onLater,
  children,
}: {
  busy: boolean;
  onAllow: () => void;
  onLater: () => void;
  children: ReactNode;
}) {
  const { t } = useLingui();
  return (
    <View className="gap-1 pt-1">
      <Button label={t`Allow`} variant="primary" size="lg" loading={busy} onPress={onAllow} />
      <Button label={t`Not now`} variant="ghost" size="lg" disabled={busy} onPress={onLater} />
      <Text className="pt-1 text-center text-sm text-muted">
        {children}{" "}
        <Text className="text-sm font-medium text-amber-text" onPress={openPrivacyPolicy}>
          {t`Privacy policy`}
        </Text>
      </Text>
    </View>
  );
}

/** You's row for the account's AI choice, and the sheet that changes it. */
export function AiServicesRow() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const [open, setOpen] = useState(false);
  const save = useMutation({
    // Saved, never queued: the choice decides what the next request may send.
    networkMode: "always",
    mutationFn: (allowed: boolean) => saveAiChoice(qc, allowed, "settings"),
  });
  const on = save.isPending ? !!save.variables : aiChoice(settings.data) === true;
  return (
    <>
      <Row
        icon="ai"
        label={t`AI services`}
        value={on ? t`Allowed` : t`Off`}
        onPress={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={setOpen} title={t`AI services`}>
        <SheetGroup>
          <RowFace
            icon="ai"
            label={t`Use AI with your cards`}
            control={
              <Switch
                checked={on}
                disabled={!settings.isSuccess}
                onCheckedChange={(allowed) => save.mutate(allowed)}
                accessibilityLabel={t`Use AI with your cards`}
              />
            }
          />
        </SheetGroup>
        {save.isError && (
          <SheetError>{t`Couldn’t save. Check your connection and try again.`}</SheetError>
        )}
        <AiServices />
        <SheetNote>
          {t`Turning it off stops anything new from being sent. What AI already wrote stays on your cards.`}
        </SheetNote>
      </Sheet>
    </>
  );
}
