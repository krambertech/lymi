import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useFluidHover } from "../lib/fluid-hover";
import { controlBase, controlSize, useControlProps } from "./Field";
import { FluidHighlight } from "./FluidHighlight";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line, for the thing that tells two similar options apart. */
  hint?: string | undefined;
}

interface BaseProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  /** The row that clears the value, e.g. "No language". Omit to make a choice required. */
  clearLabel?: string | undefined;
  /** Shown on the trigger when nothing is chosen. */
  placeholder?: string | undefined;
}

interface ComboboxProps extends BaseProps {
  /** What the search field asks for. */
  searchLabel?: string | undefined;
  /**
   * Lets the search double as an entry field: a query that matches nothing but passes this
   * becomes the last row, so a value the list has never heard of is one Enter away.
   */
  accept?: ((query: string) => string | null) | undefined;
  acceptLabel?: ((value: string) => string) | undefined;
  emptyLabel?: string | undefined;
}

interface SelectProps extends BaseProps {
  /** Accessible name for the list. Falls back to the Field's label. */
  label?: string | undefined;
}

/**
 * A list too long to read is a list you search. The box stays a button; the panel that
 * opens under it starts with the search field, and the names filter as you type.
 */
export function Combobox(props: ComboboxProps) {
  return <Picker mode="search" {...props} />;
}

/**
 * A short list you pick from. The same box and the same panel as Combobox, without the
 * search: the arrows walk the rows and typing a letter jumps to a name.
 */
export function Select(props: SelectProps) {
  return <Picker mode="select" {...props} />;
}

type PickerProps = { mode: "search" | "select" } & ComboboxProps & SelectProps;

/** Room the panel keeps from the box and from the edge of the viewport. */
const GAP = 6;
const MARGIN = 8;
const MAX_HEIGHT = 352;

/*
 * The panel is a popover, so it lives in the top layer: it floats over the form instead of
 * pushing it down, and it escapes every ancestor, including the phone's drawer, which vaul
 * translates to drag and which would otherwise pin anything fixed inside it.
 */
