import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import type { Readwise } from "../lib/api";
import { keysQuery, readwiseQuery } from "../lib/queries";
import { yomitanKey } from "../lib/yomitan";
import { lastUsed, shortDate } from "./api-keys-section";
import { Go } from "./next-steps";
import { SettingsGroup } from "./settings-group";
import { Skeleton } from "./skeleton";

const ROW =
  "group flex min-h-16 items-center gap-4 px-4 py-3 transition-[background-color] duration-150 hoverable:hover:veil group-first/row:rounded-t-xl group-last/row:rounded-b-xl";

/** Apps that add cards on their own, one row each; a row's page holds every control. */
export function OtherAppsSection() {
  const { t } = useLingui();
  const state = useQuery(readwiseQuery);
  return (
    <SettingsGroup
      id="other-apps"
      title={t`Add from other apps`}
      description={t`Add cards from what you read in other apps.`}
    >
      <ul aria-label={t`Apps that add cards`} className="edge grid rounded-xl bg-plate">
        <li className="group/row border-edge [&:not(:first-child)]:border-t">
          <Link to="/settings/readwise" className={ROW}>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-md font-medium">Readwise</span>
              {state.isPending ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <Status connection={state.data?.connection ?? null} />
              )}
            </span>
            <Go />
          </Link>
        </li>
        <li className="group/row border-edge [&:not(:first-child)]:border-t">
          <Link to="/settings/yomitan" className={ROW}>
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="text-md font-medium">Yomitan</span>
              <YomitanStatus />
            </span>
            <Go />
          </Link>
        </li>
      </ul>
    </SettingsGroup>
  );
}

function Status({ connection }: { connection: Readwise | null }) {
  const { i18n } = useLingui();
  if (!connection) {
    return (
      <span className="text-sm text-muted text-pretty">
        <Trans>Highlights from Kindle, Kobo, Apple Books and Readwise Reader</Trans>
      </span>
    );
  }
  if (connection.status === "refused") {
    return (
      <span className="flex items-center gap-1 text-sm text-danger">
        <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        <Trans>Readwise no longer accepts your token</Trans>
      </span>
    );
  }
  const at = connection.lastPull?.at;
  if (!at) {
    return (
      <span className="text-sm text-muted">
        <Trans>Connected. Lymi checks every hour.</Trans>
      </span>
    );
  }
  const when = i18n.date(new Date(at), { hour: "numeric", minute: "2-digit" });
  return (
    <span className="text-sm text-muted">
      <Trans>Connected. Last checked at {when}.</Trans>
    </span>
  );
}

function YomitanStatus() {
  const { i18n } = useLingui();
  const keys = useQuery(keysQuery);
  if (keys.isPending) return <Skeleton className="h-4 w-48" />;
  const key = yomitanKey(keys.data);
  if (!key) {
    return (
      <span className="text-sm text-muted text-pretty">
        <Trans>Pop-up dictionary that adds the words you look up</Trans>
      </span>
    );
  }
  return (
    <span className="text-sm text-muted tabular-nums">
      <Trans>
        Key made {shortDate(i18n, key.createdAt)} · {lastUsed(i18n, key.lastRequest)}
      </Trans>
    </span>
  );
}
