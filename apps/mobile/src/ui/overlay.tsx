import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

/**
 * A layer over everything, the native stack's screens included: iOS's own window over the app, and on
 * Android, which has none, a full-screen layer drawn after the stack. A bare FullWindowOverlay is a
 * sizeless view there, so what it holds draws nowhere.
 */
export function Overlay({ children }: { children: ReactNode }) {
  if (Platform.OS === "ios") return <FullWindowOverlay>{children}</FullWindowOverlay>;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </View>
  );
}