function Picker({
  mode,
  value,
  onChange,
  options,
  clearLabel,
  placeholder: placeholderProp,
  searchLabel: searchLabelProp,
  label,
  accept,
  acceptLabel: acceptLabelProp,
  emptyLabel: emptyLabelProp,
}: PickerProps) {
  const { t } = useLingui();
  const placeholder = placeholderProp ?? t`Choose one`;
  const searchLabel = searchLabelProp ?? t`Search`;
  const acceptLabel = acceptLabelProp ?? ((v: string) => t`Use “${v}”`);
  const emptyLabel = emptyLabelProp ?? t`Nothing matches`;
  const [open, setOpen] = useState(false);
  // The panel's contents stay through its exit transition, then leave the tree.
  const [shown, setShown] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<CSSProperties>({});
  const [flipped, setFlipped] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const viaKeyboard = useRef(false);
  const listId = useId();
  const optionId = useId();
  const a11y = useControlProps({});
  const listLabel = label ?? searchLabel;

  const needle = mode === "search" ? query.trim().toLowerCase() : "";
  const matches = needle
    ? options.filter(
        (o) => o.label.toLowerCase().includes(needle) || o.value.toLowerCase().includes(needle),
      )
    : options;
  const custom = accept && needle && matches.length === 0 ? accept(query.trim()) : null;
  const rows: ComboboxOption[] = [
    ...(clearLabel && !needle ? [{ value: "", label: clearLabel }] : []),
    ...matches,
    ...(custom ? [{ value: custom, label: acceptLabel(custom) }] : []),
  ];
  const rowsKey = rows.map((r) => r.value).join("\0");

  const chosen = options.find((o) => o.value === value);
  const triggerLabel = chosen?.label ?? value ?? clearLabel ?? placeholder;
  const empty = !chosen && !value && !clearLabel;

  // The pointer's row becomes the active row, so Enter picks what the pointer is on.
  const hover = useFluidHover(listRef, { items: '[role="option"]' });
  const { activeIndex: pointerIndex, hide, remeasure } = hover;
  useEffect(() => {
    if (pointerIndex !== null) setActive(pointerIndex);
  }, [pointerIndex]);
  // Rows changed under a still pointer: the fill would be on the wrong row, so it goes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowsKey stands in for rows
  useLayoutEffect(() => {
    hide();
    remeasure();
  }, [rowsKey, hide, remeasure]);

  // Under the box when there is room, above it when there is more room there.
  const place = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    if (!t) return;
    const viewport = window.visualViewport;
    const height = viewport?.height ?? window.innerHeight;
    const top = viewport?.offsetTop ?? 0;
    const below = height + top - t.bottom - GAP - MARGIN;
    const above = t.top - top - GAP - MARGIN;
    const search = searchRef.current?.parentElement?.offsetHeight ?? 0;
    const need = Math.min(MAX_HEIGHT, (listRef.current?.scrollHeight ?? MAX_HEIGHT) + search + 2);
    const flip = below < need && above > below;
    setFlipped(flip);
    setPlacement({
      left: t.left,
      width: t.width,
      maxHeight: Math.max(120, Math.min(MAX_HEIGHT, flip ? above : below)),
      ...(flip ? { bottom: height + top - t.top + GAP } : { top: t.bottom + GAP }),
    });
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (open) {
      place();
      if (!panel.matches(":popover-open")) panel.showPopover();
    } else if (panel.matches(":popover-open")) {
      panel.hidePopover();
    }
  }, [open, place]);

  // The contents arrive a render after the panel, so place and focus once they are there.
  useLayoutEffect(() => {
    if (!open || !shown) return;
    place();
    if (mode === "search") searchRef.current?.focus();
  }, [open, shown, mode, place]);

  useEffect(() => {
    if (open) {
      setShown(true);
      return;
    }
    const t = window.setTimeout(() => setShown(false), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open, place]);

  // Keep the active row in view while the arrows walk the list. Only the arrows: scrolling
  // a half-hidden row under a still pointer would move the list, then the pointer's row.
  useEffect(() => {
    if (!open || !viaKeyboard.current) return;
    viaKeyboard.current = false;
    listRef.current
      ?.querySelectorAll('[role="option"]')
      [active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const chosenRow = rows.findIndex((r) => (r.value || null) === value);
  const moveTo = (i: number) => {
    viaKeyboard.current = true;
    hide();
    setActive(i);
  };
  const jumpTo = (key: string) => {
    const now = Date.now();
    const text = (now - typed.current.at < 600 ? typed.current.text : "") + key.toLowerCase();
    typed.current = { text, at: now };
    const from = text.length === 1 ? active + 1 : active;
    const order = [...rows.keys()].map((i) => (i + from) % rows.length);
    const hit = order.find((i) => rows[i]?.label.toLowerCase().startsWith(text));
    if (hit !== undefined) moveTo(hit);
  };
  const start = (seed: string) => {
    // The list opens on the chosen row, so Enter keeps it and a long list scrolls to it.
    viaKeyboard.current = true;
    setQuery(mode === "search" ? seed : "");
    setActive(seed ? 0 : Math.max(chosenRow, 0));
    setOpen(true);
    if (mode === "select" && seed) jumpTo(seed);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    hide();
    if (focusTrigger) triggerRef.current?.focus();
  };
  const pick = (row: ComboboxOption | undefined) => {
    if (!row) return;
    onChange(row.value === "" ? null : row.value);
    close();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(Math.min(active + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(Math.max(active - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      moveTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveTo(rows.length - 1);
    } else if (e.key === "Enter" || (mode === "select" && e.key === " ")) {
      e.preventDefault();
      pick(rows[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (mode === "select" && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      jumpTo(e.key);
    }
  };
  const onBlur = (e: FocusEvent) => {
    if (open && !rootRef.current?.contains(e.relatedTarget)) close(false);
  };

  const activeId = rows[active] ? `${optionId}-${active}` : undefined;
  const selectOpen = mode === "select" && open;

  return (
    <div ref={rootRef} className="relative">
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: a select-only combobox, per the APG pattern, is a button with role="combobox" */}
      <button
        ref={triggerRef}
        type="button"
        {...a11y}
        role={mode === "select" ? "combobox" : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={selectOpen ? activeId : undefined}
        className={clsx(
          controlBase,
          controlSize,
          "flex items-center gap-2 ps-3.5 pe-3 text-start",
          open && "edge-2",
          empty && "text-muted",
        )}
        onClick={() => (open ? close() : start(""))}
        onKeyDown={(e) => {
          if (open) return onKey(e);
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            start("");
          } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            start(e.key);
          }
        }}
        onBlur={selectOpen ? onBlur : undefined}
      >
        <span className="flex-1 truncate">{triggerLabel}</span>
        <ChevronDown
          className={clsx(
            "size-4 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        ref={panelRef}
        popover="manual"
        data-flipped={flipped || undefined}
        className="picker-panel edge-2 flex flex-col overflow-hidden rounded-md bg-plate"
        style={placement}
      >
        {shown && mode === "search" && (
          <div className="flex shrink-0 items-center gap-2.5 border-b border-edge ps-3.5 pe-3.5">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              ref={searchRef}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-label={searchLabel}
              value={query}
              placeholder={searchLabel}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKey}
              onBlur={onBlur}
              className={clsx(
                controlSize,
                "min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted",
              )}
            />
          </div>
        )}
        {/* The APG combobox: the trigger or the search keeps focus and names the active row
            with aria-activedescendant, so the options are deliberately not in the tab order. */}
        <ul
          ref={listRef}
          id={listId}
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a listbox is a list
          role="listbox"
          aria-label={listLabel}
          {...hover.handlers}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
        >
          <FluidHighlight hover={hover} />
          {shown &&
            rows.map((row, i) => {
              const on = (row.value || null) === value;
              const current = i === active;
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: the trigger owns the keyboard
                // biome-ignore lint/a11y/useFocusableInteractive: aria-activedescendant, so focus stays on the trigger
                <li
                  key={row.value || "none"}
                  id={`${optionId}-${i}`}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: an option is a list item
                  role="option"
                  aria-selected={on}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row)}
                  className={clsx(
                    "relative flex h-11 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-[16px] md:h-10 md:text-base",
                    current ? "text-text" : "text-text-2",
                    current && !hover.shown && "bg-hover",
                  )}
                >
                  {/* The check leads, in a slot every row keeps, so choosing one moves nothing. */}
                  <span
                    className="flex size-4 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    {on && <Check className="size-4" />}
                  </span>
                  <span className="flex-1 truncate">{row.label}</span>
                  {row.hint && <span className="shrink-0 text-xs text-muted">{row.hint}</span>}
                </li>
              );
            })}
          {shown && rows.length === 0 && (
            <li className="flex h-11 items-center ps-8.5 pe-2.5 text-base text-muted md:h-10">
              {emptyLabel}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
