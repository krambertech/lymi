import { unisolate } from "@lymi/core";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { haptics } from "../theme/haptics";
import type { RowMenuItem, RowMenuProps } from "./row-menu";
import { trackRowMenu } from "./row-menu-track";
import { Sheet, SheetGroup, SheetRow } from "./sheet";

export type { RowMenuAction, RowMenuItem, RowMenuSurface } from "./row-menu";
export { trackRowMenu };

/**
 * Android's counterpart of row-menu.tsx: expo-router's link menu and preview are iOS-only, so a long
 * press raises the same rows as a sheet, the shape a menu takes on touch. phone.md "Menus".
 */
export function RowMenu({
  surface,
  href,
  onPress,
  onPressIn,
  label,
  kind = "link",
  items,
  children,
}: RowMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The sheet mounts on a long press and stays until it has gone, so a long list carries none.
  const [mounted, setMounted] = useState(false);
  // What a row chose runs once the sheet has gone, so a page it opens or a sheet it raises is not under it.
  const chosen = useRef<RowMenuItem | null>(null);
  const groups = ((Array.isArray(items[0]) ? items : [items]) as RowMenuItem[][]).filter(
    (g) => g.length > 0,
  );
  const flat = groups.flat();
  const take = (item: RowMenuItem) => {
    trackRowMenu(surface, item.id);
    item.onSelect();
  };
  const heading = kind === "heading";
  const tap = heading ? undefined : (onPress ?? (() => router.push(href)));
  return (
    <View
      accessible
      accessibilityRole={heading ? "header" : kind}
      accessibilityLabel={unisolate(label)}
      onAccessibilityTap={tap}
      accessibilityActions={flat.map((i) => ({ name: i.id, label: i.label }))}
      onAccessibilityAction={(e) => {
        const item = flat.find((i) => i.id === e.nativeEvent.actionName);
        if (item) take(item);
      }}
    >
      <Pressable
        onPressIn={onPressIn}
        onPress={tap}
        onLongPress={
          flat.length > 0
            ? () => {
                haptics.longPress();
                setMounted(true);
                setOpen(true);
              }
            : undefined
        }
        style={({ pressed }) => ({ transform: [{ scale: pressed && !heading ? 0.99 : 1 }] })}
      >
        {children}
      </Pressable>
      {mounted && (
        <Sheet
          open={open}
          onOpenChange={setOpen}
          onDismiss={() => {
            setMounted(false);
            const item = chosen.current;
            chosen.current = null;
            if (item) take(item);
          }}
        >
          {groups.map((group) => (
            <SheetGroup key={group.map((i) => i.id).join()}>
              {group.map((item) => (
                <SheetRow
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  destructive={item.destructive}
                  onPress={() => {
                    chosen.current = item;
                    setOpen(false);
                  }}
                />
              ))}
            </SheetGroup>
          ))}
        </Sheet>
      )}
    </View>
  );
}
