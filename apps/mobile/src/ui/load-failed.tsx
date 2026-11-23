import { useLingui } from "@lingui/react/macro";
import { onlineManager, type UseQueryResult } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { couldNotLoad } from "../data/load-state";
import { type EmptySize, EmptyState } from "./empty-state";

const isOnline = () => onlineManager.isOnline();

type Reads = UseQueryResult | readonly UseQueryResult[];

export function useLoadFailed(query: Reads): boolean {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  return couldNotLoad([query].flat(), online);
}

export function LoadFailed({
  query,
  failed,
  offline,
  size,
}: {
  query: Reads;
  failed: string;
  offline: string;
  size?: EmptySize;
}) {
  const { t } = useLingui();
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  const reads = [query].flat();
  const retry = {
    label: t`Try again`,
    onPress: () => {
      for (const read of reads) void read.refetch();
    },
    busy: reads.some((read) => read.isFetching),
  };
  return online ? (
    <EmptyState
      kind="failed"
      size={size}
      title={failed}
      body={t`Check your connection and try again.`}
      action={retry}
    />
  ) : (
    <EmptyState
      kind="offline"
      size={size}
      title={offline}
      body={t`Open it once with a connection, and it stays on this phone.`}
      action={retry}
    />
  );
}
