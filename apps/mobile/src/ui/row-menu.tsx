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
  /** Lymi's icon, drawn by iOS as the custom symbol scripts/symbols.mjs made from it. */
  icon: IconName;
  destructive?: boolean;
  onSelect: () => void;
}

export interface RowMenuProps {
  surface: RowMenuSurface;
  /** Where a tap goes, and the page the preview shows when `preview` is `page`. */
  href: Href;
  /** A tap that does something other than follow `href`, such as starting a review. */
  onPress?: () => void;
  /** As the finger lands, such as to start loading the page the row opens. */
  onPressIn?: () => void;
  /** What VoiceOver reads for the row; the native preview view hides the row's own text from it. */
  label: string;
  /** What the row is to VoiceOver; a heading does nothing on a tap. */
  kind?: "link" | "button" | "heading";
  /** Rows, or groups of rows split by iOS's separators; the removal goes last on its own. */
  items: RowMenuItem[] | RowMenuItem[][];
  /** `page` lifts the page `href` opens; a node is drawn instead; none lifts the row itself. */
  preview?: "page" | { node: ReactNode; width?: number; height?: number };
  children: ReactNode;
}

/**
 * A list row that opens iOS's context menu on a long press, with a preview where one helps. Each
 * menu row is also a VoiceOver action, since a long press is never found by ear. phone.md "Menus".
 */
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
  // The link would follow `href`; this row does something else with a tap, or nothing.
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
      accessibilityLabel={label}
      onAccessibilityTap={heading ? undefined : tap ? () => tap() : () => router.push(href)}
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
