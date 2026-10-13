import { BottomSheet, Group, Host, RNHostView } from "@expo/ui/swift-ui";
import { presentationDetents, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { Children, Fragment, type ReactNode, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette, useRoom } from "../theme/palette";
import { Icon, type IconName } from "./icons";
import { Text } from "./primitives";
import { OnGlass } from "./surface";

// A sheet that rises over the screen, presented by iOS so it is Liquid Glass, follows the finger
// and swipes away; what is inside is Lymi's. phone.md "Sheets".

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** After the sheet has gone, so what a row chose can run without moving anything under it. */
  onDismiss?: () => void;
  /** What the sheet is about, over its groups. */
  title?: string;
  /** What shows first; the sheet opens at its height. */
  children: ReactNode;
  /**
   * More of the same, under the fold: dragging the sheet up opens it to the full screen, where
   * iOS turns the glass opaque, as the dev menu does.
   */
  more?: ReactNode;
}

/** A glass sheet sized to what it holds, with Lymi's groups and rows inside. */
export function Sheet({ open, onOpenChange, onDismiss, title, children, more }: SheetProps) {
  const room = useRoom();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [peek, setPeek] = useState<number | null>(null);
  const detents = more && peek ? [presentationDetents([{ height: peek }, "large"])] : [];
  const first = (
    <OnGlass>
      {title && (
        <Text className="px-4 pb-3 text-lg font-medium text-text" accessibilityRole="header">
          {title}
        </Text>
      )}
      <View className="gap-3">{children}</View>
    </OnGlass>
  );
  return (
    <Host colorScheme={room} style={{ position: "absolute", width: 0, height: 0 }}>
      <BottomSheet
        isPresented={open}
        onIsPresentedChange={onOpenChange}
        onDismiss={() => {
          onDismiss?.();
        }}
        fitToContents={!more}
      >
        <Group modifiers={[presentationDragIndicator("visible"), ...detents]}>
          {more ? (
            // Fills the sheet rather than sizing to its rows, so its top shows when it peeks and the
            // rest scrolls once it is dragged up to the full screen.
            <RNHostView>
              <ScrollView
                style={{ width }}
                contentContainerClassName="px-4 pt-7 pb-8"
                keyboardShouldPersistTaps="handled"
              >
                <View onLayout={(e) => setPeek(e.nativeEvent.layout.height + 56)}>{first}</View>
                <View className="gap-3 pt-3">
                  <OnGlass>{more}</OnGlass>
                </View>
              </ScrollView>
            </RNHostView>
          ) : (
            <RNHostView matchContents>
              {/* A list taller than the screen, such as every language, scrolls inside the sheet. */}
              <ScrollView
                style={{ width, maxHeight: height - insets.top - 16 }}
                contentContainerClassName="px-4 pt-7 pb-4"
                // A row or Save takes the first tap, even with the keyboard up.
                keyboardShouldPersistTaps="handled"
              >
                {first}
              </ScrollView>
            </RNHostView>
          )}
        </Group>
      </BottomSheet>
    </Host>
  );
}

/**
 * Rows that belong together, on one plate inset from the sheet's edge, split by full-width
 * hairlines, as every plate in Lymi is. A sheet's groups sit 12 pt apart.
 */
export function SheetGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="overflow-hidden rounded-xl bg-glass-group">
      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows are given in order and never reorder
        <Fragment key={i}>
          {i > 0 && <View className="h-px bg-edge" />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

interface SheetRowProps {
  label: string;
  /** A Lucide icon in the slot every row keeps, so labels line up. */
  icon?: IconName | undefined;
  /** A line under the label, such as what a setting is now. */
  detail?: string | undefined;
  /** Archive, Remove or Leave: red. */
  destructive?: boolean | undefined;
  /** In a choice list: whether this is the current one, marked with a check. */
  chosen?: boolean | undefined;
  /** One of several that can be chosen together: a checkbox rather than a radio. */
  multiple?: boolean | undefined;
  /** Opens more, so it ends in a chevron. */
  opens?: boolean | undefined;
  /** The match Return takes in a searched list, lit as a pressed row is. */
  active?: boolean | undefined;
  /** Needs what the phone lacks now, such as a connection; the detail says what. */
  disabled?: boolean | undefined;
  onPress: () => void;
}

/** One row of a sheet: 52 pt, Lymi's icon and type, red when it removes something. */
export function SheetRow({
  label,
  icon,
  detail,
  destructive = false,
  chosen,
  multiple = false,
  opens = false,
  active = false,
  disabled = false,
  onPress,
}: SheetRowProps) {
  const p = usePalette();
  const ink = destructive ? p.danger : p.text;
  const mark =
    chosen === undefined
      ? icon && <Icon name={icon} size={20} colour={destructive ? p.danger : p["text-2"]} />
      : chosen && <Icon name="check" size={20} colour={p.text} strokeWidth={2.25} />;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole={chosen === undefined ? "menuitem" : multiple ? "checkbox" : "radio"}
      accessibilityState={chosen === undefined ? { disabled } : { checked: chosen, disabled }}
      disabled={disabled}
      className={`min-h-[52px] flex-row items-center gap-3 ps-4 pe-3.5 ${disabled ? "opacity-45" : ""}`}
      style={({ pressed }) => (pressed || active ? { backgroundColor: p.hover } : null)}
    >
      <View className="w-5 items-center">{mark}</View>
      <View className="flex-1 gap-0.5 py-2.5">
        <Text
          className={`text-md ${chosen ? "font-medium" : ""}`}
          style={{ color: ink }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {detail && <Text className="text-sm text-muted">{detail}</Text>}
      </View>
      {opens && <Icon name="forward" size={18} colour={p.faint} />}
    </Pressable>
  );
}
