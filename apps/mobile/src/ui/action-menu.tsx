import { Button, Host, Image, Label, Menu, Section } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  disabled as disable,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import SYMBOLS from "../../assets/symbols/manifest.json";
import { usePalette, useRoom } from "../theme/palette";
import type { IconName } from "./icons";
import type { MenuItem } from "./menu";

/** The two buttons a menu grows from, as their icons in the registry. */
const TRIGGERS = { ellipsis: "more", plus: "plus" } as const satisfies Record<string, IconName>;

/** Lymi's icon as the custom symbol scripts/symbols.mjs made from it; one drawn by hand has none. */
const symbolOf = (icon: IconName) => (icon in SYMBOLS ? `lymi.${icon}` : undefined);

interface ActionMenuProps {
  /** What the button does, for VoiceOver: "Card options", "Add". */
  label: string;
  /** The button: `ellipsis` for ⋯, `plus` for add. */
  symbol: keyof typeof TRIGGERS;
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
    // A fixed box that React Native lays out: a self-measuring host keeps a stale place when the
    // list around it moves, and its button drifts off its row.
    <Host colorScheme={room} style={{ width: bar ? 40 : 32, height: bar ? 40 : 32 }}>
      <Menu
        label={
          <Image
            assetName={symbolOf(TRIGGERS[symbol])}
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
                role={item.destructive ? "destructive" : "default"}
                // Ink on ordinary rows and red on a removal, so an amber button's tint stays on the button.
                modifiers={[tint(item.destructive ? p.danger : p.text)]}
                onPress={item.onSelect}
              >
                <Label
                  title={item.label}
                  icon={item.icon && <Image assetName={symbolOf(item.icon)} />}
                />
              </Button>
            ))}
          </Section>
        ))}
      </Menu>
    </Host>
  );
}
