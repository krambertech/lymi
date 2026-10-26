import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import type { LineColumn } from "@lymi/client/section-line";
import type { ReactNode } from "react";
import { View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { usePalette } from "../theme/palette";
import { DragList, useDragRow } from "../ui/drag-list";
import { Icon } from "../ui/icons";
import { Plate, Press, RowArrow, Text } from "../ui/primitives";
import { ProgressRing } from "./section-line";

// A deck's sections drawn as the path a learner walks: a stop per section on one line, its number
// inside a ring of how much of it is known, a dashed ring while it waits, and for the owner New
// section as the next stop. At rest a stop opens its section; Edit turns the path into a sorting
// table. docs/design/library-decks-and-cards.md "Sections".

const NODE = 34;

interface Props {
  /** The deck's sections, then the cards with no section while there are any. */
  columns: LineColumn[];
  /** The learner's stop, drawn on a tint. */
  focus: number;
  /** The owner swipes, edits and adds; everyone else opens. */
  owner: boolean;
  /** Edit mode: handles to drag, archive at the start, a tap on the name renames. */
  editing: boolean;
  /** Whether later sections wait for earlier ones, so the path's line runs through the stops. */
  inOrder: boolean;
  onOpen: (sectionId: string) => void;
  onNew: () => void;
  onRename: (section: Section) => void;
  onArchive: (section: Section) => void;
  /** The whole order after a drag or a VoiceOver move. */
  onReorder: (ids: string[]) => void;
  /** An order is still being saved, so the handles wait rather than send a second that crosses it. */
  busy?: boolean;
}

export function SectionPath({
  columns,
  focus,
  owner,
  editing,
  inOrder,
  onOpen,
  onNew,
  onRename,
  onArchive,
  onReorder,
  busy = false,
}: Props) {
  const sections = columns.flatMap((c) => (c.section ? [c.section] : []));
  const ids = sections.map((s) => s.id);
  const byId = new Map(columns.map((c) => [c.id, c]));
  const move = (id: string, by: -1 | 1) => {
    const at = ids.indexOf(id);
    const to = at + by;
    if (busy || to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[at], next[to]] = [next[to] as string, next[at] as string];
    onReorder(next);
  };
  const line = inOrder && !editing;
  const stop = (column: LineColumn, at: number, handle?: ReactNode) => (
    <Stop
      column={column}
      at={at}
      here={!editing && at === focus}
      swipes={owner && column.section !== null}
      line={line && column.section !== null}
      lineBelow={at < sections.length - 1 || owner}
      editing={editing}
      handle={handle}
      onOpen={() => onOpen(column.id)}
      onRename={() => column.section && onRename(column.section)}
      onArchive={() => column.section && onArchive(column.section)}
      onMove={(by) => move(column.id, by)}
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
          render={(section, at, handle) => stop(byId.get(section.id) as LineColumn, at, handle)}
        />
      ) : (
        <View>
          {columns.map((column, at) =>
            column.section ? (
              owner ? (
                <SwipeStop
                  key={column.id}
                  onRename={() => column.section && onRename(column.section)}
                  onArchive={() => column.section && onArchive(column.section)}
                >
                  {stop(column, at)}
                </SwipeStop>
              ) : (
                <View key={column.id}>{stop(column, at)}</View>
              )
            ) : null,
          )}
          {owner && <NewStop onPress={onNew} line={line && sections.length > 0} />}
          {/* The cards with no section sit after the path, since no learner walks to them. */}
          {columns.map((column, at) =>
            column.section ? null : <View key="none">{stop(column, at)}</View>,
          )}
        </View>
      )}
    </Plate>
  );
}

/**
 * One stop: its number in its ring on the line, its name and how much of it is known, and a chevron
 * to its page; in Edit, archive before it and a handle after, and a tap on the name renames.
 */
function Stop({
  column: c,
  at,
  here,
  swipes,
  line,
  lineBelow,
  editing,
  handle,
  onOpen,
  onRename,
  onArchive,
  onMove,
  last,
}: {
  column: LineColumn;
  at: number;
  here: boolean;
  /** The owner's stop at rest swipes to Rename and Archive, which VoiceOver gets as actions. */
  swipes: boolean;
  /** The path's line runs into this stop. */
  line: boolean;
  /** And on down to the next. */
  lineBelow: boolean;
  editing: boolean;
  handle?: ReactNode;
  onOpen: () => void;
  onRename: () => void;
  onArchive: () => void;
  onMove: (by: -1 | 1) => void;
  last: boolean;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const row = useDragRow();
  const name = c.section?.name ?? t`No section`;
  const number = i18n.number(at + 1);
  const known = i18n.number(c.known);
  const cards = c.waiting
    ? plural(c.total, { one: "# card, not open yet", other: "# cards, not open yet" })
    : c.total === 0
      ? t`No cards yet`
      : plural(c.total, { one: `${known} of # card known`, other: `${known} of # cards known` });
  const face = (
    <>
      {line && <Segment top={at === 0 ? row / 2 : 0} bottom={lineBelow ? 0 : row / 2} />}
      {editing && (
        <Press onPress={onArchive} drawn={22}>
          <Icon name="remove" size={22} colour={p.danger} strokeWidth={2.25} />
        </Press>
      )}
      <View className="rounded-full bg-plate" style={{ width: NODE, height: NODE }}>
        <ProgressRing column={c} size={NODE} stroke={3}>
          {c.section ? (
            <Text
              className={`text-sm font-medium ${c.waiting ? "text-muted" : "text-text-2"}`}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {number}
            </Text>
          ) : (
            <Icon name="section" size={14} colour={p.muted} />
          )}
        </ProgressRing>
        {c.waiting && c.section && (
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
        <Text
          className={`text-md text-text ${here ? "font-semibold" : "font-medium"}`}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={1}>
          {cards}
        </Text>
      </Press>
      {handle ?? (!editing && <RowArrow />)}
    </>
  );
  const style = { height: row, backgroundColor: here ? p["plate-2"] : p.plate };
  const className = `flex-row items-center gap-3 px-4 ${!editing && at > 0 ? "border-t border-edge" : ""}`;
  if (!editing)
    return (
      <Press
        onPress={onOpen}
        scale={0.99}
        accessibilityRole="link"
        accessibilityLabel={`${c.section ? t`Section ${number}: ${name}, ${cards}` : `${name}, ${cards}`}${here ? `, ${t`You are here`}` : ""}`}
        accessibilityActions={
          swipes
            ? [
                { name: "rename", label: t`Rename` },
                { name: "archive", label: t`Archive` },
              ]
            : undefined
        }
        onAccessibilityAction={(e) => {
          const action = e.nativeEvent.actionName;
          if (action === "rename") onRename();
          if (action === "archive") onArchive();
        }}
        className={className}
        style={style}
      >
        {face}
      </Press>
    );
  // One element for VoiceOver in Edit: archive, rename and moves are its actions.
  return (
    <View
      className={className}
      style={style}
      accessible
      accessibilityLabel={t`Section ${number}: ${name}, ${cards}`}
      accessibilityActions={[
        ...(at > 0 ? [{ name: "up", label: t`Move up` }] : []),
        ...(!last ? [{ name: "down", label: t`Move down` }] : []),
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
      {face}
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
