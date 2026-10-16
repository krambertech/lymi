import { Stack } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "../theme/palette";
import { Grabber } from "./grabber";

/**
 * A full-height form sheet covers the whole window on Android, since react-native-screens otherwise
 * sizes it from a top inset it can miss after a live theme switch, leaving its foot under the keyboard.
 */
export const FULL_SHEET = {
  sheetAllowedDetents: [1],
  sheetShouldOverflowTopInset: Platform.OS === "android",
};

/**
 * What the root Stack adds to every screen for its sheets: Android's form sheets are square unless
 * given Material's corner, and Lymi lays them out there; iOS draws its own.
 */
export const SHEET_STACK =
  Platform.OS === "android"
    ? { screenOptions: { sheetCornerRadius: 28 }, screenLayout: AndroidSheetLayout }
    : { screenOptions: {}, screenLayout: undefined };

interface Props {
  options: {
    presentation?: string;
    sheetGrabberVisible?: boolean;
    sheetShouldOverflowTopInset?: boolean;
  };
  children: ReactElement;
}

/**
 * Lays out Android's form sheets, as the root Stack's screen layout there: a sheet over the status
 * bar starts its content below it, and Android draws no grabber, so Lymi draws iOS's. The Stack calls
 * it as a function, so it holds no hooks.
 */
function AndroidSheetLayout({ options, children }: Props) {
  if (options.presentation !== "formSheet") return children;
  const grabber = !!options.sheetGrabberVisible;
  if (options.sheetShouldOverflowTopInset) {
    return <BelowStatusBar grabber={grabber}>{children}</BelowStatusBar>;
  }
  return (
    <>
      {children}
      {grabber && <Grabber />}
    </>
  );
}

function BelowStatusBar({ grabber, children }: { grabber: boolean; children: ReactNode }) {
  const { top } = useSafeAreaInsets();
  return (
    <View className="flex-1" style={{ paddingTop: top }}>
      {children}
      {grabber && <Grabber below={top} />}
    </View>
  );
}

/**
 * A tab's stack: no header, since every screen builds its own bar with Screen, and the root's sheet
 * setup, so a sheet a tab presents looks like every other.
 */
export function TabStack({ children }: { children?: ReactNode }) {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: p.canvas },
        ...SHEET_STACK.screenOptions,
      }}
      screenLayout={SHEET_STACK.screenLayout}
    >
      {children}
    </Stack>
  );
}
