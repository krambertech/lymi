import type { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { mergeProps } from "@base-ui/react/merge-props";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import { Check } from "lucide-react";
import * as React from "react";
import { useOverlayShape } from "../../lib/device";
import { useFluidHover } from "../../lib/fluid-hover";
import { useControllableState } from "../../lib/use-controllable-state";
import { useMergedRefs } from "../../lib/use-merged-refs";
import { FluidHighlight } from "../fluid-highlight";
import { Drawer, DrawerContent, DrawerTrigger } from "./drawer";
import { useField, useFieldControl } from "./field";
import { controlBase, controlSize } from "./input";
import {
  choicePopupClassName,
  choiceRowClassName,
  DrawerListTitle,
  listSeparatorClassName,
  type Shape,
  TriggerChevron,
  touchRowClassName,
  useListName,
} from "./overlay-list";

/*
 * shadcn's Select, in the shape of the machine: a list anchored under its box on a desktop, the
 * same rows in a drawer under the thumb on a touch device. Every part below renders both shapes,
 * so a call site never asks which machine it is on. Scroll arrows are left out until a list needs
 * them: each part must bring its drawer shape and its tests with it. ADR 0017.
 */

type Value = string | null;

type OpenChangeDetails =
  | SelectPrimitive.Root.ChangeEventDetails
  | DrawerPrimitive.Root.ChangeEventDetails;

interface SelectItemData {
  value: Value;
  label: string;
}

interface SelectContextValue {
  shape: Shape;
  open: boolean;
  value: Value;
  setValue: (value: Value) => void;
  setOpen: (open: boolean, details?: OpenChangeDetails) => void;
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

interface SelectProps {
  value?: Value | undefined;
  defaultValue?: Value | undefined;
  onValueChange?: ((value: Value) => void) | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Base UI's details come second; a close the part makes itself, such as picking a row on touch, sends none. */
  onOpenChange?: ((open: boolean, details?: OpenChangeDetails) => void) | undefined;
  /** Every choice with its label. `SelectValue` reads the chosen label here, and an empty `SelectContent` lists them. */
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
  const [value, setValue] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  const [open, setOpen] = useControllableState<boolean, [details?: OpenChangeDetails]>({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
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
          onOpenChange={setOpen}
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

interface TriggerProps extends React.ComponentProps<"button"> {
  children: React.ReactNode;
}

/** The box. Put a `SelectValue` inside; the chevron is already there. */
function SelectTrigger({
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  className,
  children,
  ...props
}: TriggerProps) {
  const { shape, open, value, disabled, required } = useSelect("SelectTrigger");
  const a11y = useFieldControl({ id, "aria-describedby": describedBy, "aria-invalid": invalid });
  const classes = cn(
    controlBase,
    controlSize,
    "flex items-center gap-2 ps-3.5 pe-3 text-start select-none data-open:not-aria-invalid:edge-2 data-placeholder:text-muted",
    className,
  );
  if (shape === "desktop") {
    return (
      <SelectPrimitive.Trigger data-slot="select-trigger" {...props} {...a11y} className={classes}>
        {children}
        <TriggerChevron />
      </SelectPrimitive.Trigger>
    );
  }
  return (
    <DrawerTrigger
      data-slot="select-trigger"
      {...props}
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
      <TriggerChevron />
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

interface ContentProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Names the list in both shapes. Inside a Field its label names it, so leave this out there. */
  "aria-label"?: string | undefined;
  side?: "top" | "bottom" | undefined;
  align?: "start" | "center" | "end" | undefined;
  sideOffset?: number | undefined;
  /** Custom rows. Left out, the list shows a row for each of the root's `items`. */
  children?: React.ReactNode | undefined;
}

function SelectContent({ children, ...props }: ContentProps) {
  const { shape, items } = useSelect("SelectContent");
  const rows =
    children ??
    items?.map((item) => (
      <SelectItem key={String(item.value)} value={item.value}>
        {item.label}
      </SelectItem>
    ));
  return shape === "desktop" ? (
    <AnchoredContent {...props}>{rows}</AnchoredContent>
  ) : (
    <DrawerListContent {...props}>{rows}</DrawerListContent>
  );
}

function AnchoredContent({
  "aria-label": label,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
  ref: refProp,
  children,
  ...props
}: ContentProps) {
  const { open } = useSelect("SelectContent");
  const name = useListName(label, open);
  const ref = React.useRef<HTMLDivElement>(null);
  const refs = useMergedRefs(ref, refProp);
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
          ref={refs}
          data-slot="select-content"
          // While the pointer's fill is out, the highlighted row gives up its own: one cursor at a time.
          data-hovering={hover.shown || undefined}
          className={cn(
            choicePopupClassName,
            "relative max-h-(--available-height) w-max max-w-(--available-width) min-w-[max(9rem,var(--anchor-width))] overflow-x-hidden overflow-y-auto overscroll-contain p-1",
            className,
          )}
          {...mergeProps<"div">(
            {
              // Keyboard moves the highlight, and the highlight carries its own fill; two fills would be two cursors.
              onKeyDown: hover.hide,
              ...hover.handlers,
            },
            props,
          )}
        >
          <FluidHighlight hover={hover} />
          <SelectPrimitive.List {...name.props}>{children}</SelectPrimitive.List>
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
function DrawerListContent({
  "aria-label": label,
  side: _side,
  align: _align,
  sideOffset: _sideOffset,
  className,
  ref: refProp,
  children,
  ...props
}: ContentProps) {
  const { open, setOpen } = useSelect("SelectContent");
  const name = useListName(label, open);
  const ref = React.useRef<HTMLDivElement>(null);
  const refs = useMergedRefs(ref, refProp);
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
      <DrawerListTitle>{name.title}</DrawerListTitle>
      <div
        ref={refs}
        role="listbox"
        {...name.props}
        data-slot="select-content"
        className={cn("grid p-2 pt-1", className)}
        {...mergeProps<"div">({ onKeyDown }, props)}
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

// Base UI names each row itself, for the list's active descendant, so a row takes no id.
interface ItemProps extends Omit<React.HTMLAttributes<HTMLElement>, "id" | "children"> {
  ref?: React.Ref<HTMLElement> | undefined;
  /** `null` is the row that clears the choice, e.g. "No language". */
  value: Value;
  disabled?: boolean | undefined;
  children: React.ReactNode;
}

/** The check leads, in a slot every row keeps, so choosing one moves nothing. */
function SelectItem(props: ItemProps) {
  const { shape } = useSelect("SelectItem");
  if (shape === "touch") return <DrawerListItem {...props} />;
  const { ref, value, disabled, className, children, ...rest } = props;
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      {...rest}
      // The desktop row is a div; the drawer's is a button, so the shared ref names their common type.
      ref={ref as React.Ref<HTMLDivElement> | undefined}
      value={value}
      disabled={disabled}
      className={cn(choiceRowClassName, className)}
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

function DrawerListItem({ ref, value, disabled, className, children, ...props }: ItemProps) {
  const { value: current, setValue, setOpen } = useSelect("SelectItem");
  const selected = current === value;
  return useRender({
    defaultTagName: "button",
    ref,
    props: {
      ...mergeProps<"button">(
        {
          type: "button",
          role: "option",
          tabIndex: -1,
          "aria-selected": selected,
          "aria-disabled": disabled || undefined,
          onClick: () => {
            if (disabled) return;
            if (!selected) setValue(value);
            setOpen(false);
          },
        },
        props,
      ),
      "data-slot": "select-item",
      "data-selected": selected ? "" : undefined,
      "data-disabled": disabled ? "" : undefined,
      className: cn(choiceRowClassName, touchRowClassName, className),
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
      className={listSeparatorClassName("edge", className)}
    />
  ) : (
    // Presentational, like Base UI's: a listbox has no separator role to offer.
    <div
      role="presentation"
      data-slot="select-separator"
      className={listSeparatorClassName("inset", className)}
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
