import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { type AppIdentity, AppMark } from "../components/AppMark";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { Wordmark } from "../components/Logo";

export interface LoginProps {
  onGoogle?: (() => void | Promise<void>) | undefined;
  busy?: boolean | undefined;
  /**
   * Set when an MCP client sent the learner here from its own sign-in. The door then says
   * who is waiting on the other side, so the consent screen is not the first mention of it.
   */
  app?: AppIdentity | undefined;
  /** Why the last attempt failed. Says what to do, not what went wrong internally. */
  error?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

/** The front door. The lantern is already lit: you are expected. */
export function LoginView({ onGoogle, busy, app, error, children }: LoginProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center pt-safe pb-safe">
      <Lantern className="size-28 @3xl:size-32" flicker glow />
      <Wordmark size={30} flame className="mt-5 text-text" title="Lymi" />

      {app ? (
        <p className="mt-1 flex max-w-[32ch] items-center gap-2 text-md text-text-2">
          <AppMark app={app} className="size-7 rounded-sm" />
          <span>
            <span className="font-medium text-text">{app.name}</span> is waiting to connect
          </span>
        </p>
      ) : (
        <p className="max-w-[28ch] text-md text-muted">Vocabulary you carry with you.</p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="mt-6 min-w-60"
        loading={busy}
        onClick={onGoogle}
      >
        Continue with Google
      </Button>

      {error ? (
        <p
          className="enter-fade mt-3 flex max-w-[34ch] items-start gap-2 text-left text-sm text-danger"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {app
            ? "Sign in, then choose what it may do."
            : "Private for now. Only invited accounts can sign in."}
        </p>
      )}

      {children}
    </div>
  );
}
