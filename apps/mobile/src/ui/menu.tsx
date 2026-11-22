import { useLingui } from "@lingui/react/macro";
import { type ReactNode, useRef, useState } from "react";
import { ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { Icon, type IconName } from "./icons";
import { Press, Text } from "./primitives";
import { ClearText } from "./search-bar";
import { Sheet, SheetGroup, SheetRow } from "./sheet";
import { useSheetFocus } from "./sheet-focus";

export interface MenuItem {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onSelect: () => void;
}

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
    sheet: (title: string, groups: ReactNode) => (
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

type Controlled = { open: boolean; onOpenChange: (open: boolean) => void };

type SelectProps<T extends string> = {
  trigger: ReactNode;
  label: string;
  value: T;
  options: { value: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
  onClosed?: () => void;
} & (Controlled | { open?: undefined; onOpenChange?: undefined });

export const SEARCHED_PAST = 15;

export function useSearched<T extends { label: string }>(options: T[]) {
  const { i18n } = useLingui();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase(i18n.locale);
  const shown = needle
    ? options.filter((o) => o.label.toLocaleLowerCase(i18n.locale).includes(needle))
    : options;
  return { query, setQuery, searching: !!needle, shown };
}

export function SearchField({
  label,
  query,
  onChange,
  onSubmit,
  fill = "plate",
  placeholder,
  stay = false,
}: {
  label: string;
  query: string;
  onChange: (query: string) => void;
  onSubmit: () => void;
  fill?: "plate" | "group";
  placeholder?: string;
  stay?: boolean;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const focus = useSheetFocus();
  return (
    <View
      className={`h-11 flex-row items-center gap-2 rounded-xl px-3.5 ${fill === "group" ? "bg-glass-group" : "bg-glass-plate"}`}
    >
      <Icon name="search" size={18} colour={p["ink-muted"]} />
      <TextInput
        {...focus}
        value={query}
        onChangeText={onChange}
        placeholder={placeholder ?? t`Search`}
        placeholderTextColor={p["ink-muted"]}
        accessibilityLabel={t`Search ${label}`}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        clearButtonMode="while-editing"
        returnKeyType="done"
        submitBehavior={stay ? "submit" : "blurAndSubmit"}
        onSubmitEditing={onSubmit}
        selectionColor={p.ink}
        className="flex-1 font-sans text-ink"
        style={{ fontSize: 17 }}
        maxFontSizeMultiplier={inputCap(17)}
      />
      <ClearText value={query} onClear={() => onChange("")} />
    </View>
  );
}

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
  const { t } = useLingui();
  const { height } = useWindowDimensions();
  const { query, setQuery, searching, shown } = useSearched(options);
  const menu = useMenuSheet(
    () => {
      setQuery("");
      onClosed?.();
    },
    open === undefined ? undefined : { open, onOpenChange },
  );
  const chosen = options.find((o) => o.value === value)?.label ?? "";
  const searched = options.length > SEARCHED_PAST;
  const rows = (
    <SheetGroup>
      {shown.map((o, i) => (
        <SheetRow
          key={o.value}
          label={o.label}
          detail={o.detail}
          chosen={o.value === value}
          active={searching && i === 0}
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
            <SearchField
              label={label}
              query={query}
              onChange={setQuery}
              onSubmit={() => {
                const first = shown[0];
                if (first) menu.choose(() => first.value !== value && onChange(first.value));
              }}
            />
            <ScrollView
              style={{ height: height * 0.55 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {shown.length > 0 ? (
                rows
              ) : (
                <Text className="px-4 py-3 text-md text-ink-muted">{t`No matches`}</Text>
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
      <Text className="flex-1 text-md text-ink" numberOfLines={1}>
        {children}
      </Text>
      <Icon name="down" size={18} colour={p["ink-muted"]} />
    </View>
  );
}
