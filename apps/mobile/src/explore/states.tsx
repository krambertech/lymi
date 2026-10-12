import { useLingui } from "@lingui/react/macro";
import { View } from "react-native";
import { Button, Text } from "../ui/primitives";
import { Skeleton } from "../ui/skeleton";

/** The catalogue on its way: a shelf's heading and a row of trays held in place. */
export function CatalogueLoading() {
  return (
    <View className="gap-3" accessibilityElementsHidden>
      <Skeleton width={160} height={28} />
      <Skeleton height={144} />
    </View>
  );
}

/** The catalogue could not be read, which is never the same as nothing matching. */
export function CatalogueFailed({ onRetry, busy }: { onRetry: () => void; busy?: boolean }) {
  const { t } = useLingui();
  return (
    <View className="items-start gap-3" accessibilityLiveRegion="polite">
      <Text className="text-md text-text">{t`Couldn’t load Explore`}</Text>
      <Button label={t`Try again`} size="sm" loading={busy} onPress={onRetry} />
    </View>
  );
}
