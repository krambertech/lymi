import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import type { BaseUIEvent } from "@base-ui/react/types";
import { cn } from "cn";
import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { useOverlayShape } from "../../lib/device";
import { useFluidHover } from "../../lib/fluid-hover";
import { FluidHighlight } from "../FluidHighlight";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerVirtualKeyboardProvider,
} from "./drawer";
import { useField, useFieldControl } from "./field";
import { controlBase, controlSize } from "./input";

// shadcn's Combobox in the machine's shape: a panel under the box on a desktop, a drawer on touch. ADR 0017.

type Shape = "desktop" | "touch";

interface ComboboxContextValue {
  shape: Shape;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  trigger: React.RefObject<HTMLButtonElement | null>;
  input: React.RefObject<HTMLInputElement | null>;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useCombobox(part: string) {
  const context = React.useContext(ComboboxContext);
  if (!context) throw new Error(`${part} must be used within a Combobox.`);
  return context;
}

const OPTION = '[role="option"]';

type ComboboxProps<Value, Multiple extends boolean | undefined, Item> = Omit<
  ComboboxPrimitive.Root.Props<Value, Multiple, Item>,
  "onOpenChange" | "inline"
> & {
  onOpenChange?: ((open: boolean) => void) | undefined;
};

// The pointer's fill is its own, so Enter takes the keyboard's row, never the one a resting pointer is on.
function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  onOpenChangeComplete,
  disabled: disabledProp = false,
  children,
  ...props
}: ComboboxProps<Value, Multiple, Item>) {
  const field = useField();
  const disabled = disabledProp || Boolean(field?.disabled);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const shape = useOverlayShape(open);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const context = React.useMemo(
    () => ({ shape, open, setOpen, disabled, trigger, input }),
    [shape, open, setOpen, disabled],
  );
  return (
    <ComboboxContext.Provider value={context}>
      {/* On touch the list is inline in the drawer, and the drawer's open state is the list's. */}
      <ComboboxPrimitive.Root<Value, Multiple, Item>
        autoHighlight
        highlightItemOnHover={false}
        {...props}
        disabled={disabled}
        open={open}
        onOpenChange={(next) => setOpen(next)}
        onOpenChangeComplete={shape === "desktop" ? onOpenChangeComplete : undefined}
        inline={shape === "touch"}
      >
        {shape === "desktop" ? (
          children
        ) : (
          <Drawer
            open={open}
            onOpenChange={(next) => setOpen(next)}
            onOpenChangeComplete={onOpenChangeComplete}
            showSwipeHandle
          >
            <DrawerVirtualKeyboardProvider>{children}</DrawerVirtualKeyboardProvider>
          </Drawer>
        )}
      </ComboboxPrimitive.Root>
    </ComboboxContext.Provider>
  );
}

