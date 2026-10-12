import { useLingui } from "@lingui/react/macro";
import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { EmptyState } from "../ui/empty-state";
import { Skeleton } from "../ui/skeleton";

const isOnline = () => onlineManager.isOnline();

/** The catalogue on its way: a shelf's heading and a row of trays held in place. */
export function CatalogueLoading() {
  return (
    <View className="gap-3" accessibilityElementsHidden>
      <Skeleton width={160} height={28} />
      <Skeleton height={144} />
    </View>
  );
}

/**
 * The catalogue could not be read, which is never the same as nothing matching. Offline it says
 * Explore needs a connection, since that is no failure; otherwise that the read failed.
 */
export function CatalogueFailed({ onRetry, busy }: { onRetry: () => void; busy?: boolean }) {
  const { t } = useLingui();
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  const offline = !online;
  return offline ? (
    <EmptyState
      kind="offline"
      title={t`Explore needs a connection`}
      body={t`Your decks and reviews still work offline.`}
      action={{ label: t`Try again`, onPress: onRetry, busy }}
    />
  ) : (
    <EmptyState
      kind="failed"
      title={t`Couldn’t load Explore`}
      body={t`Check your connection and try again.`}
      action={{ label: t`Try again`, onPress: onRetry, busy }}
    />
  );
}

/** Nothing is published yet: the one way in is the learner's own decks. */
export function CatalogueEmpty({ onLibrary }: { onLibrary: () => void }) {
  const { t } = useLingui();
  return (
    <EmptyState
      kind="start"
      title={t`Nothing published yet`}
      body={t`Lymi is writing the first decks. Until then, make your own in Library.`}
      action={{ label: t`Open Library`, onPress: onLibrary }}
    />
  );
}
