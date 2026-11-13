import { SNAP_BACK } from "@lymi/design";
import { type ReactNode, useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { haptics } from "../theme/haptics";
import { spring } from "../theme/motion";
import { usePalette, useRoom } from "../theme/palette";
import { Icon } from "./icons";

const SETTLE = spring(SNAP_BACK);

/**
 * Every row is one height, so a dragged row's slot is its offset divided by it; the height grows
 * with the text size, so a name and its count never clip.
 */
export function useDragRow() {
  const { fontScale } = useWindowDimensions();
  return Math.round(24 + 40 * Math.min(fontScale, 2.2));
}

/** Rows that a handle drags into a new order; the rest make room as it passes. */
export function DragList<T extends { id: string }>({
  items,
  busy,
  onDrop,
  render,
}: {
  items: readonly T[];
  busy: boolean;
  onDrop: (ids: string[]) => void;
  render: (item: T, at: number, handle: ReactNode) => ReactNode;
}) {
  const row = useDragRow();
  const positions = useSharedValue<Record<string, number>>({});
  const key = items.map((s) => s.id).join();
  useEffect(() => {
    positions.value = Object.fromEntries(key.split(",").map((id, i) => [id, i]));
  }, [key, positions]);
  const drop = (at: Record<string, number>) =>
    onDrop(Object.keys(at).sort((a, b) => (at[a] ?? 0) - (at[b] ?? 0)));
  return (
    <View style={{ height: items.length * row }}>
      {items.map((item, i) => (
        <DragRow
          key={item.id}
          id={item.id}
          start={i}
          count={items.length}
          row={row}
          busy={busy}
          positions={positions}
          onDrop={drop}
          render={(handle) => render(item, i, handle)}
        />
      ))}
    </View>
  );
}

function DragRow({
  id,
  start,
  count,
  row,
  busy,
  positions,
  onDrop,
  render,
}: {
  id: string;
  start: number;
  count: number;
  row: number;
  busy: boolean;
  positions: SharedValue<Record<string, number>>;
  onDrop: (at: Record<string, number>) => void;
  render: (handle: ReactNode) => ReactNode;
}) {
  const p = usePalette();
  // Black, as the room's ink glows at night; the row fills its plate, so a token's negative spread would hide it.
  const drop = `0 8px 14px #000000${useRoom() === "dark" ? "80" : "2e"}`;
  const y = useSharedValue(start * row);
  const from = useSharedValue(0);
  const lifted = useSharedValue(false);
  // Another row's drag moves this one to its new slot.
  useAnimatedReaction(
    () => positions.value[id],
    (now, was) => {
      if (now !== undefined && now !== was && !lifted.value) {
        y.value = withSpring(now * row, SETTLE);
      }
    },
  );
  const pick = () => haptics.pickUp();
  const pass = () => haptics.tick();
  const pan = Gesture.Pan()
    .enabled(!busy)
    .onStart(() => {
      lifted.value = true;
      from.value = y.value;
      runOnJS(pick)();
    })
    .onUpdate((e) => {
      y.value = Math.min(Math.max(from.value + e.translationY, 0), (count - 1) * row);
      const was = positions.value[id] ?? 0;
      const to = Math.round(y.value / row);
      if (to === was) return;
      // Inserted, not swapped: every row between the old slot and the new one shifts by one.
      const next = { ...positions.value };
      for (const key of Object.keys(next)) {
        const at = next[key] ?? 0;
        if (to > was && at > was && at <= to) next[key] = at - 1;
        if (to < was && at >= to && at < was) next[key] = at + 1;
      }
      next[id] = to;
      positions.value = next;
      runOnJS(pass)();
    })
    .onFinalize(() => {
      lifted.value = false;
      y.value = withSpring((positions.value[id] ?? 0) * row, SETTLE);
      runOnJS(onDrop)(positions.value);
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: withSpring(lifted.value ? 1.03 : 1, SETTLE) }],
    zIndex: lifted.value ? 1 : 0,
    borderTopWidth: (positions.value[id] ?? 0) > 0 && !lifted.value ? 1 : 0,
  }));
  const shadow = useAnimatedStyle(() => ({ opacity: withSpring(lifted.value ? 1 : 0, SETTLE) }));
  return (
    <Animated.View
      className="absolute inset-x-0 top-0 border-edge"
      style={[{ height: row }, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { boxShadow: drop }, shadow]}
      />
      {render(
        <GestureDetector gesture={pan}>
          <View className="h-11 w-11 items-center justify-center">
            <Icon name="grip" size={22} colour={busy ? p.edge : p["ink-faint"]} />
          </View>
        </GestureDetector>,
      )}
    </Animated.View>
  );
}
