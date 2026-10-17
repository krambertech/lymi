import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import * as React from "react";

/*
 * The shell both palettes draw with: ⌘K in the product and the developer palette on backtick.
 * Each brings its own rows and commands; the shell owns the frame, the field, the list's
 * keys and the row's shape, so the two never drift. Opened from the keyboard, it appears
 * without motion (motion.md).
 */

export type PaletteSkin = "product" | "dev";

const SkinContext = React.createContext<PaletteSkin>("product");

interface PaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The dialog's accessible name. */
  label: string;
  /** The product's own room, or the developer palette's graphite one. */
  skin?: PaletteSkin | undefined;
  children: React.ReactNode;
}

function CommandPalette({ open, onOpenChange, label, skin = "product", children }: PaletteProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-(--z-backdrop) bg-scrim" />
        <DialogPrimitive.Popup
          aria-label={label}
          data-slot="command-palette"
          className={cn(
            "fixed inset-x-0 top-[12vh] z-(--z-sheet) mx-auto flex max-h-[min(560px,76dvh)] w-[min(620px,calc(100vw-32px))] flex-col overflow-hidden rounded-xl bg-plate text-text edge-2 shadow-[0_24px_64px_-16px_var(--scrim)] outline-none",
            skin === "dev" && "dev-skin rounded-lg",
          )}
        >
          <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface RunKeys {
  /** ⌘ on a Mac, Ctrl elsewhere: the palette's second action, such as adding on the spot. */
  mod: boolean;
}

interface ListOptions<T> {
  items: readonly T[];
  onRun: (item: T, keys: RunKeys) => void;
}

/**
 * The list's keys: arrows move one row and wrap, Enter runs it, ⌘Enter runs its second action.
 * Focus stays in the field the whole time; the highlighted row is its active descendant.
 */
function useCommandList<T>({ items, onRun }: ListOptions<T>) {
  const listId = React.useId();
  const [selected, setSelected] = React.useState(0);
  const active = items.length ? Math.min(selected, items.length - 1) : -1;
  const optionId = (i: number) => `${listId}-${i}`;
  const reset = React.useCallback(() => setSelected(0), []);

  // Only when the highlight moves or the rows change, so a wheel scroll is not pulled back.
  React.useEffect(() => {
    if (active >= 0 && items.length)
      document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, items, listId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // A Japanese or Chinese input method confirms its word with Enter; that Enter is not a run.
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setSelected((active + step + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const mod = e.metaKey || e.ctrlKey;
      const item = items[active];
      if (item !== undefined) onRun(item, { mod });
    }
  };

  return {
    active,
    /** Back to the first row, as the query changes. */
    reset,
    inputProps: {
      role: "combobox",
      "aria-expanded": true,
      "aria-controls": listId,
      "aria-autocomplete": "list" as const,
      "aria-activedescendant": active >= 0 ? optionId(active) : undefined,
      autoComplete: "off",
      spellCheck: false,
      onKeyDown,
    },
    listProps: { id: listId, role: "listbox" },
    optionProps: (i: number) => ({
      id: optionId(i),
      role: "option",
      "aria-selected": i === active,
      "data-active": i === active ? "" : undefined,
      tabIndex: -1,
      onPointerMove: () => {
        if (i !== active) setSelected(i);
      },
      // The field keeps focus, so typing carries on after a click.
      onPointerDown: (e: React.PointerEvent) => e.preventDefault(),
      onClick: (e: React.MouseEvent) => {
        const item = items[i];
        if (item !== undefined) onRun(item, { mod: e.metaKey || e.ctrlKey });
      },
    }),
  };
}

interface InputProps extends React.ComponentProps<"input"> {
  /** What leads the field: a search glass in the product, a prompt in the developer palette. */
  lead: React.ReactNode;
  /** What closes the line, such as a key hint. */
  trail?: React.ReactNode;
}

function CommandInput({ lead, trail, className, ...props }: InputProps) {
  const skin = React.useContext(SkinContext);
  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-edge px-4">
      <span aria-hidden="true" className="flex shrink-0 text-muted">
        {lead}
      </span>
      <input
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-text caret-amber outline-none placeholder:text-muted",
          skin === "dev" ? "font-mono text-base md:text-sm" : "text-lg",
          className,
        )}
        {...props}
      />
      {trail}
    </div>
  );
}

interface ListProps extends React.ComponentProps<"div"> {
  /** A row held under the list rather than scrolled with it, such as adding the typed term. */
  pinned?: React.ReactNode;
}

/** Spread `listProps` on it. Holds the scrolling rows and any pinned row, all in one listbox. */
function CommandList({ pinned, className, children, ...props }: ListProps) {
  // With nothing to scroll, its padding would leave a blank strip above a pinned row.
  const rows = React.Children.toArray(children);
  return (
    <div className="flex min-h-0 flex-1 flex-col" {...props}>
      {rows.length > 0 && (
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]",
            className,
          )}
        >
          {rows}
        </div>
      )}
      {pinned}
    </div>
  );
}

function CommandGroup({
  label,
  children,
}: {
  /** Left out for a group that needs no heading. */
  label?: React.ReactNode;
  children: React.ReactNode;
}) {
  const skin = React.useContext(SkinContext);
  const id = React.useId();
  return (
    // biome-ignore lint/a11y/useSemanticElements: options grouped inside a listbox; a fieldset groups form controls.
    <div role="group" aria-labelledby={label ? id : undefined} className="not-first:mt-1.5">
      {label && (
        <p
          id={id}
          className={cn(
            "px-2.5 pt-1.5 pb-1 text-muted",
            skin === "dev" ? "font-mono text-2xs tracking-wider uppercase" : "text-xs font-medium",
          )}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

/** A row. Spread `optionProps(i)` on it; the active one takes the hover fill. */
function CommandItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-10 cursor-default items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-base text-text select-none data-active:bg-hover [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("px-2.5 py-6 text-center text-base text-muted", className)} {...props} />;
}

/** Key hints and status under the list. */
function CommandFooter({ className, ...props }: React.ComponentProps<"div">) {
  const skin = React.useContext(SkinContext);
  return (
    <div
      className={cn(
        "flex min-h-10 shrink-0 items-center gap-4 border-t border-edge px-4 py-2 text-sm text-muted",
        skin === "dev" && "font-mono text-xs",
        className,
      )}
      {...props}
    />
  );
}

export {
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPalette,
  useCommandList,
};
