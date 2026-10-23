import { Trans, useLingui } from "@lingui/react/macro";
import { BookOpen, KeyRound } from "lucide-react";
import { FreshKey, lastUsed, shortDate } from "../components/api-keys-section";
import { Button } from "../components/button";
import { CopyField } from "../components/copy-field";
import { InlineError } from "../components/inline-error";
import { Screen } from "../components/layout/screen";
import { SettingsGroup } from "../components/settings-group";
import { Skeleton } from "../components/skeleton";
import type { ApiKeySummary } from "../lib/api";

interface Props {
  /** Lymi's AnkiConnect address, which Yomitan calls its server. */
  address: string;
  guide: string;
  /** The newest key named for Yomitan; undefined while the keys load. */
  current: ApiKeySummary | null | undefined;
  /** A key just made, shown once. */
  fresh: { id: string; key: string; name: string } | null;
  onMake: () => void;
  making: boolean;
  onDone: () => void;
  onRevoke: (id: string) => void;
  error: string | null;
}

/**
 * Yomitan talks to Lymi as it would to Anki, so setting it up is pasting two things into its
 * Anki settings. This page hands over both, and the guide says where they go.
 */
export function YomitanView(props: Props) {
  const { t } = useLingui();
  return (
    <Screen title={t`Yomitan`} width="md" back={{ label: t`Settings`, to: "/settings" }}>
      <p className="max-w-[60ch] pb-6 text-base text-text-2">
        <Trans>
          A pop-up dictionary for Chrome, Edge and Firefox. Hold Shift over a word on any page and
          press + to add it as a card, with its reading, its meaning and the sentence you read it
          in.
        </Trans>
      </p>

      <SettingsGroup
        title={t`Setup guide`}
        description={t`Where to paste the address and key in Yomitan, and how to choose a deck for each language.`}
      >
        <Button className="w-fit" render={<a href={props.guide} />}>
          <BookOpen data-icon="inline-start" aria-hidden="true" />
          <Trans>Open the setup guide</Trans>
        </Button>
      </SettingsGroup>

      <SettingsGroup
        title={t`Address and key`}
        description={t`Paste both into Yomitan’s Anki settings.`}
      >
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-text-2">
            <Trans>AnkiConnect server address</Trans>
          </span>
          <CopyField value={props.address} label={t`AnkiConnect server address`} singleLine />
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-text-2">
            <Trans>API key</Trans>
          </span>
          {props.fresh ? (
            <FreshKey
              name={props.fresh.name}
              value={props.fresh.key}
              onDone={props.onDone}
              onRevoke={() => props.fresh && props.onRevoke(props.fresh.id)}
            />
          ) : (
            <KeyState {...props} />
          )}
          {props.error && (
            <p className="text-sm" role="alert">
              <InlineError>{props.error}</InlineError>
            </p>
          )}
        </div>
      </SettingsGroup>
    </Screen>
  );
}

function KeyState({ current, onMake, making }: Props) {
  const { i18n } = useLingui();
  if (current === undefined) return <Skeleton className="h-10 w-64" />;
  return (
    <div className="grid justify-items-start gap-2">
      {current && (
        <p className="text-sm text-muted tabular-nums">
          <Trans>
            Key made {shortDate(i18n, current.createdAt)} · {lastUsed(i18n, current.lastRequest)}.
            Revoke it under API keys.
          </Trans>
        </p>
      )}
      <Button variant={current ? "secondary" : "primary"} loading={making} onClick={onMake}>
        <KeyRound data-icon="inline-start" aria-hidden="true" />
        {current ? <Trans>Make a new key</Trans> : <Trans>Make a key for Yomitan</Trans>}
      </Button>
      {!current && (
        <p className="text-sm text-muted">
          <Trans>It can add cards. Lymi shows it once.</Trans>
        </p>
      )}
    </div>
  );
}
