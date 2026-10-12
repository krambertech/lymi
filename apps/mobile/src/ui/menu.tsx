import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useRef, useState } from "react";
import { ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";
import { Sheet, SheetGroup, SheetRow } from "./sheet";

// A menu rises from the bottom edge as a sheet, as the web's does on touch: iOS's glass, Lymi's
// rows. overlays.md "Menus"; phone.md "Sheets".

export interface MenuItem {
  label: string;
  icon?: IconName;
  /** Archive, Remove or Leave: red, and acts at once when it can be undone. */
  destructive?: boolean;
  onSelect: () => void;
}

/** Opens a sheet; a choice runs once the sheet has gone, so nothing moves under it. */
function useMenuSheet(onClosed?: () => void) {
  const [open, setOpen] = useState(false);
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

interface DropdownMenuProps {
  /** Lymi's own control; call `open` from its press. */
  trigger: (open: () => void) => ReactNode;
  /** Over the rows; a card's term, say. Left out, the sheet has no title. */
  title?: string;
  /** Rows, or groups of rows, each group its own plate. */
  items: MenuItem[] | MenuItem[][];
}

/** A list of actions from a button. */
export function DropdownMenu({ trigger, title, items }: DropdownMenuProps) {
  const menu = useMenuSheet();
  const groups = (Array.isArray(items[0]) ? items : [items]) as MenuItem[][];
  return (
    <>
      {trigger(menu.show)}
      {menu.sheet(
        title,
        groups.map((group) => (
          <SheetGroup key={group.map((i) => i.label).join()}>
            {group.map((item) => (
              <SheetRow
                key={item.label}
                label={item.label}
                icon={item.icon}
                destructive={item.destructive}
                onPress={() => menu.choose(item.onSelect)}
              />
            ))}
          </SheetGroup>
        )),
      )}
    </>
  );
}

interface SelectProps<T extends string> {
  /** Lymi's own box or chip, showing what is chosen; pressing it opens the list. */
  trigger: ReactNode;
  /** The field's name: the sheet's title, and read with the choice. */
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /** After the sheet has gone, chosen or not; a composer puts the cursor back. */
  onClosed?: () => void;
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
}: SelectProps<T>) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const menu = useMenuSheet(() => {
    setQuery("");
    onClosed?.();
  });
  const chosen = options.find((o) => o.value === value)?.label ?? "";
  const searched = options.length > SEARCHED_PAST;
  const needle = query.trim().toLocaleLowerCase(i18n.locale);
  const shown = needle
    ? options.filter((o) => o.label.toLocaleLowerCase(i18n.locale).includes(needle))
    : options;
  const rows = (
    <SheetGroup>
      {shown.map((o) => (
        <SheetRow
          key={o.value}
          label={o.label}
          chosen={o.value === value}
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
