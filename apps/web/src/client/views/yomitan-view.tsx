import { Trans, useLingui } from "@lingui/react/macro";
import { KeyRound } from "lucide-react";
import { lastUsed, shortDate } from "../components/api-keys-section";
import { AppActivity, AppConnect, AppPage, AppSection, AppStop } from "../components/app-page";
import { Button } from "../components/button";
import { CopyField } from "../components/copy-field";
import { InlineError } from "../components/inline-error";
import { Skeleton } from "../components/skeleton";
import { YomitanMark } from "../components/yomitan-mark";
import type { ApiKeySummary } from "../lib/api";
import { YOMITAN_ACTIVITY_APP } from "../lib/yomitan";

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
  revoking: boolean;
  error: string | null;
}

/**
 * Yomitan talks to Lymi as it would to Anki, so connecting it is pasting Lymi's address and a key
 * into its Anki settings. Its page is on the template every app shares. docs/design/app-pages.md.
 */
export function YomitanView(props: Props) {
  const { t } = useLingui();
  const { current } = props;
  const status = useStatus(current);
  return (
    <AppPage
      appKey="yomitan"
      name="Yomitan"
      mark={<YomitanMark className="size-14" />}
      status={status}
      does={t`A pop-up dictionary for Chrome, Edge and Firefox. Hold Shift over a word on any page and press + to add it as a card, with its reading, its meaning and the sentence you read it in.`}
    >
      {current === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : current === null ? (
        <Connect {...props} />
      ) : (
        <>
          <Settings {...props} current={current} />
          <AppActivity appKey="yomitan" app={YOMITAN_ACTIVITY_APP} name="Yomitan" />
          <Connect {...props} />
          <AppStop
            consequence={t`Lymi revokes Yomitan’s key, so Yomitan can no longer add cards or find duplicates. Cards it added stay.`}
            label={t`Disconnect Yomitan`}
            keep={t`Stay connected`}
            onStop={() => props.onRevoke(current.id)}
            stopping={props.revoking}
          />
        </>
      )}
    </AppPage>
  );
}

function useStatus(current: ApiKeySummary | null | undefined) {
  const { t, i18n } = useLingui();
  if (current === undefined) return undefined;
  if (current === null) return { label: t`Not connected`, tone: "muted" as const };
  const made = shortDate(i18n, current.createdAt);
  if (!current.lastRequest) {
    return {
      label: t`Not used yet`,
      tone: "muted" as const,
      detail: t`Key made ${made}. Paste it into Yomitan’s Anki settings.`,
    };
  }
  const used = lastUsed(i18n, current.lastRequest);
  return {
    label: t`Connected`,
    tone: "good" as const,
    detail: (
      <Trans>
        Key made {made} · {used}
      </Trans>
    ),
  };
}

/** Settings: the key Yomitan holds, and the way to replace it. */
function Settings(props: Props & { current: ApiKeySummary }) {
  const { t } = useLingui();
  return (
    <AppSection title={t`Settings`}>
      <div className="edge grid justify-items-start gap-3 rounded-xl bg-plate px-4 py-4">
        {props.fresh ? (
          <KeyReady value={props.fresh.key} onDone={props.onDone} />
        ) : (
          <>
            <div className="grid gap-0.5">
              <span className="text-md font-medium text-ink">
                <Trans>API key</Trans>
              </span>
              <span className="text-sm text-ink-muted text-pretty">
                <Trans>A new key replaces this one, and this one stops working.</Trans>
              </span>
            </div>
            <Button variant="secondary" loading={props.making} onClick={props.onMake}>
              <KeyRound data-icon="inline-start" aria-hidden="true" />
              <Trans>Replace the key</Trans>
            </Button>
          </>
        )}
        <KeyError error={props.error} />
      </div>
    </AppSection>
  );
}

/** How it connects: the steps, Lymi's address, and the first key until there is one. */
function Connect(props: Props) {
  const { t } = useLingui();
  return (
    <AppConnect
      name="Yomitan"
      intro={
        <Trans>
          Yomitan adds cards to Lymi as it would to Anki. It sends each word you look up to check
          for a duplicate, and Lymi keeps nothing from a check.
        </Trans>
      }
      steps={[
        <Trans key="copy">Copy Lymi’s address and make a key for Yomitan.</Trans>,
        <Trans key="paste">
          In Yomitan’s settings, turn on <span className="font-medium text-ink">Anki</span> and
          paste both.
        </Trans>,
        <Trans key="deck">
          For each dictionary, choose a Lymi deck and the note type{" "}
          <span className="font-medium text-ink">Lymi card</span>.
        </Trans>,
      ]}
      guide={props.guide}
    >
      <div className="grid gap-4 border-t border-edge pt-4">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-ink-secondary">
            <Trans>AnkiConnect server address</Trans>
          </span>
          <CopyField value={props.address} label={t`AnkiConnect server address`} singleLine />
        </div>
        {props.current === null && (
          <div className="grid justify-items-start gap-2">
            <Button variant="primary" loading={props.making} onClick={props.onMake}>
              <KeyRound data-icon="inline-start" aria-hidden="true" />
              <Trans>Make a key for Yomitan</Trans>
            </Button>
            <KeyError error={props.error} />
          </div>
        )}
      </div>
    </AppConnect>
  );
}

/** The key just made: shown once, to copy into Yomitan, with Stop below for taking it back. */
function KeyReady({ value, onDone }: { value: string; onDone: () => void }) {
  const { t } = useLingui();
  return (
    <div role="status" className="enter-card grid w-full justify-items-start gap-3">
      <p className="text-base text-ink">
        <Trans>Your key is ready. Copy it now. You won’t see it again.</Trans>
      </p>
      <CopyField value={value} label={t`API key for Yomitan`} className="w-full" />
      <Button variant="secondary" onClick={onDone}>
        <Trans>Done</Trans>
      </Button>
    </div>
  );
}

function KeyError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm" role="alert">
      <InlineError>{error}</InlineError>
    </p>
  );
}
