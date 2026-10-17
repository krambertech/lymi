import type { AppIdentity } from "@lymi/client/app-marks";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "../ui/primitives";

/** A connected app's tile, as the web draws it, never with the client's own logo. connected-apps.md. */
export function AppMark({ app, size = 40 }: { app: AppIdentity; size?: number }) {
  const p = usePalette();
  return (
    <View
      className="items-center justify-center rounded-lg border border-edge bg-plate"
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {app.path ? (
        <Svg width={size / 2} height={size / 2} viewBox="0 0 24 24">
          <Path d={app.path} fill={app.brand ?? p.text} />
        </Svg>
      ) : app.name ? (
        <Text className="text-lg font-semibold uppercase text-text-2">{app.name.slice(0, 1)}</Text>
      ) : (
        <Icon name="apps" size={size / 2} colour={p.muted} />
      )}
    </View>
  );
}
