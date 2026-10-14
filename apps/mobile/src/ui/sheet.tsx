import { BottomSheet, Group, Host, RNHostView } from "@expo/ui/swift-ui";
import { presentationDetents, presentationDragIndicator } from "@expo/ui/swift-ui/modifiers";
import { useLingui } from "@lingui/react/macro";
import * as Haptics from "expo-haptics";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AccessibilityInfo, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette, useRoom } from "../theme/palette";
import { GlassButton } from "./glass";
import { Icon, type IconName } from "./icons";
import { Text } from "./primitives";
import { OnGlass } from "./surface";

// A sheet that rises over the screen, presented by iOS so it is Liquid Glass, follows the finger
// and swipes away; what is inside is Lymi's. phone.md "Sheets".

/**
 * Where a sheet's own text starts: 16 pt in from a plate's edge, where a row's icon or check starts,
 * as iOS sets a grouped list's headers. One line for the title, the description, headings and notes.
 */
const ROW_INSET = 16;
/** Whether this group's rows keep the slot: only when one of them shows an icon or a check. */
const GroupMarked = createContext(true);
/** Where the sheet's own text starts: the title, the description and every note. */
const SheetInset = createContext(ROW_INSET);

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** After the sheet has gone, so what a row chose can run without moving anything under it. */
  onDismiss?: () => void;
  /** What the sheet is about, over its groups. */
  title?: string;
  /** One or two sentences under the title, on the same line as the title and the rows' labels. */
  description?: ReactNode;
  /** A quiet action at the title's end, such as Reset. */
  aside?: ReactNode;
  /**
   * A sheet that saves: close at the start and an amber ✓ at the end, the title between them, as
   * every form has. Close and a swipe leave without saving.
   */
  save?: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean };
  /** What shows first; the sheet opens at its height. */
  children: ReactNode;
  /**
   * More of the same, under the fold: dragging the sheet up opens it to the full screen, where
   * iOS turns the glass opaque, as the dev menu does.
   */
  more?: ReactNode;
}

/** A glass sheet sized to what it holds, with Lymi's groups and rows inside. */
export function Sheet({
  open,
  onOpenChange,
  onDismiss,
  title,
  description,
  aside,
  save,
  children,
  more,
}: SheetProps) {
  const { t } = useLingui();
  const room = useRoom();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [peek, setPeek] = useState<number | null>(null);
  const inset = ROW_INSET;
  const detents = more && peek ? [presentationDetents([{ height: peek }, "large"])] : [];
  const heading = save ? (
    <View className="flex-row items-center gap-3 pb-3">
      <GlassButton icon="close" label={t`Cancel`} onPress={() => onOpenChange(false)} />
      <Text
        className="flex-1 text-center text-md font-medium text-text"
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>
      <GlassButton
        icon="check"
        label={save.label}
        primary
        disabled={save.disabled}
        busy={save.busy}
        onPress={save.onPress}
      />
    </View>
  ) : (
    title && (
      <View
        className={`flex-row items-center gap-3 ${description ? "pb-1.5" : "pb-3"}`}
        style={{ paddingStart: inset }}
      >
        <Text className="flex-1 text-lg font-medium text-text" accessibilityRole="header">
          {title}
        </Text>
        {aside}
      </View>
    )
  );
  const first = (
    <SheetInset.Provider value={inset}>
      <OnGlass>
        {heading}
        {description && (
          <Text className="pb-3 text-base text-text-2" style={{ paddingStart: inset }}>
            {description}
          </Text>
        )}
        <View className="gap-3">{children}</View>
      </OnGlass>
    </SheetInset.Provider>
  );
  const top = save ? "pt-4" : "pt-7";
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
                contentContainerClassName={`px-4 pb-8 ${top}`}
                keyboardShouldPersistTaps="handled"
              >
                <View onLayout={(e) => setPeek(e.nativeEvent.layout.height + 56)}>{first}</View>
                <View className="gap-3 pt-3">
                  <SheetInset.Provider value={inset}>
                    <OnGlass>{more}</OnGlass>
                  </SheetInset.Provider>
                </View>
              </ScrollView>
            </RNHostView>
          ) : (
            <RNHostView matchContents>
              {/* A list taller than the screen, such as every language, scrolls inside the sheet. */}
              <ScrollView
                style={{ width, maxHeight: height - insets.top - 16 }}
                contentContainerClassName={`px-4 pb-4 ${top}`}
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

/** A name over a group, on the sheet's text line. */
export function SheetHeading({ children }: { children: string }) {
  const inset = useContext(SheetInset);
  return (
    <Text
      className="-mb-1 pt-2 text-md font-semibold text-text"
      style={{ paddingStart: inset }}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

/** A line under a group that says more about it, on the sheet's text line. */
export function SheetNote({ children }: { children: ReactNode }) {
  const inset = useContext(SheetInset);
  return (
    <Text className="-mt-1 text-sm text-muted" style={{ paddingStart: inset }}>
      {children}
    </Text>
  );
}

/** An error in a sheet, on the sheet's text line and read out as it appears: iOS ignores accessibilityLiveRegion. */
export function SheetError({ children }: { children: string }) {
  const inset = useContext(SheetInset);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(children);
  }, [children]);
  return (
    <Text
      className="text-base text-danger"
      style={{ paddingStart: inset }}
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  );
}

/** A row keeps the mark slot when it has an icon or is a choice. */
const isMarked = (row: ReactNode) =>
  isValidElement<{ icon?: unknown; chosen?: unknown }>(row) &&
  (!!row.props.icon || row.props.chosen !== undefined);

/**
 * Rows that belong together, on one plate inset from the sheet's edge, split by full-width
 * hairlines, as every plate in Lymi is. A sheet's groups sit 12 pt apart.
 */
export function SheetGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  const marked = rows.some(isMarked);
  return (
    <GroupMarked.Provider value={marked}>
      <View className="overflow-hidden rounded-xl bg-glass-group">
        {rows.map((row, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are given in order and never reorder
          <Fragment key={i}>
            {i > 0 && <View className="h-px bg-edge" />}
            {row}
          </Fragment>
        ))}
      </View>
    </GroupMarked.Provider>
  );
}

interface SheetRowProps {
  label: string;
  /** A Lucide icon in the slot the group's rows keep once any of them has a mark, so labels line up. */
  icon?: IconName | undefined;
  /** A line under the label, such as what a setting is now. */
  detail?: string | undefined;
  /** Archive, Remove or Leave: red. */
  destructive?: boolean | undefined;
  /** A short figure at the row's end, such as how many cards a filter keeps. */
  value?: string | undefined;
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
  value,
  destructive = false,
  chosen,
  multiple = false,
  opens = false,
  active = false,
  disabled = false,
  onPress,
}: SheetRowProps) {
  const p = usePalette();
  const slot = useContext(GroupMarked);
  const ink = disabled ? p.muted : destructive ? p.danger : p.text;
  const mark =
    chosen === undefined
      ? icon && (
          <Icon
            name={icon}
            size={20}
            colour={disabled ? p.faint : destructive ? p.danger : p["text-2"]}
          />
        )
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
      className="min-h-[52px] flex-row items-center gap-3 ps-4 pe-3.5"
      style={({ pressed }) => (pressed || active ? { backgroundColor: p.hover } : null)}
    >
      {slot && <View className="w-5 items-center">{mark}</View>}
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
      {value !== undefined && (
        <Text className="text-md text-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
      )}
      {opens && <Icon name="forward" size={18} colour={p.muted} />}
    </Pressable>
  );
}
