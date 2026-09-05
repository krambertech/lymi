import { clsx } from "clsx";
import { AlertCircle, Check } from "lucide-react";
import type { ReactNode } from "react";
import type { AppIdentity } from "../components/AppMark";
import { Button } from "../components/Button";
import { AppIdentityLine, Connection } from "../components/Connection";
import { Skeleton } from "../components/Skeleton";
import { Switch } from "../components/Switch";

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
  onDecide,
}: ConsentProps) {
  const deciding = busy != null;
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 px-6 py-8 pt-safe pb-safe">
      <div className="grid w-full max-w-sm justify-items-center gap-4">
        <Connection app={app} state="asking" />
        <h1 className="max-w-[20ch] text-center text-2xl font-medium leading-tight">
          {loading ? <Skeleton className="h-7 w-56" /> : <>Let {app.name} use your Lymi?</>}
        </h1>
        {loading ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <div className="grid justify-items-center gap-2">
            <AppIdentityLine app={app} />
            {!app.recognised && (
              <p className="max-w-[30ch] text-center text-sm text-muted">
                Lymi does not recognise this app. Check the address is one you meant to use.
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
              <span className="text-base font-medium text-text">See your decks and cards</span>
              <span className="text-sm text-muted">
                List, search and read them. Any connector needs this.
              </span>
            </span>
            <span className="mt-1 shrink-0 text-sm text-muted">Always</span>
          </li>

          {writeRequested && (
            <li className="border-t border-edge pt-2">
              <Switch
                checked={allowWrite}
                onChange={onAllowWrite}
                disabled={deciding}
                leading={<GrantDot on={allowWrite} />}
                label="Add, edit and archive cards"
                description="What it adds lands at once, labelled, and you can undo any of it."
                className="gap-3"
              />
            </li>
          )}
        </ul>

        <div className="mt-4 border-t border-edge pt-4">
          <p className="text-sm font-medium text-text-2">Never, whatever you choose</p>
          <ul className="mt-1.5 grid gap-1">
            {[
              "Grade your reviews or change your progress",
              "Make or read API keys",
              "Sign in as you anywhere else",
            ].map((what) => (
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
            disabled={deciding}
            loading={busy === "deny"}
            onClick={() => onDecide(false)}
          >
            Deny
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={deciding || loading}
            loading={busy === "allow"}
            onClick={() => onDecide(true)}
          >
            Allow
          </Button>
        </div>
        {email && (
          <p className="text-center text-sm text-muted">
            Granting as <span className="text-text-2">{email}</span>
          </p>
        )}
      </div>
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
