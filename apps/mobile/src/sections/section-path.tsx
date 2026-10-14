import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import { SNAP_BACK } from "@lymi/design";
import * as Haptics from "expo-haptics";
import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { spring } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { Plate, Press, Text } from "../ui/primitives";

// A deck's sections drawn as the path a learner walks: numbered stops on one line, a lock on each
// stop a new learner waits for, and New section as the next stop. Edit turns it into a sorting
// table. docs/design/library-decks-and-cards.md "Sections".

/** Every row is one height, so a dragged row's slot is its offset divided by this. */
const ROW = 64;
const NODE = 32;
const SETTLE = spring(SNAP_BACK);

interface Props {
  sections: Section[];
  /** Edit mode: handles to drag, archive at the start, a tap on the name renames. */
  editing: boolean;
  /** Whether later sections wait for earlier ones, so a new learner sees locks. */
  inOrder: boolean;
  onNew: () => void;
  onRename: (section: Section) => void;
  onArchive: (section: Section) => void;
  /** The whole order after a drag or a VoiceOver move. */
  onReorder: (ids: string[]) => void;
}

export function SectionPath({
  sections,
  editing,
  inOrder,
  onNew,
  onRename,
  onArchive,
  onReorder,
}: Props) {
  const ids = sections.map((s) => s.id);
  const move = (id: string, by: -1 | 1) => {
    const at = ids.indexOf(id);
    const to = at + by;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[at], next[to]] = [next[to] as string, next[at] as string];
    onReorder(next);
  };
  const line = inOrder && !editing;
  return (
    <Plate className="overflow-hidden">
      {editing ? (
        <DragList
          sections={sections}
          onDrop={(order) => {
            if (order.join() !== ids.join()) onReorder(order);
          }}
          render={(section, at, handle) => (
            <Stop
              section={section}
              at={at}
              locked={false}
              editing
              handle={handle}
              onRename={() => onRename(section)}
              onArchive={() => onArchive(section)}
              onMove={(by) => move(section.id, by)}
              last={at === sections.length - 1}
            />
          )}
        />
      ) : (
        <View>
          {sections.map((section, at) => (
            <SwipeStop
              key={section.id}
              onRename={() => onRename(section)}
              onArchive={() => onArchive(section)}
            >
              <Stop
                section={section}
                at={at}
                locked={inOrder && at > 0}
                line={line}
                editing={false}
                onRename={() => onRename(section)}
                onArchive={() => onArchive(section)}
                onMove={(by) => move(section.id, by)}
                last={false}
              />
            </SwipeStop>
          ))}
          <NewStop onPress={onNew} line={line && sections.length > 0} />
        </View>
      )}
    </Plate>
  );
}

