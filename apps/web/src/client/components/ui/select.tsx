import { Select as SelectPrimitive } from "@base-ui/react/select";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { useOverlayShape } from "../../lib/device";
import { useFluidHover } from "../../lib/fluid-hover";
import { FluidHighlight } from "../FluidHighlight";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "./drawer";
import { useField, useFieldControl } from "./field";
import { controlBase, controlSize } from "./input";

/*
 * shadcn's Select, in the shape of the machine: a list anchored under its box on a desktop, the
 * same rows in a drawer under the thumb on a touch device. Every part below renders both shapes,
 * so a call site never asks which machine it is on. Scroll arrows are left out until a list needs
 * them: each part must bring its drawer shape and its tests with it. ADR 0017.
 */

type Shape = "desktop" | "touch";
type Value = string | null;

interface SelectItemData {
  value: Value;
  label: string;
}

interface SelectContextValue {
  shape: Shape;
  open: boolean;
  value: Value;
  setValue: (value: Value) => void;
  setOpen: (open: boolean) => void;
  /** Names each value, so the closed box can show the choice in both shapes. */
  items: readonly SelectItemData[] | undefined;
  disabled: boolean;
  required: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect(part: string) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error(`${part} must be used within a Select.`);
  return context;
}

const OPTION = '[role="option"]';
const ENABLED_OPTION = `${OPTION}:not([aria-disabled="true"])`;

const itemClassName =
  "relative flex h-11 w-full cursor-default items-center gap-2 rounded-sm px-2.5 text-start text-[1rem] text-text-2 outline-none select-none md:h-10 md:text-base data-selected:text-text data-highlighted:bg-hover data-highlighted:text-text data-disabled:opacity-45 [[data-hovering]_&]:data-highlighted:bg-transparent [&_svg]:pointer-events-none [&_svg]:shrink-0";

/** Pressed feedback for a row under a finger, where there is no hover. */
const touchItemClassName = "active:bg-hover";

interface SelectProps {
  value?: Value | undefined;
  defaultValue?: Value | undefined;
  onValueChange?: ((value: Value) => void) | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Every choice with its label. `SelectValue` reads the chosen label from here. */
  items?: readonly SelectItemData[] | undefined;
  /** Identifies the field when a form is submitted. */
  name?: string | undefined;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  children: React.ReactNode;
}

