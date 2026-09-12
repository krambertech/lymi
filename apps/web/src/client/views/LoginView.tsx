import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { type AppIdentity, AppMark } from "../components/AppMark";
import { AuthFrame } from "../components/AuthFrame";
import { AuthNotice } from "../components/AuthNotice";
import { Button } from "../components/Button";
import { publicSiteUrl } from "../lib/origins";

export interface LoginProps {
  onGoogle?: (() => void | Promise<void>) | undefined;
  busy?: boolean | undefined;
  /**
   * Set when an MCP client sent the learner here from its own sign-in. The door then says
   * who is waiting on the other side, so the consent screen is not the first mention of it.
   */
  app?: AppIdentity | undefined;
  /** Shown in place of the fine print when sign-in fails. */
  error?: ReactNode | undefined;
  /** A valid Google account that simply has no invitation. This is a path, not a failure. */
  blocked?: boolean | undefined;
  children?: ReactNode | undefined;
}

/** The front door. Authentication stays focused; requesting an invitation has its own route. */
export function LoginView({ onGoogle, busy, app, error, blocked = false, children }: LoginProps) {
  return (
    <AuthFrame footer={children} homeHref={publicSiteUrl()}>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 @xl:p-10">
        {app ? (
          <div className="flex flex-col items-center text-center">
            <AppMark app={app} className="size-12" />
            <h1 className="mt-4 text-2xl font-medium tracking-[-0.02em] text-text">
              Continue to {app.name}
            </h1>
            <p className="mt-2 max-w-[36ch] text-md text-text-2">
              Sign in before choosing what it may do.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-text">
              <Trans>Sign in to Lymi</Trans>
            </h1>
            <p className="mx-auto mt-2 max-w-[38ch] text-md text-text-2">
              Use the Google account that received your invitation.
            </p>
          </div>
        )}

        {error && (
          <AuthNotice
            role={blocked ? "status" : "alert"}
            tone={blocked ? "neutral" : "danger"}
            className="mt-6"
          >
            {error}
          </AuthNotice>
        )}

        <Button
          variant="primary"
          size="lg"
          loading={busy}
          onClick={onGoogle}
          className="mt-7 w-full"
        >
          {blocked ? "Try another Google account" : "Continue with Google"}
        </Button>
        <p className="mt-6 text-center text-sm text-muted">
          {blocked ? "Still need an invitation?" : "Need an invitation?"}{" "}
          <a
            href={publicSiteUrl("/join")}
            className="rounded-sm font-medium text-text underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:decoration-current"
          >
            Request an invitation
          </a>
        </p>
      </section>
    </AuthFrame>
  );
}
