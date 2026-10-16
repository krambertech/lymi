import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler, Platform } from "react-native";

/**
 * The system Back and back gesture (Android; iOS has none), while the calling screen is in front: `onBack` returns true when
 * it has handled them, and false to let the screen go back as usual.
 */
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
