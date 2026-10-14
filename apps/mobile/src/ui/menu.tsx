import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useRef, useState } from "react";
import { ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";
import { Sheet, SheetGroup, SheetRow } from "./sheet";

// A choice rises from the bottom edge as a sheet: iOS's glass, Lymi's rows. Commands from a button are
// iOS's own menu, in action-menu.tsx. phone.md "Menus" and "Sheets".

export interface MenuItem {
  label: string;
  icon?: IconName;
  /** Archive, Remove or Leave: red, and acts at once when it can be undone. */
  destructive?: boolean;
  onSelect: () => void;
}

/** Opens a sheet; a choice runs once the sheet has gone, so nothing moves under it. */
function useMenuSheet(
  onClosed?: () => void,
  controlled?: { open: boolean; onOpenChange: (open: boolean) => void },
) {
  const [own, setOwn] = useState(false);
  const open = controlled?.open ?? own;
  const setOpen = controlled?.onOpenChange ?? setOwn;
  const chosen = useRef<(() => void) | null>(null);
  return {
    show: () => setOpen(true),
    choose: (then: () => void) => {
      chosen.current = then;
      setOpen(false);
    },
    sheet: (title: string | undefined, groups: ReactNode) => (
      <Sheet
        title={title}
        open={open}
        onOpenChange={setOpen}
        onDismiss={() => {
          chosen.current?.();
          chosen.current = null;
          onClosed?.();
        }}
      >
        {groups}
      </Sheet>
    ),
  };
}

interface SelectProps<T extends string> {
  /** Lymi's own box or chip, showing what is chosen; pressing it opens the list. */
  trigger: ReactNode;
  /** The field's name: the sheet's title, and read with the choice. */
  label: string;
  value: T;
  /** `detail` is a line under the option that says what choosing it means. */
  options: { value: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
  /** After the sheet has gone, chosen or not; a composer puts the cursor back. */
  onClosed?: () => void;
  /** To open the list from elsewhere, such as right after a choice that needs it: pass both. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Past this many fixed options, such as languages, the list is searched rather than scrolled. forms.md. */
const SEARCHED_PAST = 15;

/**
 * One option in a sheet titled with the field's name. Up to fifteen, such as a deck, are a list;
 * a longer fixed list is a Combobox, its search field first and the list one height as it filters.
 */
export function Select<T extends string>({
  trigger,
  label,
  value,
  options,
  onChange,
  onClosed,
  open,
  onOpenChange,
}: SelectProps<T>) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const menu = useMenuSheet(
    () => {
      setQuery("");
      onClosed?.();
    },
    open !== undefined && onOpenChange ? { open, onOpenChange } : undefined,
  );
  const chosen = options.find((o) => o.value === value)?.label ?? "";
  const searched = options.length > SEARCHED_PAST;
  const needle = query.trim().toLocaleLowerCase(i18n.locale);
  const shown = needle
    ? options.filter((o) => o.label.toLocaleLowerCase(i18n.locale).includes(needle))
    : options;
  const rows = (
    <SheetGroup>
      {shown.map((o, i) => (
        <SheetRow
          key={o.value}
          label={o.label}
          detail={o.detail}
          chosen={o.value === value}
          active={!!needle && i === 0}
          onPress={() => menu.choose(() => o.value !== value && onChange(o.value))}
        />
      ))}
    </SheetGroup>
  );
  return (
    <>
      <Press
        onPress={menu.show}
        accessibilityRole="button"
        accessibilityLabel={t`${label}: ${chosen}`}
      >
        {trigger}
      </Press>
      {menu.sheet(
        label,
        searched ? (
          <>
            <View className="h-11 flex-row items-center gap-2 rounded-xl bg-glass-plate px-3.5">
              <Icon name="search" size={18} colour={p.muted} />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={t`Search`}
                placeholderTextColor={p.muted}
                accessibilityLabel={t`Search ${label}`}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                clearButtonMode="while-editing"
                returnKeyType="done"
                onSubmitEditing={() => {
                  const first = shown[0];
                  if (first) menu.choose(() => first.value !== value && onChange(first.value));
                }}
                selectionColor={p.text}
                className="flex-1 font-sans text-text"
                style={{ fontSize: 17 }}
                maxFontSizeMultiplier={inputCap(17)}
              />
            </View>
            <ScrollView
              style={{ height: height * 0.55 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {shown.length > 0 ? (
                rows
              ) : (
                <Text className="px-4 py-3 text-md text-muted">{t`No matches`}</Text>
              )}
            </ScrollView>
          </>
        ) : (
          rows
        ),
      )}
    </>
  );
}

/** A Select's closed box: the same 44 pt box as every control, the choice and a chevron. */
export function SelectTrigger({
  children,
  invalid = false,
}: {
  children: string;
  invalid?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      className={`h-11 flex-row items-center gap-2 rounded-md border bg-plate ps-3.5 pe-3 ${invalid ? "border-danger" : "border-edge"}`}
    >
      <Text className="flex-1 text-md text-text" numberOfLines={1}>
        {children}
      </Text>
      <Icon name="down" size={18} colour={p.muted} />
    </View>
  );
}
