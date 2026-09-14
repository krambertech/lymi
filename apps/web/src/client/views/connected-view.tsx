import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import type { AppIdentity } from "../components/app-mark";
import { AppIdentityLine, Connection } from "../components/connection";

export interface ConnectedProps {
  app: AppIdentity;
  /** What the app ended up with. Omitted on a refusal. */
  scopes?: { read: boolean; write: boolean } | undefined;
  refused?: boolean | undefined;
  /** Link back into the app, e.g. Settings. Rendered only when there is somewhere to go. */
  action?: ReactNode | undefined;
}

/**
 * The ending. An MCP client's redirect is usually a custom scheme, so the browser hands off
 * to the app and leaves this tab sitting where it was; before this screen existed, that was a
 * blank consent page. Now the tab says what happened and that it is finished with.
 */
export function ConnectedView({ app, scopes, refused, action }: ConnectedProps) {
  const appName = app.name;
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center pt-safe pb-safe">
      <div className="grid w-full max-w-sm justify-items-center gap-4">
        <Connection app={app} state={refused ? "refused" : "connected"} />
        <h1 className="max-w-[22ch] text-2xl font-medium leading-tight">
          {refused ? (
            <Trans>{appName} was not connected</Trans>
          ) : (
            <Trans>{appName} is connected</Trans>
          )}
        </h1>
        <AppIdentityLine app={app} />
      </div>

      <p className="max-w-[34ch] text-md text-text-2">
        {refused ? (
          <Trans>Nothing was shared. You can start again from {appName} whenever you like.</Trans>
        ) : scopes?.write ? (
          <Trans>It can read your cards, and add, edit and archive them.</Trans>
        ) : (
          <Trans>It can read your decks and cards. It cannot change anything.</Trans>
        )}
      </p>

      <p className="text-sm text-muted">
        {refused ? (
          <Trans>You can close this tab.</Trans>
        ) : (
          <Trans>Head back to the app. You can close this tab.</Trans>
        )}
      </p>

      {action}
    </div>
  );
}
