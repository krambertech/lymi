import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import type { Readwise } from "../lib/api";
import { readwiseQuery } from "../lib/queries";
import { Go } from "./next-steps";
import { SettingsGroup } from "./settings-group";
import { Skeleton } from "./skeleton";

/** Sources Lymi reads on its own schedule; Readwise is the first. Its page holds every control. */
export function ReadingSection() {
  const { t } = useLingui();
  const state = useQuery(readwiseQuery);
  return (
    <SettingsGroup
      id="reading"
      title={t`Reading`}
      description={t`Turn the words you highlight while reading into cards.`}
    >
      {state.isPending ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : (
        <Link
          to="/settings/readwise"
          className="edge group flex min-h-16 items-center gap-4 rounded-xl bg-plate px-4 py-3 transition-[background-color] duration-150 hoverable:hover:veil"
        >
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-md font-medium">Readwise</span>
            <Status connection={state.data?.connection ?? null} />
          </span>
          <Go />
        </Link>
      )}
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
