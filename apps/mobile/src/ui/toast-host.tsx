import { ARRIVE, SNAP_BACK } from "@lymi/design";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useWindowDimensions, View, type ViewProps } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type AnimatedProps,
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
import { spring, springIn, useReduceMotion } from "../theme/motion";
import { useAboveTabBar } from "./tab-bar";
import { Toast } from "./toast";

// The web's timings: long enough to reach Undo with VoiceOver or a switch. phone.md "After an action".
const ACTION_TIMEOUT = 10_000;
const TIMEOUT = 5_000;
const BACK = spring(SNAP_BACK);

interface ToastOptions {
  /** A toast with the same id replaces it, as the web's does. */
  id?: string;
  title: string;
  error?: boolean;
  action?: { label: string; onPress: () => void };
  /** A screen iOS presents over the root, such as Add a word, hosts its own toasts under this name. */
  scope?: string;
}

interface Item extends Required<Pick<ToastOptions, "id" | "title">> {
  error: boolean;
  action: ToastOptions["action"];
  scope: string | undefined;
  key: number;
}

let items: Item[] = [];
let next = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** What just happened, from anywhere, with at most one action; the newest is in front. */
export const toast = {
  add({ id, title, error = false, action, scope }: ToastOptions) {
    const key = next++;
    const itemId = id ?? `toast-${key}`;
    items = [
      ...items.filter((i) => i.id !== itemId),
      { id: itemId, title, error, action, scope, key },
    ];
    emit();
    return itemId;
  },
  close(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },
};

/** Drops every toast, so an Undo never outlives the learner it belongs to; or only a scope's. */
export function clearToasts(scope?: string) {
  items = scope === undefined ? [] : items.filter((i) => i.scope !== scope);
  emit();
}

// What sits at the foot of a screen, such as the review's grades or a selection bar: each claims the
// distance from its top edge to the screen's bottom, and that scope's toasts rise above the highest.
const floors = new Map<number, { scope: string | undefined; height: number }>();
let nextFloor = 0;

/** The toast scope a screen's controls belong to; a screen with its own `ToastHost` provides it. */
export const ToastScope = createContext<string | undefined>(undefined);

/**
 * A control pinned to the screen's foot, such as grades or an end screen's buttons. While it shows,
 * toasts rise above its top edge rather than covering it, wherever it sits.
 */
export function ToastFloor({
  children,
  onLayout,
  ...props
}: AnimatedProps<ViewProps> & { children: ReactNode }) {
  const scope = useContext(ToastScope);
  const ref = useRef<Animated.View>(null);
  const id = useRef(nextFloor++).current;
  const mounted = useRef(true);
  const { height: screen } = useWindowDimensions();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      floors.delete(id);
      emit();
    };
  }, [id]);
  return (
    <Animated.View
      ref={ref}
      {...props}
      onLayout={(e) => {
        if (typeof onLayout === "function") onLayout(e);
        ref.current?.measureInWindow((_x, y) => {
          // A measure that answers after unmount would leave a floor nothing removes.
          if (!mounted.current) return;
          floors.set(id, { scope, height: Math.max(0, screen - y) });
          emit();
        });
      }}
    >
      {children}
    </Animated.View>
  );
}

function useFloor(scope: string | undefined) {
  return useSyncExternalStore(subscribe, () => {
    let top = 0;
    for (const f of floors.values()) if (f.scope === scope) top = Math.max(top, f.height);
    return top;
  });
}

function useToasts() {
  return useSyncExternalStore(subscribe, () => items);
}

/**
 * Where toasts show: over every screen, above the tab bar on a tab's screens and above any
 * `ToastFloor`, mounted once in the root. A screen iOS presents over the root mounts its own inside
 * its `ToastScope`; one inside a sheet's footer passes the `bottom` it sets there.
 */
export function ToastHost({ scope: named, bottom: at }: { scope?: string; bottom?: number }) {
  const provided = useContext(ToastScope);
  const scope = named ?? provided;
  const shown = useToasts();
  useEffect(() => () => clearToasts(scope), [scope]);
  const floor = useFloor(scope);
  const above = useAboveTabBar();
  const bottom = at ?? Math.max(above, floor) + 12;
  // The web shows three, the older two peeking behind the newest.
  const visible = shown.filter((i) => i.scope === scope).slice(-3);
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