interface TriggerProps {
  id?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

const setInputValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

/** The box. Put a `ComboboxValue` inside; the chevron is already there. */
function ComboboxTrigger({ className, children, ...props }: TriggerProps) {
  const { shape, open, setOpen, disabled, trigger, input } = useCombobox("ComboboxTrigger");
  const a11y = useFieldControl(props);
  const typed = React.useRef("");
  // A letter on the closed box opens it with that letter searched; letters typed before the field has focus are kept.
  const onKeyDown = (e: BaseUIEvent<React.KeyboardEvent<HTMLButtonElement>>) => {
    if (shape === "touch" && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key.length !== 1 || e.key === " " || e.metaKey || e.ctrlKey || e.altKey) return;
    // Base UI's own typeahead would choose the matching row without showing it.
    e.preventBaseUIHandler();
    e.preventDefault();
    const waiting = typed.current !== "";
    typed.current += e.key;
    if (waiting) return;
    setOpen(true);
    let frames = 0;
    let settled = 0;
    const hand = () => {
      const field = input.current;
      // Two frames after focus lands, so the list has put its highlight on the chosen row first.
      if (field && document.activeElement === field && ++settled > 2) {
        setInputValue?.call(field, typed.current + field.value);
        // As typing, so Base UI filters and highlights the first match rather than treating it as autofill.
        field.dispatchEvent(
          new InputEvent("input", { bubbles: true, inputType: "insertText", data: typed.current }),
        );
        typed.current = "";
      } else if (++frames < 60) {
        requestAnimationFrame(hand);
      } else {
        typed.current = "";
      }
    };
    requestAnimationFrame(hand);
  };
  const classes = cn(
    controlBase,
    controlSize,
    "flex items-center gap-2 ps-3.5 pe-3 text-start select-none data-popup-open:not-aria-invalid:edge-2",
    className,
  );
  const chevron = (
    <ChevronDown
      className="size-4 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none [[data-popup-open]>&]:rotate-180"
      aria-hidden="true"
    />
  );
  if (shape === "touch") {
    // The drawer's own trigger: Base UI's would toggle the list a second time on the same tap.
    return (
      <DrawerTrigger
        ref={trigger}
        data-slot="combobox-trigger"
        {...a11y}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-popup-open={open || undefined}
        disabled={disabled}
        onKeyDown={onKeyDown}
        className={classes}
      >
        {children}
        {chevron}
      </DrawerTrigger>
    );
  }
  return (
    <ComboboxPrimitive.Trigger
      ref={trigger}
      data-slot="combobox-trigger"
      {...a11y}
      onKeyDown={onKeyDown}
      className={classes}
    >
      {children}
      {chevron}
    </ComboboxPrimitive.Trigger>
  );
}

interface ValueProps {
  /** Shown when nothing is chosen. */
  placeholder?: React.ReactNode | undefined;
  className?: string | undefined;
  /** Renders the chosen value yourself; by default an item's `label` names it. */
  // biome-ignore lint/suspicious/noExplicitAny: Base UI types the selected value as any here
  children?: React.ReactNode | ((value: any) => React.ReactNode) | undefined;
}

function ComboboxValue({ placeholder, className, children }: ValueProps) {
  return (
    <span data-slot="combobox-value" className={cn("flex-1 truncate", className)}>
      <ComboboxPrimitive.Value
        placeholder={
          placeholder == null ? undefined : (
            <span data-placeholder="" className="text-muted">
              {placeholder}
            </span>
          )
        }
      >
        {children}
      </ComboboxPrimitive.Value>
    </span>
  );
}

interface ContentProps {
  /** Names the panel, and titles the drawer on touch, so it still says what is being chosen. */
  "aria-label": string;
  side?: "top" | "bottom" | undefined;
  align?: "start" | "center" | "end" | undefined;
  sideOffset?: number | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

/** The panel. Holds a `ComboboxInput`, a `ComboboxEmpty` and a `ComboboxList`, in that order. */
function ComboboxContent(props: ContentProps) {
  const { shape } = useCombobox("ComboboxContent");
  return shape === "desktop" ? <AnchoredContent {...props} /> : <DrawerSearchContent {...props} />;
}

function AnchoredContent({
  "aria-label": label,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  children,
}: ContentProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        className="isolate z-(--z-popup) outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          aria-label={label}
          className={cn(
            // Unfolds from the edge nearest the box, 4 px and scale 0.98 over 140 ms, leaving in 100.
            "edge-2 flex max-h-[min(22rem,var(--available-height))] w-(--anchor-width) min-w-56 origin-(--transform-origin) flex-col overflow-hidden rounded-md bg-plate text-text outline-none transition-[opacity,translate,scale] duration-140 ease-(--ease-out) data-starting-style:scale-98 data-starting-style:opacity-0 data-ending-style:scale-98 data-ending-style:opacity-0 data-ending-style:duration-100 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=bottom]:data-ending-style:-translate-y-1 data-[side=top]:data-starting-style:translate-y-1 data-[side=top]:data-ending-style:translate-y-1 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100",
            className,
          )}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function tabNeighbour(from: HTMLElement, backwards: boolean, skip: Element | null) {
  const all = [
    ...document.querySelectorAll<HTMLElement>(
      "a[href], button, input, select, textarea, [tabindex]",
    ),
  ].filter(
    (el) =>
      el === from ||
      (el.tabIndex >= 0 &&
        !(el as HTMLButtonElement).disabled &&
        !el.hasAttribute("data-base-ui-focus-guard") &&
        !skip?.contains(el) &&
        el.getClientRects().length > 0),
  );
  const i = all.indexOf(from);
  return all[i + (backwards ? -1 : 1)] ?? from;
}

// One list height while it filters, so the drawer does not jump with every letter. Tab moves on, as from the panel.
function DrawerSearchContent({ "aria-label": label, className, children }: ContentProps) {
  const { input, trigger, setOpen } = useCombobox("ComboboxContent");
  const ref = React.useRef<HTMLDivElement>(null);
  const tabbed = React.useRef<"forward" | "back" | null>(null);
  return (
    <DrawerContent
      initialFocus={input}
      finalFocus={() => {
        const box = trigger.current;
        const direction = tabbed.current;
        tabbed.current = null;
        if (!direction || !box) return true;
        const popup = ref.current?.closest('[data-slot="drawer-popup"]') ?? null;
        return tabNeighbour(box, direction === "back", popup);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        e.preventDefault();
        tabbed.current = e.shiftKey ? "back" : "forward";
        setOpen(false);
      }}
    >
      <DrawerHeader className="ps-4.5 pt-1">
        <DrawerTitle className="text-sm font-medium text-text-2">{label}</DrawerTitle>
      </DrawerHeader>
      <div
        ref={ref}
        data-slot="combobox-content"
        className={cn("flex h-[min(24rem,60dvh)] flex-col px-2 pt-2", className)}
      >
        {children}
      </div>
    </DrawerContent>
  );
}

interface InputProps {
  /** Names the search field and fills it while it is empty. */
  placeholder: string;
  className?: string | undefined;
}

/** The search field at the top of the panel. It takes focus as the panel opens. */
function ComboboxInput({ placeholder, className }: InputProps) {
  const { shape, input } = useCombobox("ComboboxInput");
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 px-3.5",
        // In a drawer the field is a box of its own, since no panel edge frames it.
        shape === "desktop" ? "border-b border-edge" : "mx-1 mb-1 rounded-md edge",
      )}
    >
      <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <ComboboxPrimitive.Input
        ref={input}
        data-slot="combobox-input"
        onKeyDown={(e) => {
          // With no row to take, Enter keeps the search open with what was typed.
          if (e.key === "Enter" && !e.currentTarget.getAttribute("aria-activedescendant")) {
            e.preventBaseUIHandler();
            e.preventDefault();
          }
        }}
        aria-label={placeholder}
        placeholder={placeholder}
        autoCapitalize="none"
        spellCheck={false}
        className={cn(
          controlSize,
          "min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted",
          className,
        )}
      />
    </div>
  );
}

