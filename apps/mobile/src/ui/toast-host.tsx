import { usePathname } from "expo-router";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReduceMotion } from "../theme/motion";
import { Toast } from "./toast";

// The web's timings: long enough to reach Undo with VoiceOver or a switch. phone.md "After an action".
const ACTION_TIMEOUT = 10_000;
const TIMEOUT = 5_000;
// iOS 26's floating tab bar, which a toast clears on a tab's screens.
const TAB_BAR = 64;
const TABS = /^\/(today|library|explore|you)(\/|$)/;

interface ToastOptions {
  /** A toast with the same id replaces it, as the web's does. */
  id?: string;
  title: string;
  error?: boolean;
  action?: { label: string; onPress: () => void };
}

interface Item extends Required<Pick<ToastOptions, "id" | "title">> {
  error: boolean;
  action: ToastOptions["action"];
  key: number;
}

let items: Item[] = [];
let next = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

/** What just happened, from anywhere, with at most one action; the newest is in front. */
export const toast = {
  add({ id, title, error = false, action }: ToastOptions) {
    const key = next++;
    const itemId = id ?? `toast-${key}`;
    items = [...items.filter((i) => i.id !== itemId), { id: itemId, title, error, action, key }];
    emit();
    return itemId;
  },
  close(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },
};

function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
  );
}

/** Where toasts show: over every screen, above the tab bar on a tab's screens. Mounted once, in the root. */
export function ToastHost() {
  const shown = useToasts();
  const insets = useSafeAreaInsets();
  const onTab = TABS.test(usePathname());
  const bottom = insets.bottom + (onTab ? TAB_BAR : 0) + 12;
  // The web shows three, the older two peeking behind the newest.
  const visible = shown.slice(-3);
  return (
    <View pointerEvents="box-none" className="absolute inset-x-4" style={{ bottom }}>
      {visible.map((item, i) => (
        <Slot key={item.key} item={item} depth={visible.length - 1 - i} />
      ))}
    </View>
  );
}

function Slot({ item, depth }: { item: Item; depth: number }) {
  const reduce = useReduceMotion();
  const held = useRef(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const close = () => toast.close(item.id);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(close, item.action ? ACTION_TIMEOUT : TIMEOUT);
  };
  // Only the front toast counts down, as on the web, and a touch holds it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: restarts when the toast moves to the front.
  useEffect(() => {
    if (depth === 0 && !held.current) start();
    return () => clearTimeout(timer.current);
  }, [depth]);
  const hold = () => {
    held.current = true;
    clearTimeout(timer.current);
  };
  const release = () => {
    held.current = false;
    if (depth === 0) start();
  };
  const swipe = Gesture.Pan()
    .onBegin(() => runOnJS(hold)())
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const gone = e.translationY > 40 || Math.abs(e.translationX) > 80;
      if (gone) {
        x.value = withTiming(Math.abs(e.translationX) > 80 ? Math.sign(e.translationX) * 500 : 0);
        y.value = withTiming(e.translationY > 40 ? 200 : 0, undefined, () => runOnJS(close)());
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    })
    .onFinalize(() => runOnJS(release)());
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value - depth * 10 },
      { scale: 1 - depth * 0.05 },
    ],
  }));
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        entering={reduce ? FadeIn.duration(150) : SlideInDown.springify().damping(18)}
        exiting={reduce ? FadeOut.duration(150) : SlideOutDown.duration(250)}
        pointerEvents={depth === 0 ? "auto" : "none"}
        importantForAccessibility={depth === 0 ? "auto" : "no-hide-descendants"}
        accessibilityElementsHidden={depth > 0}
        className="absolute inset-x-0 bottom-0"
        style={[style, { zIndex: 10 - depth, opacity: depth > 1 ? 0.6 : 1 }]}
      >
        <Toast
          title={item.title}
          error={item.error}
          announce={depth === 0}
          action={
            item.action && {
              label: item.action.label,
              onPress: () => {
                close();
                item.action?.onPress();
              },
            }
          }
        />
      </Animated.View>
    </GestureDetector>
  );
}
