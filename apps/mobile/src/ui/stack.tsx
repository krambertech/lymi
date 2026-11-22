import { Stack } from "expo-router";
import type { ReactElement, ReactNode } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette } from "../theme/palette";
import { Grabber } from "./grabber";

export const FULL_SHEET = {
  sheetAllowedDetents: [1],
  sheetShouldOverflowTopInset: Platform.OS === "android",
};

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
