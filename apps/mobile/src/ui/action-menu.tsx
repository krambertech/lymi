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

const TRIGGERS = { ellipsis: "more", plus: "plus" } as const satisfies Record<string, IconName>;

const symbolOf = (icon: IconName) => (icon in SYMBOLS ? `lymi.${icon}` : undefined);

type ActionMenuProps = {
  label: string;
  symbol: keyof typeof TRIGGERS;
  items: MenuItem[] | MenuItem[][];
  disabled?: boolean;
  onPrimaryAction?: () => void;
} & ({ look?: "bar" | "primary"; target?: undefined } | { look: "row"; target?: number });

export function ActionMenu({
  label,
  symbol,
  look = "bar",
  items,
  disabled = false,
  onPrimaryAction,
  target = 32,
}: ActionMenuProps) {
  const p = usePalette();
  const room = useRoom();
  const groups = (Array.isArray(items[0]) ? items : [items]) as MenuItem[][];
  const bar = look !== "row";
  const glyph = look === "primary" ? p["amber-ink"] : look === "row" ? p["ink-muted"] : p.ink;
  return (
    <Host colorScheme={room} style={{ width: bar ? 40 : target, height: bar ? 40 : target }}>
      <Menu
        {...(onPrimaryAction ? { onPrimaryAction } : {})}
        label={
          <Image
            assetName={symbolOf(TRIGGERS[symbol])}
            size={bar ? 18 : 16}
            color={glyph}
            modifiers={[frame({ width: bar ? 24 : target, height: bar ? 24 : target })]}
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
                modifiers={[tint(item.destructive ? p.danger : p.ink)]}
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

export function MenuHost() {
  return null;
}
