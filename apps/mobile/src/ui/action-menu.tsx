import { Button, Host, Image, Menu, Section } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  disabled as disable,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import type { ComponentProps } from "react";
import { usePalette, useRoom } from "../theme/palette";
import type { IconName } from "./icons";
import type { MenuItem } from "./menu";

type Symbol = NonNullable<ComponentProps<typeof Button>["systemImage"]>;

/** iOS draws its own menus, so each Lucide icon a menu row uses has its SF Symbol here. */
const SYMBOLS: Partial<Record<IconName, Symbol>> = {
  plus: "plus",
  share: "square.and.arrow.up",
  deck: "rectangle.stack",
  series: "square.stack.3d.up",
  import: "square.and.arrow.down",
  edit: "pencil",
  archive: "archivebox",
  restore: "arrow.uturn.backward",
  move: "folder",
  moveUp: "arrow.up",
  moveDown: "arrow.down",
  important: "star",
  pronunciation: "speaker.wave.2",
  hook: "lightbulb",
  settings: "gearshape",
  section: "list.number",
  signOut: "rectangle.portrait.and.arrow.right",
  uninvite: "person.crop.circle.badge.xmark",
  play: "play",
  unlock: "lock.open",
  search: "magnifyingglass",
  notes: "note.text",
};

interface ActionMenuProps {
  /** What the button does, for VoiceOver: "Card options", "Add". */
  label: string;
  /** The button's SF Symbol: `ellipsis` for ⋯, `plus` for add. */
  symbol: Symbol;
  /**
   * `bar` is a 44 pt glass button for a screen's top bar; `primary` is the bar's amber one; `row` is
   * a bare glyph at the end of a list row.
   */
  look?: "bar" | "primary" | "row";
  /** Rows, or groups of rows split by iOS's own separators. */
  items: MenuItem[] | MenuItem[][];
  /** Its work is under way, such as a removal it started. */
  disabled?: boolean;
}

/**
 * Commands from a button, as iOS's own menu: it grows out of the button in Liquid Glass, a drag
 * through it picks, and VoiceOver reads it as a menu. A choice that needs a second line, a long list
 * or a search is a `Sheet` instead. phone.md "Menus".
 */
export function ActionMenu({
  label,
  symbol,
  look = "bar",
  items,
  disabled = false,
}: ActionMenuProps) {
  const p = usePalette();
  const room = useRoom();
  const groups = (Array.isArray(items[0]) ? items : [items]) as MenuItem[][];
  const bar = look !== "row";
  const glyph = look === "primary" ? p["amber-ink"] : look === "row" ? p.muted : p.text;
  return (
    <Host colorScheme={room} matchContents>
      <Menu
        label={
          <Image
            systemName={symbol}
            size={bar ? 18 : 16}
            color={glyph}
            modifiers={[frame({ width: bar ? 24 : 32, height: bar ? 24 : 32 })]}
          />
        }
        modifiers={[
          ...(bar
            ? [
                buttonStyle(look === "primary" ? "glassProminent" : "glass"),
                buttonBorderShape("circle"),
              ]
            : [buttonStyle("plain")]),
          ...(look === "primary" ? [tint(p.amber)] : []),
          accessibilityLabel(label),
          disable(disabled),
        ]}
      >
        {groups.map((group) => (
          <Section key={group.map((i) => i.label).join()}>
            {group.map((item) => (
              <Button
                key={item.label}
                label={item.label}
                systemImage={item.icon ? SYMBOLS[item.icon] : undefined}
                role={item.destructive ? "destructive" : "default"}
                // Ink on ordinary rows, so the plus's amber stays on the button; iOS draws a removal red.
                modifiers={item.destructive ? undefined : [tint(p.text)]}
                onPress={item.onSelect}
              />
            ))}
          </Section>
        ))}
      </Menu>
    </Host>
  );
}
