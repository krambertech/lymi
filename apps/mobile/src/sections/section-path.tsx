import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import { isolate } from "@lymi/core";
import type { ReactNode } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { usePalette } from "../theme/palette";
import { DragList, useDragRow } from "../ui/drag-list";
import { Icon } from "../ui/icons";
import { Plate, Press, Text } from "../ui/primitives";

// A deck's sections drawn as the path a learner walks: numbered stops on one line, a lock on each
// stop a new learner waits for, and New section as the next stop. Edit turns it into a sorting
// table. docs/design/library-decks-and-cards.md "Sections".

const NODE = 32;

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
  /** An order is still being saved, so the handles wait rather than send a second that crosses it. */
  busy?: boolean;
}

export function SectionPath({
  sections,
  editing,
  inOrder,
  onNew,
  onRename,
  onArchive,
  onReorder,
  busy = false,
}: Props) {
  const ids = sections.map((s) => s.id);
  const move = (id: string, by: -1 | 1) => {
    const at = ids.indexOf(id);
    const to = at + by;
    if (busy || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[at], next[to]] = [next[to] as string, next[at] as string];
    onReorder(next);
  };
  const line = inOrder && !editing;
  const stop = (section: Section, at: number, handle?: ReactNode) => (
    <Stop
      section={section}
      at={at}
      locked={!editing && inOrder && at > 0}
      line={line}
      editing={editing}
      handle={handle}
      onRename={() => onRename(section)}
      onArchive={() => onArchive(section)}
      onMove={(by) => move(section.id, by)}
      last={at === sections.length - 1}
    />
  );
  return (
    <Plate className="overflow-hidden">
      {editing ? (
        <DragList
          items={sections}
          busy={busy}
          onDrop={(order) => {
            if (order.join() !== ids.join()) onReorder(order);
          }}
          render={stop}
        />
      ) : (
        <View>
          {sections.map((section, at) => (
            <SwipeStop
              key={section.id}
              onRename={() => onRename(section)}
              onArchive={() => onArchive(section)}
            >
              {stop(section, at)}
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
  line,
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
  line: boolean;
  editing: boolean;
  handle?: ReactNode;
  onRename: () => void;
  onArchive: () => void;
  onMove: (by: -1 | 1) => void;
  last: boolean;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const row = useDragRow();
  const name = section.name;
  const number = i18n.number(at + 1);
  const cards = plural(section.total, { one: "# card", other: "# cards" });
  // One element for VoiceOver in either mode: its swipe, archive, rename and moves are its actions.
  return (
    <View
      className={`flex-row items-center gap-3 bg-plate px-4 ${!editing && at > 0 ? "border-t border-edge" : ""}`}
      style={{ height: row }}
      accessible
      accessibilityLabel={t`Section ${number}: ${{ name: isolate(name) }}, ${cards}`}
      accessibilityActions={[
        ...(editing && at > 0 ? [{ name: "up", label: t`Move up` }] : []),
        ...(editing && !last ? [{ name: "down", label: t`Move down` }] : []),
        { name: "rename", label: t`Rename` },
        { name: "archive", label: t`Archive` },
      ]}
      onAccessibilityAction={(e) => {
        const action = e.nativeEvent.actionName;
        if (action === "up") onMove(-1);
        if (action === "down") onMove(1);
        if (action === "rename") onRename();
        if (action === "archive") onArchive();
      }}
    >
      {line && <Segment top={at === 0 ? row / 2 : 0} bottom={0} />}
      {editing && (
        <Press onPress={onArchive} drawn={22}>
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
          {number}
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
      >
        <Text className="text-md font-medium text-text" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={1}>
          {cards}
        </Text>
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

/** The next stop on the path, as dashed as a stop not made yet; the label reads as Library's New deck. */
function NewStop({ onPress, line }: { onPress: () => void; line: boolean }) {
  const { t } = useLingui();
  const p = usePalette();
  const row = useDragRow();
  return (
    <Press
      onPress={onPress}
      scale={0.99}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-t border-edge bg-plate px-4"
      style={{ height: row }}
    >
      {line && <Segment top={0} bottom={row / 2} />}
      <View
        className="items-center justify-center rounded-full border-[1.5px] border-dashed border-edge-2 bg-plate"
        style={{ width: NODE, height: NODE }}
      >
        <Icon name="plus" size={16} colour={p.text} strokeWidth={2.25} />
      </View>
      <Text className="text-md font-medium text-text">{t`New section`}</Text>
    </Press>
  );
}

/** The path's line where it crosses one row, behind the stop's number. */
function Segment({ top, bottom }: { top: number; bottom: number }) {
  return (
    <View className="absolute w-0.5 bg-edge-2" style={{ start: 16 + NODE / 2 - 1, top, bottom }} />
  );
}
