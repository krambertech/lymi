import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { yomitanKey } from "@lymi/client/apps";
import { connectedAppsQuery, keysQuery, readwiseQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import { AppsList } from "../../../../apps/apps-list";
import { ASSISTANTS, assistantOf } from "../../../../apps/catalog";
import { FieldError } from "../../../../ui/field";
import { LoadFailed, useLoadFailed } from "../../../../ui/load-failed";
import { Screen } from "../../../../ui/screen";
import { Skeleton } from "../../../../ui/skeleton";

/** Every app that adds cards, connected or not, as the web's Apps group in Settings. app-pages.md. */
export default function Apps() {
  const { t } = useLingui();
  const apps = useQuery(connectedAppsQuery);
  const readwise = useQuery(readwiseQuery);
  const keys = useQuery(keysQuery);
  // A Readwise or key list that can't load would read as not connected and offer to add it again.
  const failures = [useLoadFailed(apps), useLoadFailed(readwise), useLoadFailed(keys)];
  const failed = failures.some(Boolean);
  const retry = {
    ...apps,
    refetch: () => Promise.all([apps.refetch(), readwise.refetch(), keys.refetch()]),
    isFetching: apps.isFetching || readwise.isFetching || keys.isFetching,
  } as unknown as typeof apps;
  const consents = apps.data ?? [];
  const connected = new Set(consents.map((c) => assistantOf(c)?.key));
  const toAdd = ASSISTANTS.filter((a) => a.key === "custom" || !connected.has(a.key));
  const loading = apps.isPending || readwise.isPending || keys.isPending;

  return (
    <Screen
      title={t`Apps`}
      back={{ label: t`You`, to: "/you" }}
      description={t`Apps that add cards to your decks.`}
    >
      {failed ? (
        <LoadFailed
          query={retry}
          failed={t`Couldn’t load your apps`}
          offline={t`Your apps need a connection`}
        />
      ) : loading ? (
        <Skeleton height={200} />
      ) : (
        <AppsList
          consents={consents}
          readwise={readwise.data?.connection ?? null}
          yomitan={yomitanKey(keys.data)}
          toAdd={toAdd}
        />
      )}
      {apps.isError && apps.data && <FieldError>{errorMessage(apps.error)}</FieldError>}
    </Screen>
  );
}