function Select({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  items,
  name,
  disabled: disabledProp = false,
  required = false,
  children,
}: SelectProps) {
  const field = useField();
  const disabled = disabledProp || Boolean(field?.disabled);
  const [uncontrolledValue, setUncontrolledValue] = React.useState<Value>(defaultValue);
  const value = controlledValue === undefined ? uncontrolledValue : controlledValue;
  const setValue = React.useCallback(
    (next: Value) => {
      setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
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
  const context = React.useMemo(
    () => ({ shape, open, value, setValue, setOpen, items, disabled, required }),
    [shape, open, value, setValue, setOpen, items, disabled, required],
  );
  return (
    <SelectContext.Provider value={context}>
      {shape === "desktop" ? (
        // Not modal: the page keeps its scrollbar, so nothing under the list shifts as it opens.
        <SelectPrimitive.Root<Value>
          data-slot="select"
          value={value}
          onValueChange={(next) => setValue(next)}
          open={open}
          onOpenChange={(next) => setOpen(next)}
          items={items}
          name={name}
          disabled={disabled}
          required={required}
          modal={false}
          highlightItemOnHover={false}
        >
          {children}
        </SelectPrimitive.Root>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          {children}
          {name && <input type="hidden" name={name} value={value ?? ""} />}
        </Drawer>
      )}
    </SelectContext.Provider>
  );
}

interface TriggerProps {
  id?: string | undefined;
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

/** The box. Put a `SelectValue` inside; the chevron is already there. */
function SelectTrigger({ className, children, ...props }: TriggerProps) {
  const { shape, open, value, disabled, required } = useSelect("SelectTrigger");
  const a11y = useFieldControl(props);
  const classes = cn(
    controlBase,
    controlSize,
    "flex items-center gap-2 ps-3.5 pe-3 text-start select-none data-open:not-aria-invalid:edge-2 data-placeholder:text-muted",
    className,
  );
  const chevron = (
    <ChevronDown
      className="size-4 shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none [[data-open]>&]:rotate-180"
      aria-hidden="true"
    />
  );
  if (shape === "desktop") {
    return (
      <SelectPrimitive.Trigger data-slot="select-trigger" {...a11y} className={classes}>
        {children}
        {chevron}
      </SelectPrimitive.Trigger>
    );
  }
  return (
    <DrawerTrigger
      data-slot="select-trigger"
      {...a11y}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-required={required || undefined}
      data-open={open || undefined}
      data-placeholder={value === null || undefined}
      disabled={disabled}
      className={classes}
    >
      {children}
      {chevron}
    </DrawerTrigger>
  );
}

interface ValueProps {
  /** Shown when nothing is chosen. */
  placeholder?: React.ReactNode | undefined;
  className?: string | undefined;
  /** Renders the chosen value yourself; by default its label comes from `items`. */
  children?: React.ReactNode | ((value: Value) => React.ReactNode) | undefined;
}

function SelectValue({ placeholder, className, children }: ValueProps) {
  const { shape, value, items } = useSelect("SelectValue");
  const classes = cn("flex-1 truncate", className);
  if (shape === "desktop") {
    return (
      <SelectPrimitive.Value data-slot="select-value" className={classes} placeholder={placeholder}>
        {children}
      </SelectPrimitive.Value>
    );
  }
  const label =
    typeof children === "function"
      ? children(value)
      : value === null
        ? placeholder
        : (children ?? items?.find((item) => item.value === value)?.label ?? value);
  return (
    <span data-slot="select-value" className={classes}>
      {label}
    </span>
  );
}

interface ContentProps {
  /** Names the list for screen readers in both shapes. */
  "aria-label": string;
  side?: "top" | "bottom" | undefined;
  align?: "start" | "center" | "end" | undefined;
  sideOffset?: number | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

function SelectContent(props: ContentProps) {
  const { shape } = useSelect("SelectContent");
  return shape === "desktop" ? <AnchoredContent {...props} /> : <DrawerListContent {...props} />;
}

function AnchoredContent({
  "aria-label": label,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  children,
}: ContentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const hover = useFluidHover(ref, { items: OPTION, dividers: '[data-slot="select-separator"]' });
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="isolate z-(--z-popup) outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
        // Under the box, the way the form reads, rather than the chosen row over it.
        alignItemWithTrigger={false}
      >
        <SelectPrimitive.Popup
          ref={ref}
          data-slot="select-content"
          // While the pointer's fill is out, the highlighted row gives up its own: one cursor at a time.
          data-hovering={hover.shown || undefined}
          className={cn(
            // Unfolds from the edge nearest the box, 4 px and scale 0.98 over 140 ms, leaving in 100.
            "edge-2 relative max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-md bg-plate p-1 text-text outline-none transition-[opacity,translate,scale] duration-140 ease-(--ease-out) data-starting-style:scale-98 data-starting-style:opacity-0 data-ending-style:scale-98 data-ending-style:opacity-0 data-ending-style:duration-100 data-[side=bottom]:data-starting-style:-translate-y-1 data-[side=bottom]:data-ending-style:-translate-y-1 data-[side=top]:data-starting-style:translate-y-1 data-[side=top]:data-ending-style:translate-y-1 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:scale-100",
            className,
          )}
          // Keyboard moves the highlight, and the highlight carries its own fill; two fills would be two cursors.
          onKeyDown={hover.hide}
          {...hover.handlers}
        >
          <FluidHighlight hover={hover} />
          <SelectPrimitive.List aria-label={label}>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/**
 * The rows in a drawer, with the anchored list's keyboard model for a touch device with a keyboard
 * attached: rows are out of the tab order, the arrows walk them, disabled rows included so a screen
 * reader still hears them, typing a letter jumps to a name, and Tab leaves the list, which closes it.
 */
function DrawerListContent({ "aria-label": label, className, children }: ContentProps) {
  const { setOpen } = useSelect("SelectContent");
  const ref = React.useRef<HTMLDivElement>(null);
  const typed = React.useRef({ text: "", at: 0 });
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      const rows = Array.from(ref.current?.querySelectorAll<HTMLElement>(OPTION) ?? []);
      if (rows.length === 0) return;
      const i = rows.indexOf(document.activeElement as HTMLElement);
      let to: HTMLElement | undefined;
      if (e.key === "ArrowDown") to = rows[Math.min(i + 1, rows.length - 1)];
      else if (e.key === "ArrowUp") to = rows[Math.max(i - 1, 0)];
      else if (e.key === "Home") to = rows[0];
      else if (e.key === "End") to = rows.at(-1);
      else if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Letters typed within 600 ms of each other spell one name; a single letter walks the matches.
        const now = Date.now();
        const text = (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase();
        typed.current = { text, at: now };
        const from = text.length === 1 ? i + 1 : Math.max(i, 0);
        const order = rows.map((_, k) => rows[(k + from) % rows.length] as HTMLElement);
        to = order.find((row) => row.textContent?.trim().toLowerCase().startsWith(text));
      }
      if (to) {
        e.preventDefault();
        to.focus();
      }
    },
    [setOpen],
  );
  return (
    <DrawerContent
      // Through the drawer rather than an effect, so it still knows the box to hand focus back to.
      initialFocus={() =>
        ref.current?.querySelector<HTMLElement>(`${ENABLED_OPTION}[aria-selected="true"]`) ??
        ref.current?.querySelector<HTMLElement>(ENABLED_OPTION) ??
        true
      }
    >
      {/* The box's label, so the sheet still says what is being chosen once it covers the form. */}
      <DrawerHeader className="ps-4.5 pt-1">
        <DrawerTitle className="text-sm font-medium text-text-2">{label}</DrawerTitle>
      </DrawerHeader>
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        data-slot="select-content"
        onKeyDown={onKeyDown}
        className={cn("grid p-2 pt-1", className)}
      >
        {children}
      </div>
    </DrawerContent>
  );
}

const GroupLabelContext = React.createContext<string | undefined>(undefined);

function SelectGroup({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  const { shape } = useSelect("SelectGroup");
  const labelId = React.useId();
  if (shape === "desktop") {
    return (
      <SelectPrimitive.Group data-slot="select-group" className={className}>
        {children}
      </SelectPrimitive.Group>
    );
  }
  return (
    <GroupLabelContext.Provider value={labelId}>
      {/* biome-ignore lint/a11y/useSemanticElements: a group of options, which a fieldset is not */}
      <div role="group" aria-labelledby={labelId} data-slot="select-group" className={className}>
        {children}
      </div>
    </GroupLabelContext.Provider>
  );
}

function SelectLabel({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  const { shape } = useSelect("SelectLabel");
  const labelId = React.useContext(GroupLabelContext);
  const classes = cn("px-2.5 py-1.5 text-xs text-muted", className);
  return shape === "desktop" ? (
    <SelectPrimitive.GroupLabel data-slot="select-label" className={classes}>
      {children}
    </SelectPrimitive.GroupLabel>
  ) : (
    <div id={labelId} data-slot="select-label" className={classes}>
      {children}
    </div>
  );
}

interface ItemProps {
  /** `null` is the row that clears the choice, e.g. "No language". */
  value: Value;
  disabled?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

/** The check leads, in a slot every row keeps, so choosing one moves nothing. */
function SelectItem(props: ItemProps) {
  const { shape } = useSelect("SelectItem");
  if (shape === "touch") return <DrawerListItem {...props} />;
  const { value, disabled, className, children } = props;
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      value={value}
      disabled={disabled}
      className={cn(itemClassName, className)}
    >
      <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="flex-1 truncate">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function DrawerListItem({ value, disabled, className, children }: ItemProps) {
  const { value: current, setValue, setOpen } = useSelect("SelectItem");
  const selected = current === value;
  return useRender({
    defaultTagName: "button",
    props: {
      type: "button",
      role: "option",
      tabIndex: -1,
      "aria-selected": selected,
      "aria-disabled": disabled || undefined,
      "data-slot": "select-item",
      "data-selected": selected ? "" : undefined,
      "data-disabled": disabled ? "" : undefined,
      className: cn(itemClassName, touchItemClassName, className),
      onClick: () => {
        if (disabled) return;
        if (!selected) setValue(value);
        setOpen(false);
      },
      children: (
        <>
          <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
            {selected && <Check className="size-4" />}
          </span>
          <span className="flex-1 truncate">{children}</span>
        </>
      ),
    },
  });
}

function SelectSeparator({ className }: { className?: string | undefined }) {
  const { shape } = useSelect("SelectSeparator");
  return shape === "desktop" ? (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-edge", className)}
    />
  ) : (
    // Presentational, like Base UI's: a listbox has no separator role to offer.
    <div
      role="presentation"
      data-slot="select-separator"
      className={cn("mx-2.5 my-1 h-px bg-edge", className)}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
