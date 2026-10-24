import { useLingui } from "@lingui/react/macro";
import { type AiConsentPlace, aiChoice, saveAiChoice } from "@lymi/client/ai-consent";
import { settingsQuery } from "@lymi/client/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openBrowserAsync } from "expo-web-browser";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { localizedSiteUrl } from "../auth/client";
import { captureEvent } from "../telemetry/posthog";
import { usePalette } from "../theme/palette";
import type { IconName } from "../ui/icons";
import { Button, Icon, Text } from "../ui/primitives";
import { Row, RowFace } from "../ui/row";
import { Sheet, SheetError, SheetGroup, SheetNote } from "../ui/sheet";
import { Switch } from "../ui/switch";

// Lymi sends nothing to an AI service from the phone until the learner allows it here. ADR 0039.

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

// Every AI choice uses the same feature descriptions. ADR 0039.
export function AiServices() {
  const { t } = useLingui();
  return (
    <SheetGroup>
      <ServiceLine
        icon="manual"
        label={t`Fill in your cards`}
        line={t`Add a term and AI fills in missing meanings, examples and more.`}
      />
      <ServiceLine
        icon="camera"
        label={t`Turn lessons into cards`}
        line={t`Smart add finds terms in your photos, PDFs and notes.`}
      />
      <ServiceLine
        icon="pronunciation"
        label={t`Hear pronunciation`}
        line={t`Listen to terms and examples read aloud.`}
      />
    </SheetGroup>
  );
}

export function AiDisclosure() {
  const { t, i18n } = useLingui();
  return (
    <SheetNote>
      {t`These features send relevant card text and lesson material to third-party AI services.`}{" "}
      <Text
        className="text-sm font-medium text-amber-text"
        accessibilityRole="link"
        onPress={() => void openBrowserAsync(localizedSiteUrl("/privacy", i18n.locale))}
      >
        {t`See what’s shared and with whom in our privacy policy.`}
      </Text>
    </SheetNote>
  );
}

/**
 * The account's answer and a way to ask for it. `ask` opens the sheet and settles once it has gone:
 * true after Turn on AI, false after Not now or a swipe. Render `sheet` in the screen that asks.
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
        // The server keeps the newest answer, so what it saved decides, not the tap.
        if (allowed) answer.current = (await saveAiChoice(qc, true, place)).aiConsent === true;
        else {
          answer.current = false;
          void saveAiChoice(qc, false, place).catch(() => undefined);
        }
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
      title={t`Use AI in Lymi?`}
    >
      <AiServices />
      <AiDisclosure />
      {failed && <SheetError>{t`Couldn’t save. Check your connection and try again.`}</SheetError>}
      <ConsentButtons
        busy={busy}
        onAllow={() => void answer(true)}
        onLater={() => void answer(false)}
      />
    </Sheet>
  );
}

/** Turn on AI and Not now, with the line under them; Welcome's step uses the same. */
export function ConsentButtons({
  busy,
  onAllow,
  onLater,
}: {
  busy: boolean;
  onAllow: () => void;
  onLater: () => void;
}) {
  const { t } = useLingui();
  return (
    <View className="gap-1 pt-1">
      <Button label={t`Turn on AI`} variant="primary" size="lg" loading={busy} onPress={onAllow} />
      <Button label={t`Not now`} variant="ghost" size="lg" disabled={busy} onPress={onLater} />
      <Text className="pt-1 text-center text-sm text-muted">
        {t`This choice applies on mobile and web. Change it any time in You → AI services.`}
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
        value={on ? t`On` : t`Off`}
        onPress={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={setOpen} title={t`AI services`}>
        <SheetGroup>
          <RowFace
            icon="ai"
            label={t`Use AI services`}
            control={
              <Switch
                checked={on}
                disabled={!settings.isSuccess}
                onCheckedChange={(allowed) => save.mutate(allowed)}
                accessibilityLabel={t`Use AI services`}
              />
            }
          />
        </SheetGroup>
        {save.isError && (
          <SheetError>{t`Couldn’t save. Check your connection and try again.`}</SheetError>
        )}
        <AiServices />
        <AiDisclosure />
        <SheetNote>
          {t`This setting applies to your account on all devices. Turning it off stops Lymi from sending new content to AI services. Existing card text and saved audio stay.`}
        </SheetNote>
      </Sheet>
    </>
  );
}
