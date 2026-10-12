import { useLingui } from "@lingui/react/macro";
import { onlineManager, type UseQueryResult } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { type EmptySize, EmptyState } from "./empty-state";

const isOnline = () => onlineManager.isOnline();

/**
 * Whether a read has nothing to show because it could not run: it failed, or it waits for a
 * connection with nothing kept. Still loading is neither, and keeps its skeleton.
 */
export function useLoadFailed(query: UseQueryResult): boolean {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  return query.data === undefined && (query.isError || (!online && query.fetchStatus === "paused"));
}

/**
 * The empty state for a read that could not run: offline says so without alarm, and only a real
 * failure is red. Both try again. phone.md "Empty states".
 */
export function LoadFailed({
  query,
  failed,
  offline,
  size,
}: {
  query: UseQueryResult;
  /** What could not load, by name: "Couldn’t load this deck". */
  failed: string;
  /** What needs the connection, by name: "This deck needs a connection". */
  offline: string;
  size?: EmptySize;
}) {
  const { t } = useLingui();
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  const retry = {
    label: t`Try again`,
    onPress: () => void query.refetch(),
    busy: query.isFetching,
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
