import { ARRIVE, SNAP_BACK } from "@lymi/design";
import { usePathname } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spring, springIn, useReduceMotion } from "../theme/motion";
import { useDeckAccessoryShown } from "./tab-bar";
import { Toast } from "./toast";

// The web's timings: long enough to reach Undo with VoiceOver or a switch. phone.md "After an action".
const ACTION_TIMEOUT = 10_000;
const TIMEOUT = 5_000;
// iOS 26's floating tab bar, which a toast clears and matches in width on a tab's screens.
const TAB_BAR = 64;
const BACK = spring(SNAP_BACK);
const TABS = /^\/(today|library|explore|you)(\/|$)/;
const ACCESSORY = 56;

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

/** Drops every toast, so an Undo never outlives the learner it belongs to. */
export function clearToasts() {
  items = [];
  emit();
}

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
  useEffect(() => clearToasts, []);
  const insets = useSafeAreaInsets();
  const path = usePathname();
  // Clears the deck's review accessory only while the bar shows it, not on every Library page.
  const accessory = useDeckAccessoryShown() ? ACCESSORY : 0;
  const bottom = insets.bottom + (TABS.test(path) ? TAB_BAR + accessory : 0) + 12;
  // The web shows three, the older two peeking behind the newest.
  const visible = shown.slice(-3);
  return (
    <View pointerEvents="box-none" className="absolute inset-x-6" style={{ bottom }}>
      {visible.map((item, i) => (
        <Slot key={item.key} item={item} depth={visible.length - 1 - i} />
      ))}
    </View>
  );
}

function Slot({ item, depth }: { item: Item; depth: number }) {
  const reduce = useReduceMotion();
  // Announced once as it arrives, never again when a newer one closes over it.
  const [announce] = useState(depth === 0);
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
        x.value = withSpring(0, BACK);
        y.value = withSpring(0, BACK);
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
        // A short rise from just below where it rests, not a flight from the screen's edge.
        entering={reduce ? FadeIn.duration(150) : springIn(new FadeInDown(), ARRIVE)}
        exiting={reduce ? FadeOut.duration(150) : FadeOutDown.duration(200)}
        pointerEvents={depth === 0 ? "auto" : "none"}
        importantForAccessibility={depth === 0 ? "auto" : "no-hide-descendants"}
        accessibilityElementsHidden={depth > 0}
        className="absolute inset-x-0 bottom-0"
        style={[style, { zIndex: 10 - depth, opacity: depth > 1 ? 0.6 : 1 }]}
      >
        <Toast
          title={item.title}
          error={item.error}
          announce={announce}
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