/** One stop: its number on the line, its name and size; in Edit, archive before it and a handle after. */
function Stop({
  section,
  at,
  locked,
  line = false,
  editing,
  handle,
  onRename,
  onArchive,
  onMove,
  last,
}: {
  section: Section;
  at: number;
  locked: boolean;
  /** The path's line runs through this stop, down to the next. */
  line?: boolean;
  editing: boolean;
  handle?: ReactNode;
  onRename: () => void;
  onArchive: () => void;
  onMove: (by: -1 | 1) => void;
  last: boolean;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const name = section.name;
  const cards = plural(section.total, { one: "# card", other: "# cards" });
  return (
    <View
      className={`flex-row items-center gap-3 bg-plate px-4 ${!editing && at > 0 ? "border-t border-edge" : ""}`}
      style={{ height: ROW }}
      accessible={!editing}
      accessibilityLabel={`${i18n.number(at + 1)}. ${name}, ${cards}`}
      accessibilityActions={
        editing
          ? [
              ...(at > 0 ? [{ name: "up", label: t`Move up` }] : []),
              ...(!last ? [{ name: "down", label: t`Move down` }] : []),
            ]
          : undefined
      }
      onAccessibilityAction={(e) => onMove(e.nativeEvent.actionName === "up" ? -1 : 1)}
    >
      {line && <Segment top={at === 0 ? ROW / 2 : 0} bottom={0} />}
      {editing && (
        <Press
          onPress={onArchive}
          drawn={22}
          accessibilityRole="button"
          accessibilityLabel={t`Archive ${name}`}
        >
          <Icon name="remove" size={22} colour={p.danger} strokeWidth={2.25} />
        </Press>
      )}
      <View
        className="items-center justify-center rounded-full border border-edge bg-plate-2"
        style={{ width: NODE, height: NODE }}
      >
        <Text
          className="text-base font-medium text-text-2"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {i18n.number(at + 1)}
        </Text>
        {locked && (
          <View className="absolute -end-1.5 -bottom-1 h-[17px] w-[17px] items-center justify-center rounded-full border border-edge bg-plate">
            <Icon name="lock" size={10} colour={p.muted} strokeWidth={2.5} />
          </View>
        )}
      </View>
      <Press
        onPress={editing ? onRename : undefined}
        disabled={!editing}
        haptic={editing}
        scale={1}
        className="flex-1"
        accessibilityRole={editing ? "button" : undefined}
        accessibilityLabel={editing ? t`Rename ${name}` : undefined}
      >
        <Text className="text-md font-medium text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm text-muted">{cards}</Text>
      </Press>
      {handle}
    </View>
  );
}

/** At rest a stop swipes open on Rename and Archive, as Mail's and Reminders' rows do. */
function SwipeStop({
  children,
  onRename,
  onArchive,
}: {
  children: ReactNode;
  onRename: () => void;
  onArchive: () => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, swipe) => (
        <View className="flex-row">
          <Press
            onPress={() => {
              swipe.close();
              onRename();
            }}
            scale={1}
            accessibilityRole="button"
            className="w-[74px] items-center justify-center gap-1 bg-muted"
          >
            <Icon name="edit" size={20} colour={p.plate} />
            <Text className="text-sm font-medium" style={{ color: p.plate }}>
              {t`Rename`}
            </Text>
          </Press>
          <Press
            onPress={() => {
              swipe.close();
              onArchive();
            }}
            scale={1}
            accessibilityRole="button"
            className="w-[74px] items-center justify-center gap-1 bg-danger"
          >
            <Icon name="archive" size={20} colour={p.plate} />
            <Text className="text-sm font-medium" style={{ color: p.plate }}>
              {t`Archive`}
            </Text>
          </Press>
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

/** The next stop on the path: the one standing action of the page, in amber. */
function NewStop({ onPress, line }: { onPress: () => void; line: boolean }) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      scale={0.99}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-t border-edge bg-plate px-4"
      style={{ height: ROW }}
    >
      {line && <Segment top={0} bottom={ROW / 2} />}
      <View
        className="items-center justify-center rounded-full bg-amber"
        style={{ width: NODE, height: NODE }}
      >
        <Icon name="plus" size={18} colour={p["amber-ink"]} strokeWidth={2.5} />
      </View>
      <Text className="text-md font-semibold text-text">{t`New section`}</Text>
    </Press>
  );
}

/** The path's line where it crosses one row, behind the stop's number. */
function Segment({ top, bottom }: { top: number; bottom: number }) {
  return (
    <View className="absolute w-0.5 bg-edge-2" style={{ start: 16 + NODE / 2 - 1, top, bottom }} />
  );
}

/** Rows that a handle drags into a new order; the rest make room as it passes. */
function DragList({
  sections,
  onDrop,
  render,
}: {
  sections: Section[];
  onDrop: (ids: string[]) => void;
  render: (section: Section, at: number, handle: ReactNode) => ReactNode;
}) {
  const positions = useSharedValue<Record<string, number>>({});
  const key = sections.map((s) => s.id).join();
  useEffect(() => {
    positions.value = Object.fromEntries(key.split(",").map((id, i) => [id, i]));
  }, [key, positions]);
  const drop = (at: Record<string, number>) =>
    onDrop(Object.keys(at).sort((a, b) => (at[a] ?? 0) - (at[b] ?? 0)));
  return (
    <View style={{ height: sections.length * ROW }}>
      {sections.map((section, i) => (
        <DragRow
          key={section.id}
          id={section.id}
          start={i}
          count={sections.length}
          positions={positions}
          onDrop={drop}
          render={(handle) => render(section, i, handle)}
        />
      ))}
    </View>
  );
}

function DragRow({
  id,
  start,
  count,
  positions,
  onDrop,
  render,
}: {
  id: string;
  start: number;
  count: number;
  positions: SharedValue<Record<string, number>>;
  onDrop: (at: Record<string, number>) => void;
  render: (handle: ReactNode) => ReactNode;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const y = useSharedValue(start * ROW);
  const from = useSharedValue(0);
  const lifted = useSharedValue(false);
  // Another row's drag moves this one to its new slot.
  useAnimatedReaction(
    () => positions.value[id],
    (now, was) => {
      if (now !== undefined && now !== was && !lifted.value)
        y.value = withSpring(now * ROW, SETTLE);
    },
  );
  const pick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const pass = () => Haptics.selectionAsync();
  const pan = Gesture.Pan()
    .onStart(() => {
      lifted.value = true;
      from.value = y.value;
      runOnJS(pick)();
    })
    .onUpdate((e) => {
      y.value = Math.min(Math.max(from.value + e.translationY, 0), (count - 1) * ROW);
      const was = positions.value[id] ?? 0;
      const to = Math.round(y.value / ROW);
      if (to === was) return;
      const next = { ...positions.value };
      for (const key of Object.keys(next)) if (next[key] === to) next[key] = was;
      next[id] = to;
      positions.value = next;
      runOnJS(pass)();
    })
    .onFinalize(() => {
      lifted.value = false;
      y.value = withSpring((positions.value[id] ?? 0) * ROW, SETTLE);
      runOnJS(onDrop)(positions.value);
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: withSpring(lifted.value ? 1.03 : 1, SETTLE) }],
    zIndex: lifted.value ? 1 : 0,
    shadowOpacity: withSpring(lifted.value ? 0.18 : 0, SETTLE),
    borderTopWidth: (positions.value[id] ?? 0) > 0 && !lifted.value ? 1 : 0,
  }));
  return (
    <Animated.View
      className="absolute inset-x-0 top-0 border-edge"
      style={[
        {
          height: ROW,
          shadowColor: p.text,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
        },
        style,
      ]}
    >
      {render(
        <GestureDetector gesture={pan}>
          <View
            className="h-11 w-11 items-center justify-center"
            accessible
            accessibilityLabel={t`Drag to reorder`}
          >
            <Icon name="grip" size={22} colour={p.faint} />
          </View>
        </GestureDetector>,
      )}
    </Animated.View>
  );
}
