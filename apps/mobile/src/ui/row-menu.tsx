import { unisolate } from "@lymi/core";
import type { ContextMenuAction, ContextMenuSurface } from "@lymi/core/analytics";
import { type Href, Icon, Label, Link, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { type GestureResponderEvent, Pressable, View } from "react-native";
import SYMBOLS from "../../assets/symbols/manifest.json";
import type { IconName } from "./icons";
import { trackRowMenu } from "./row-menu-track";

export { trackRowMenu };

export type RowMenuSurface = ContextMenuSurface;
export type RowMenuAction = ContextMenuAction;

export interface RowMenuItem {
  id: RowMenuAction;
  label: string;
  icon: IconName;
  destructive?: boolean;
  onSelect: () => void;
}

export interface RowMenuProps {
  surface: RowMenuSurface;
  href: Href;
  onPress?: () => void;
  onPressIn?: () => void;
  label: string;
  kind?: "link" | "button" | "heading";
  items: RowMenuItem[] | RowMenuItem[][];
  preview?: "page" | { node: ReactNode; width?: number; height?: number };
  children: ReactNode;
}

export function RowMenu({
  surface,
  href,
  onPress,
  onPressIn,
  label,
  kind = "link",
  items,
  preview,
  children,
}: RowMenuProps) {
  const router = useRouter();
  const groups = (Array.isArray(items[0]) ? items : [items]) as RowMenuItem[][];
  const flat = groups.flat();
  const take = (item: RowMenuItem) => {
    trackRowMenu(surface, item.id);
    item.onSelect();
  };
  const heading = kind === "heading";
  const tap =
    onPress || heading
      ? (e?: GestureResponderEvent) => {
          e?.preventDefault();
          onPress?.();
        }
      : undefined;
  return (
    <View
      accessible
      accessibilityRole={heading ? "header" : kind}
      accessibilityLabel={unisolate(label)}
      onAccessibilityTap={
        heading ? onPress && (() => tap?.()) : tap ? () => tap() : () => router.push(href)
      }
      accessibilityActions={flat.map((i) => ({ name: i.id, label: i.label }))}
      onAccessibilityAction={(e) => {
        const item = flat.find((i) => i.id === e.nativeEvent.actionName);
        if (item) take(item);
      }}
    >
      <Link href={href} asChild>
        <Link.Trigger>
          <Pressable
            onPressIn={onPressIn}
            onPress={tap}
            style={({ pressed }) => ({ transform: [{ scale: pressed && !heading ? 0.99 : 1 }] })}
          >
            {children}
          </Pressable>
        </Link.Trigger>
        {preview === "page" ? (
          <Link.Preview />
        ) : preview ? (
          <Link.Preview style={{ width: preview.width, height: preview.height }}>
            {preview.node}
          </Link.Preview>
        ) : null}
        <Link.Menu>
          {groups.map((group) =>
            group.length === 0 ? null : (
              <Link.Menu key={group.map((i) => i.id).join()} title="" inline>
                {group.map((item) => (
                  <Link.MenuAction
                    key={item.id}
                    destructive={item.destructive}
                    imageRenderingMode="template"
                    onPress={() => take(item)}
                  >
                    <Label>{item.label}</Label>
                    {item.icon in SYMBOLS && <Icon xcasset={`lymi.${item.icon}`} />}
                  </Link.MenuAction>
                ))}
              </Link.Menu>
            ),
          )}
        </Link.Menu>
      </Link>
    </View>
  );
}
