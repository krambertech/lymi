import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { usePalette } from "../theme/palette";
import { ActionMenu } from "../ui/action-menu";
import { GlassSurface } from "../ui/glass";
import { Icon } from "../ui/icons";
import type { MenuItem } from "../ui/menu";
import { Button, IconButton, Text } from "../ui/primitives";

/** Stands in for a row's state mark while choosing cards, at the same 15 pt, so the list never moves. */
export function SelectBox({ checked }: { checked: boolean }) {
  const p = usePalette();
  return (
    <View
      className="items-center justify-center"
      style={{
        width: 15,
        height: 15,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: checked ? p.text : p["edge-2"],
        backgroundColor: checked ? p.text : p.plate,
      }}
    >
      {checked && <Icon name="check" size={11} colour={p.canvas} strokeWidth={3} />}
    </View>
  );
}

/**
 * Floats above the tab bar while choosing cards, as Photos and Mail pin theirs: ✕ to stop, the
 * count, Select all or Clear, and what can be done to the chosen cards in iOS's own menu, so a new
 * action, such as tags, is one more row. library-decks-and-cards.md.
 */
export function SelectionToolbar({
  count,
  total,
  onAll,
  onClear,
  actions,
  onDone,
}: {
  count: number;
  /** How many cards the list shows, which Select all chooses. */
  total: number;
  onAll: () => void;
  onClear: () => void;
  actions: MenuItem[] | MenuItem[][];
  onDone: () => void;
}) {
  const { t } = useLingui();
  const all = count > 0 && count === total;
  const counted = plural(count, { 0: "Select cards", one: "# selected", other: "# selected" });
  // iOS has no live regions, so the count is said as it changes.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(counted);
  }, [counted]);
  return (
    <GlassSurface
      tint="room"
      style={{
        minHeight: 56,
        borderRadius: 28,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingStart: 6,
        paddingEnd: 8,
        paddingVertical: 6,
      }}
    >
      <View
        accessibilityRole="toolbar"
        accessibilityLabel={t`Selected cards`}
        className="flex-1 flex-row items-center gap-1"
      >
        <IconButton icon="close" size="sm" label={t`Stop selecting`} onPress={onDone} />
        <Text
          className="flex-1 ps-1 text-base font-medium text-text"
          style={{ fontVariant: ["tabular-nums"] }}
          numberOfLines={1}
        >
          {counted}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          label={all ? t`Clear` : t`Select all`}
          onPress={all ? onClear : onAll}
        />
        <ActionMenu
          label={t`Actions for the selected cards`}
          symbol="ellipsis"
          look="primary"
          items={actions}
          disabled={count === 0}
        />
      </View>
    </GlassSurface>
  );
}
