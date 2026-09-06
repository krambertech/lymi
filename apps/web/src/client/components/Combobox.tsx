import { clsx } from "clsx";
import { Check, ChevronDown, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { controlBase, controlSize, useControlProps } from "./Field";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line, for the thing that tells two similar options apart. */
  hint?: string | undefined;
}

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  /** The row that clears the value, e.g. "No language". Omit to make a choice required. */
  clearLabel?: string | undefined;
  /** Shown on the trigger when nothing is chosen. */
  placeholder?: string | undefined;
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

/**
 * A list too long to read is a list you search. Closed, it is the same box as every other
 * control; open, the box becomes the search field and the list unrolls underneath it.
 *
 * The list is in the normal flow rather than floating. A floating layer would have to escape
 * the sheet's scroll, and inside the phone's drawer it cannot: vaul translates the drawer to
 * drag it, which makes it the containing block for anything fixed. In the flow there is
 * nothing to escape, on either shape, and the panel simply grows.
 */
export function Combobox({
  value,
  onChange,
  options,
  clearLabel,
  placeholder = "Choose one",
  searchLabel = "Search",
  accept,
  acceptLabel = (v) => `Use “${v}”`,
  emptyLabel = "Nothing matches",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = useId();
  const a11y = useControlProps({});

  const needle = query.trim().toLowerCase();
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

  const chosen = options.find((o) => o.value === value);
  const label = chosen?.label ?? value ?? clearLabel ?? placeholder;

  useEffect(() => {
    setActive(0);
  }, []);

  // Keep the active row in view while the arrows walk the list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const start = (seed: string) => {
    setQuery(seed);
    setActive(0);
    setOpen(true);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    setQuery("");
    if (focusTrigger) requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const pick = (row: ComboboxOption | undefined) => {
    if (!row) return;
    onChange(row.value === "" ? null : row.value);
    close();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(rows.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(rows[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        {...a11y}
        aria-haspopup="listbox"
        aria-expanded={false}
        className={clsx(
          controlBase,
          controlSize,
          "flex items-center gap-2 pl-3.5 pr-3 text-left",
          !chosen && !value && !clearLabel && "text-muted",
        )}
        onClick={() => start("")}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            start("");
          } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            start(e.key);
          }
        }}
      >
        <span className="flex-1 truncate">{label}</span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="grid gap-1.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          // biome-ignore lint/a11y/noAutofocus: the box the learner just pressed becomes this field
          autoFocus
          {...a11y}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={rows[active] ? `${optionId}-${active}` : undefined}
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
          onBlur={(e) => {
            if (!e.currentTarget.closest("div")?.contains(e.relatedTarget)) close(false);
          }}
          className={clsx(controlBase, controlSize, "pl-10 pr-3.5")}
        />
      </div>
      {/* The APG combobox: the input keeps focus and names the active row with
          aria-activedescendant, so the options are deliberately not in the tab order. */}
      <ul
        ref={listRef}
        id={listId}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a listbox is a list
        role="listbox"
        aria-label={searchLabel}
        className="edge max-h-56 overflow-y-auto overscroll-contain rounded-md bg-plate p-1"
      >
        {rows.map((row, i) => {
          const on = (row.value || null) === value;
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input owns the keyboard
            // biome-ignore lint/a11y/useFocusableInteractive: aria-activedescendant, so focus stays on the input
            <li
              key={row.value || "none"}
              id={`${optionId}-${i}`}
              // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: an option is a list item
              role="option"
              aria-selected={on}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(row)}
              onMouseMove={() => setActive(i)}
              className={clsx(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-[16px] md:text-base",
                i === active ? "bg-hover text-text" : "text-text-2",
              )}
            >
              <span className="flex-1 truncate">{row.label}</span>
              {row.hint && <span className="shrink-0 text-xs text-muted">{row.hint}</span>}
              {on && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </li>
          );
        })}
        {rows.length === 0 && <li className="px-2.5 py-2 text-base text-muted">{emptyLabel}</li>}
      </ul>
    </div>
  );
}
