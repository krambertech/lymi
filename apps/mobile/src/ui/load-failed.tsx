import { useLingui } from "@lingui/react/macro";
import { onlineManager, type UseQueryResult } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { couldNotLoad } from "../data/load-state";
import { type EmptySize, EmptyState } from "./empty-state";

const isOnline = () => onlineManager.isOnline();

/** One read, or every read a screen needs before it can draw. */
type Reads = UseQueryResult | readonly UseQueryResult[];

/**
 * Whether a screen has nothing to show because a read could not run. Still loading is not that,
 * and keeps its skeleton.
 */
export function useLoadFailed(query: Reads): boolean {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  return couldNotLoad([query].flat(), online);
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
  query: Reads;
  /** What could not load, by name: "Couldn’t load this deck". */
  failed: string;
  /** What needs the connection, by name: "This deck needs a connection". */
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
