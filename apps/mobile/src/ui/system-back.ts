import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
// oxlint-disable-next-line eslint/no-restricted-imports -- useSystemBack is built on it here.
import { BackHandler, Platform } from "react-native";

export function useSystemBack(onBack: () => boolean) {
  const latest = useRef(onBack);
  latest.current = onBack;
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const handler = BackHandler.addEventListener("hardwareBackPress", () => latest.current());
      return () => handler.remove();
    }, []),
  );
}
