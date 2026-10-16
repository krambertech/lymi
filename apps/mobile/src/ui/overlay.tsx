import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";

/** A layer over every screen: iOS's own window, or on Android, where FullWindowOverlay is a sizeless view, a full-screen layer after the stack. */
export function Overlay({ children }: { children: ReactNode }) {
  if (Platform.OS === "ios") return <FullWindowOverlay>{children}</FullWindowOverlay>;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </View>
  );
}
