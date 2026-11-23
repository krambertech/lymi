import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
// oxlint-disable-next-line eslint/no-restricted-imports -- Overlay is built on it here.
import { FullWindowOverlay } from "react-native-screens";

export function Overlay({ children }: { children: ReactNode }) {
  if (Platform.OS === "ios") return <FullWindowOverlay>{children}</FullWindowOverlay>;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </View>
  );
}
