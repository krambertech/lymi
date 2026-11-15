import { useLingui } from "@lingui/react/macro";
import { outboxSize } from "@lymi/client/grades";
import type { UpdateRequired } from "@lymi/client/update-required";
import { pendingWrites } from "@lymi/client/writes";
import Constants from "expo-constants";
import { useState } from "react";
import { Linking, Platform, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pool, useArrival } from "../auth/door-parts";
import { Lantern } from "../brand/lantern";
import { Button, Text } from "../ui/primitives";

/** The store's own page when the Worker named none: Updates on iOS, the app's listing on Android. */
function storeUrl(): string {
  if (Platform.OS === "android") {
    return `market://details?id=${Constants.expoConfig?.android?.package ?? ""}`;
  }
  return "itms-apps://apps.apple.com/";
}

/**
 * The whole app once the Worker answers 426: this release is below the minimum it serves. It has
 * no way back, because every request would be refused; what waits to send stays on the phone.
 */
export function UpdateLymi({ state }: { state: UpdateRequired }) {
  const { t } = useLingui();
  const insets = useSafeAreaInsets();
  const arrive = useArrival();
  // Read once: nothing can send or be added while this screen shows.
  const [waiting] = useState(() => outboxSize() + pendingWrites() > 0);
  return (
    <View className="flex-1 bg-canvas">
      <Pool className="-inset-x-10 -top-40 h-[70%]" />
      <View
        className="flex-1 items-center justify-center gap-6 px-8"
        style={{ paddingTop: insets.top }}
      >
        <Animated.View entering={arrive(80)}>
          <Lantern size={120} />
        </Animated.View>
        <Animated.View entering={arrive(160)} className="items-center gap-2">
          <Text className="text-3xl font-medium text-ink" accessibilityRole="header">
            {t`Update Lymi`}
          </Text>
          <Text className="text-center text-md text-ink-secondary">
            {t`This version of the app is out of date. Update it to keep reviewing.`}
          </Text>
          {waiting && (
            <Text className="text-center text-md text-ink-secondary">
              {t`Your unsent reviews and cards are saved on this phone. They send after the update.`}
            </Text>
          )}
        </Animated.View>
      </View>
      <Animated.View
        entering={arrive(280)}
        className="px-5"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <Button
          label={t`Update`}
          variant="primary"
          size="lg"
          onPress={() =>
            // The named app, such as TestFlight, may not be installed.
            void Linking.openURL(state.updateUrl ?? storeUrl())
              .catch(() => Linking.openURL(storeUrl()))
              .catch(() => {})
          }
        />
      </Animated.View>
    </View>
  );
}