/** What the panel says when nothing matches. Stays mounted, so the change is announced. */
function ComboboxEmpty({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-3.5 py-3 text-base text-pretty text-muted empty:p-0", className)}
    >
      {children}
    </ComboboxPrimitive.Empty>
  );
}

interface ListProps<Item> {
  className?: string | undefined;
  /** A function of each filtered item, or the rows themselves. */
  children: React.ReactNode | ((item: Item, index: number) => React.ReactNode);
}

function ComboboxList<Item>({ className, children }: ListProps<Item>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const hover = useFluidHover(ref, { items: OPTION, dividers: '[data-slot="combobox-separator"]' });
  const { hide, remeasure } = hover;
  // Keys land in the search field beside the list, and each one moves or re-filters the rows under the pointer.
  React.useEffect(() => {
    const onKey = () => {
      hide();
      requestAnimationFrame(remeasure);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [hide, remeasure]);
  return (
    <ComboboxPrimitive.List
      ref={ref}
      data-slot="combobox-list"
      // While the pointer's fill is out, the highlighted row gives up its own: one cursor at a time.
      data-hovering={hover.shown || undefined}
      {...hover.handlers}
      className={cn(
        "relative min-h-0 flex-1 scroll-py-1 overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0",
        className,
      )}
      // Through `render`, because the list only maps a function child when it is the only child.
      render={(props) => (
        <div {...props}>
          <FluidHighlight hover={hover} />
          {props.children}
        </div>
      )}
    >
      {children}
    </ComboboxPrimitive.List>
  );
}

interface ItemProps {
  value: unknown;
  disabled?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

/** The check leads, in a slot every row keeps, so choosing one moves nothing. */
function ComboboxItem({ value, disabled, className, children }: ItemProps) {
  const { shape } = useCombobox("ComboboxItem");
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      value={value}
      disabled={disabled}
      className={cn(
        "relative flex h-11 w-full cursor-default items-center gap-2 rounded-sm px-2.5 text-start text-[1rem] text-text-2 outline-none select-none md:h-10 md:text-base data-selected:text-text data-highlighted:bg-hover data-highlighted:text-text data-disabled:opacity-45 [[data-hovering]_&]:data-highlighted:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0",
        // Pressed feedback for a row under a finger, where there is no hover.
        shape === "touch" && "active:bg-hover",
        className,
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
        <ComboboxPrimitive.ItemIndicator>
          <Check className="size-4" />
        </ComboboxPrimitive.ItemIndicator>
      </span>
      {children}
    </ComboboxPrimitive.Item>
  );
}

/** A second line of the row, at its end: the thing that tells two similar rows apart. */
function ComboboxItemHint({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <span data-slot="combobox-item-hint" className={cn("shrink-0 text-xs text-muted", className)}>
      {children}
    </span>
  );
}

function ComboboxGroup({
  items,
  className,
  children,
}: {
  /** The group's own rows, when the root's `items` are groups; render them with `ComboboxCollection`. */
  items?: readonly unknown[] | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <ComboboxPrimitive.Group data-slot="combobox-group" items={items} className={className}>
      {children}
    </ComboboxPrimitive.Group>
  );
}

/** A group's filtered rows, as a function of each item. */
function ComboboxCollection<Item>({
  children,
}: {
  children: (item: Item, index: number) => React.ReactNode;
}) {
  return <ComboboxPrimitive.Collection>{children}</ComboboxPrimitive.Collection>;
}

function ComboboxLabel({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-2.5 py-1.5 text-xs text-muted", className)}
    >
      {children}
    </ComboboxPrimitive.GroupLabel>
  );
}

function ComboboxSeparator({ className }: { className?: string | undefined }) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-edge", className)}
    />
  );
}

/** Base UI's collator match, for a caller that filters its own rows. */
const useComboboxFilter = ComboboxPrimitive.useFilter;

export {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemHint,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxFilter,
};
