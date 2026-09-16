import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { AlertCircle, Check } from "lucide-react";
import type { ReactNode } from "react";
import type { AppIdentity } from "../components/app-mark";
import { Button } from "../components/button";
import { AppIdentityLine, Connection } from "../components/connection";
import { PublicPolicyLinks } from "../components/public-policy-links";
import { Skeleton } from "../components/skeleton";
import { Field, FieldContent, FieldDescription, FieldLabel } from "../components/ui/field";
import { Switch } from "../components/ui/switch";

export interface ConsentProps {
  app: AppIdentity;
  /** Still fetching the client's metadata. The shape holds so nothing jumps when it lands. */
  loading?: boolean | undefined;
  /** The account the grant will be made against. */
  email?: string | undefined;
  /** The app asked for write as well as read. Read is not optional; write is the learner's call. */
  writeRequested: boolean;
  allowWrite: boolean;
  onAllowWrite: (v: boolean) => void;
  busy?: "allow" | "deny" | null | undefined;
  error?: ReactNode | undefined;
  /** The request cannot be acted on at all, e.g. the link carries no client_id. */
  unusable?: boolean | undefined;
  onDecide: (accept: boolean) => void;
}

/**
 * The stop between an MCP client's sign-in and its first request. Everything it will be able
 * to do is on this screen, in the order it matters: who is asking, what they get, what they
 * never get. Read is the price of the connector working at all, so it is stated rather than
 * offered; write is a switch, because it is the only real decision here.
 */
export function ConsentView({
  app,
  loading,
  email,
  writeRequested,
  allowWrite,
  onAllowWrite,
  busy,
  error,
  unusable,
  onDecide,
}: ConsentProps) {
  const { t } = useLingui();
  const deciding = busy != null;
  const appName = app.name;
  const claimed = app.claimed;
  const never = [
    t`Grade your reviews or change your progress`,
    t`Create or read API keys`,
    t`Sign in as you anywhere else`,
  ];
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 px-6 py-8 pt-safe pb-safe">
      <div className="grid w-full max-w-sm justify-items-center gap-4">
        <Connection app={app} state="asking" />
        <h1 className="max-w-[20ch] text-center text-2xl font-medium leading-tight">
          {loading ? (
            <Skeleton className="h-7 w-56" />
          ) : appName ? (
            <Trans>Let {appName} use your Lymi?</Trans>
          ) : (
            // A request that named nothing gets its own sentence; no placeholder goes in the gap.
            <Trans>Let this app use your Lymi?</Trans>
          )}
        </h1>
        {loading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <div className="grid justify-items-center gap-2">
            <AppIdentityLine app={app} />
            {!app.recognised && (
              <p className="max-w-[32ch] text-center text-sm text-muted">
                {claimed ? (
                  <Trans>
                    It calls itself “{claimed}”. Lymi cannot check that. The address above is the
                    part that is checked.
                  </Trans>
                ) : (
                  <Trans>
                    Lymi does not recognise this app. Check the address is one you meant to use.
                  </Trans>
                )}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="edge w-full max-w-sm rounded-xl bg-plate p-5">
        <ul className="grid gap-1">
          <li className="flex items-start gap-3 py-1">
            <GrantDot on />
            <span className="grid flex-1 gap-0.5">
              <span className="text-base font-medium text-text">
                <Trans>See your decks and cards</Trans>
              </span>
              <span className="text-sm text-muted">
                <Trans>List, search and read them. Any connector needs this.</Trans>
              </span>
            </span>
            <span className="mt-1 shrink-0 text-sm text-muted">
              <Trans>Always</Trans>
            </span>
          </li>

          {writeRequested && (
            <li className="border-t border-edge pt-2">
              <Field
                orientation="horizontal"
                disabled={deciding}
                className="relative min-h-11 gap-3 py-1"
              >
                <GrantDot on={allowWrite} />
                <FieldContent className="gap-0.5">
                  {/* Stretched over the row, so a tap on the sentence flips the switch too. */}
                  <FieldLabel className="text-base text-text after:absolute after:inset-0 after:content-['']">
                    <Trans>Add, edit and archive cards</Trans>
                  </FieldLabel>
                  <FieldDescription>
                    <Trans>
                      What it adds lands at once and is labelled. You can edit or archive any of it.
                    </Trans>
                  </FieldDescription>
                </FieldContent>
                {/* One line tall at the label's size, so the track centres on the label's first line. */}
                <span className="flex h-lh shrink-0 items-center text-base">
                  <Switch checked={allowWrite} onCheckedChange={onAllowWrite} />
                </span>
              </Field>
            </li>
          )}
        </ul>

        <div className="mt-4 border-t border-edge pt-4">
          <p className="text-sm font-medium text-text-2">
            <Trans>Never, whatever you choose</Trans>
          </p>
          <ul className="mt-1.5 grid gap-1">
            {never.map((what) => (
              <li key={what} className="flex items-start gap-2 text-sm text-muted">
                <span
                  aria-hidden="true"
                  className="mt-[9px] h-px w-2.5 shrink-0 rounded-full bg-faint"
                />
                <span>{what}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid w-full max-w-sm gap-3">
        {error && (
          <p className="enter-fade flex items-start gap-2 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            aria-disabled={deciding || unusable}
            loading={busy === "deny"}
            onClick={() => onDecide(false)}
          >
            <Trans>Deny</Trans>
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            aria-disabled={deciding || loading || unusable}
            loading={busy === "allow"}
            onClick={() => onDecide(true)}
          >
            <Trans>Allow</Trans>
          </Button>
        </div>
        {email && (
          <p className="text-center text-sm text-muted">
            <Trans>
              Granting as <span className="text-text-2">{email}</span>
            </Trans>
          </p>
        )}
      </div>
      <PublicPolicyLinks />
    </div>
  );
}

/** Mirrors between the two rows, so what the app ends up with is readable at a glance. */
function GrantDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full transition-colors duration-150",
        on ? "bg-good-soft text-good" : "edge-2 text-transparent",
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  );
}
