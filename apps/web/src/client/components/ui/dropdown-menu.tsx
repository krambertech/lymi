import type { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { mergeProps } from "@base-ui/react/merge-props";
import type { BaseUIEvent } from "@base-ui/react/types";
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
import {
  listRowClassName,
  listSeparatorClassName,
  type Shape,
  touchRowClassName,
} from "./overlay-list";

/*
 * shadcn's Dropdown Menu, in the shape of the machine: anchored to its trigger on a desktop, a
 * drawer with the same rows and menu semantics on a touch device. Every part below renders both
 * shapes, so a call site never asks which machine it is on. ADR 0017.
 *
 * A submenu part is left out until a screen needs one: it must bring its drawer shape and its tests
 * with it.
 */

type OpenChangeDetails =
  | MenuPrimitive.Root.ChangeEventDetails
  | DrawerPrimitive.Root.ChangeEventDetails;

const DropdownMenuContext = React.createContext<{
  shape: Shape;
  setOpen: (open: boolean) => void;
} | null>(null);

function useDropdownMenu(part: string) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error(`${part} must be used within a DropdownMenu.`);
  return context;
}

const ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

const itemClassName = cn(
  listRowClassName,
  "group/dropdown-menu-item whitespace-nowrap focus-visible:bg-hover data-inset:ps-9 data-[variant=danger]:text-danger data-[variant=danger]:[&_svg]:text-danger [&_svg:not([class*='size-'])]:size-4",
);

/** The drawer's rows are buttons and the anchored ones divs, so a row's ref names their common type. */
type RowProps = Omit<React.HTMLAttributes<HTMLElement>, "onClick"> & {
  ref?: React.Ref<HTMLElement> | undefined;
};

type RowClick = (event: BaseUIEvent<React.MouseEvent<HTMLElement>>) => void;

function DropdownMenu({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  /** Base UI's details come second; a close the part makes itself, such as picking a row on touch, sends none. */
  onOpenChange?: ((open: boolean, details?: OpenChangeDetails) => void) | undefined;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useControllableState<boolean, [details?: OpenChangeDetails]>({
    value: controlled,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const shape = useOverlayShape(open);
  const context = React.useMemo(() => ({ shape, setOpen }), [shape, setOpen]);
  return (
    <DropdownMenuContext.Provider value={context}>
      {shape === "desktop" ? (
        // Not modal: the page keeps its scrollbar, so nothing under the menu shifts as it opens.
        <MenuPrimitive.Root
          data-slot="dropdown-menu"
          open={open}
          onOpenChange={setOpen}
          modal={false}
          highlightItemOnHover={false}
        >
          {children}
        </MenuPrimitive.Root>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          {children}
        </Drawer>
      )}
    </DropdownMenuContext.Provider>
  );
}

interface TriggerProps extends React.ComponentProps<"button"> {
  /** The control, such as `<IconButton … />`; a plain button when left out. */
  render?: React.ReactElement | undefined;
}

function DropdownMenuTrigger(props: TriggerProps) {
  const { shape } = useDropdownMenu("DropdownMenuTrigger");
  return shape === "desktop" ? (
    <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
  ) : (
    <DrawerTrigger data-slot="dropdown-menu-trigger" {...props} />
  );
}

interface ContentProps extends React.ComponentProps<"div"> {
  /** Names the menu for screen readers in both shapes. */
  "aria-label": string;
  align?: "start" | "center" | "end" | undefined;
  /** "top" for a trigger at the foot of the screen, so the list opens into the room above. */
  side?: "top" | "bottom" | undefined;
  sideOffset?: number | undefined;
}

function DropdownMenuContent(props: ContentProps) {
  const { shape } = useDropdownMenu("DropdownMenuContent");
  return shape === "desktop" ? <AnchoredContent {...props} /> : <DrawerMenuContent {...props} />;
}

function AnchoredContent({
  align = "start",
  side = "bottom",
  sideOffset = 6,
  ref: refProp,
  className,
  children,
  ...props
}: ContentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const refs = useMergedRefs(ref, refProp);
  const hover = useFluidHover(ref, { items: ITEM, dividers: '[role="separator"]' });
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        // A popup, not a dropdown layer: a menu can open from inside a sheet, such as a card's options.
        className="isolate z-(--z-popup) outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          ref={refs}
          data-slot="dropdown-menu-content"
          className={cn(
            // Grows out of the corner nearest its trigger, scale 0.94 to 1 over 140 ms.
            "edge-2 relative max-h-(--available-height) w-max max-w-(--available-width) min-w-[max(12rem,var(--anchor-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md bg-plate p-1 text-text outline-none transition-[opacity,scale] duration-140 ease-(--ease-out) data-starting-style:scale-94 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100",
            className,
          )}
          {...mergeProps<"div">(
            {
              // Keyboard moves focus, and focus carries its own fill; two fills would be two cursors.
              onKeyDown: hover.hide,
              ...hover.handlers,
            },
            props,
          )}
        >
          <FluidHighlight hover={hover} />
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/**
 * The rows in a drawer, with the anchored menu's keyboard model for a touch device with a keyboard
 * attached: rows are out of the tab order, arrow keys walk them, disabled rows included so a screen
 * reader still hears them, and Tab leaves the menu, which closes it.
 */
function DrawerMenuContent({
  "aria-label": label,
  align: _align,
  side: _side,
  sideOffset: _sideOffset,
  ref: refProp,
  className,
  children,
  ...props
}: ContentProps) {
  const { setOpen } = useDropdownMenu("DropdownMenuContent");
  const ref = React.useRef<HTMLDivElement>(null);
  const refs = useMergedRefs(ref, refProp);
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      const to =
        e.key === "ArrowDown"
          ? items[(i + 1) % items.length]
          : e.key === "ArrowUp"
            ? items[(i - 1 + items.length) % items.length]
            : e.key === "Home"
              ? items[0]
              : e.key === "End"
                ? items.at(-1)
                : undefined;
      if (to) {
        e.preventDefault();
        to.focus();
      }
    },
    [setOpen],
  );
  return (
    <DrawerContent
      aria-label={label}
      // Through the drawer rather than an effect, so it still knows the trigger to hand focus back to.
      initialFocus={() =>
        ref.current?.querySelector<HTMLElement>(`${ITEM}:not([aria-disabled="true"])`) ?? true
      }
    >
      <div
        ref={refs}
        role="menu"
        aria-label={label}
        data-slot="dropdown-menu-content"
        className={cn("grid p-2 pt-1", className)}
        {...mergeProps<"div">({ onKeyDown }, props)}
      >
        {children}
      </div>
    </DrawerContent>
  );
}

/** The drawer's group, named by its label the way Base UI names the anchored one. */
const DrawerMenuGroupContext = React.createContext<{
  labelId: string;
  setLabelled: (labelled: boolean) => void;
} | null>(null);

function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  const { shape } = useDropdownMenu("DropdownMenuGroup");
  const labelId = React.useId();
  const [labelled, setLabelled] = React.useState(false);
  const group = React.useMemo(() => ({ labelId, setLabelled }), [labelId]);
  return shape === "desktop" ? (
    <MenuPrimitive.Group data-slot="dropdown-menu-group">{children}</MenuPrimitive.Group>
  ) : (
    <DrawerMenuGroupContext.Provider value={group}>
      {/* biome-ignore lint/a11y/useSemanticElements: a group of menu items, which a fieldset is not */}
      <div
        role="group"
        data-slot="dropdown-menu-group"
        aria-labelledby={labelled ? labelId : undefined}
      >
        {children}
      </div>
    </DrawerMenuGroupContext.Provider>
  );
}

/** Names the `DropdownMenuGroup` it sits in, which it needs in both shapes, as Base UI's does. */
function DropdownMenuLabel({
  className,
  inset,
  children,
}: {
  className?: string | undefined;
  inset?: boolean | undefined;
  children: React.ReactNode;
}) {
  const { shape } = useDropdownMenu("DropdownMenuLabel");
  const classes = cn("px-2.5 py-1.5 text-xs text-muted data-inset:ps-9", className);
  return shape === "desktop" ? (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={classes}
    >
      {children}
    </MenuPrimitive.GroupLabel>
  ) : (
    <DrawerMenuLabel inset={inset} className={classes}>
      {children}
    </DrawerMenuLabel>
  );
}

function DrawerMenuLabel({
  inset,
  className,
  children,
}: {
  inset?: boolean | undefined;
  className: string;
  children: React.ReactNode;
}) {
  const group = React.useContext(DrawerMenuGroupContext);
  if (!group) throw new Error("DropdownMenuLabel must be used within a DropdownMenuGroup.");
  const { labelId, setLabelled } = group;
  React.useLayoutEffect(() => {
    setLabelled(true);
    return () => setLabelled(false);
  }, [setLabelled]);
  return (
    <div id={labelId} data-slot="dropdown-menu-label" data-inset={inset} className={className}>
      {children}
    </div>
  );
}

interface ItemProps extends RowProps {
  /** Runs before the menu closes; `event.preventBaseUIHandler()` keeps it open. */
  onClick?: RowClick | undefined;
  /** False keeps the menu open after the row runs. */
  closeOnClick?: boolean | undefined;
  disabled?: boolean | undefined;
  inset?: boolean | undefined;
  variant?: "default" | "danger" | undefined;
}

function DropdownMenuItem(props: ItemProps) {
  const { shape } = useDropdownMenu("DropdownMenuItem");
  if (shape === "touch") return <DrawerMenuItem {...props} />;
  const { ref, inset, variant = "default", className, ...rest } = props;
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      {...rest}
      ref={ref as React.Ref<HTMLDivElement> | undefined}
      className={cn(itemClassName, className)}
    />
  );
}

function DrawerMenuItem({
  ref,
  onClick,
  closeOnClick = true,
  disabled,
  inset,
  variant = "default",
  className,
  ...props
}: ItemProps) {
  const { setOpen } = useDropdownMenu("DropdownMenuItem");
  return useRender({
    defaultTagName: "button",
    ref,
    props: {
      ...mergeProps<"button">(
        {
          type: "button",
          role: "menuitem",
          tabIndex: -1,
          "aria-disabled": disabled || undefined,
          onClick: () => {
            if (!disabled && closeOnClick) setOpen(false);
          },
        },
        { ...props, onClick: disabled ? undefined : onClick },
      ),
      "data-slot": "dropdown-menu-item",
      "data-inset": inset || undefined,
      "data-variant": variant,
      "data-disabled": disabled ? "" : undefined,
      className: cn(itemClassName, touchRowClassName, className),
    },
  });
}

interface CheckboxItemProps extends RowProps {
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onCheckedChange?:
    | ((checked: boolean, details?: MenuPrimitive.CheckboxItem.ChangeEventDetails) => void)
    | undefined;
  disabled?: boolean | undefined;
}

/** A tick in the start slot every row keeps, so checked and unchecked rows line up. */
function ItemCheck({ checked }: { checked: boolean }) {
  return (
    <span className="pointer-events-none absolute start-2.5 flex size-4 items-center justify-center">
      {checked && <Check className="text-text!" strokeWidth={2.5} aria-hidden="true" />}
    </span>
  );
}

/** A row that turns something on or off and leaves the menu open, so several can be chosen. */
function DropdownMenuCheckboxItem({
  ref,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  className,
  children,
  ...props
}: CheckboxItemProps) {
  const { shape } = useDropdownMenu("DropdownMenuCheckboxItem");
  const [checked, setChecked] = useControllableState<
    boolean,
    [details?: MenuPrimitive.CheckboxItem.ChangeEventDetails]
  >({ value: checkedProp, defaultValue: defaultChecked, onChange: onCheckedChange });
  if (shape === "desktop") {
    return (
      <MenuPrimitive.CheckboxItem
        data-slot="dropdown-menu-checkbox-item"
        {...props}
        ref={ref as React.Ref<HTMLDivElement> | undefined}
        checked={checked}
        onCheckedChange={setChecked}
        disabled={disabled}
        closeOnClick={false}
        className={cn(itemClassName, "ps-9", className)}
      >
        <ItemCheck checked={checked} />
        {children}
      </MenuPrimitive.CheckboxItem>
    );
  }
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      {...mergeProps<"button">(
        {
          onClick: () => {
            if (!disabled) setChecked(!checked);
          },
        },
        props,
      )}
      ref={ref as React.Ref<HTMLButtonElement> | undefined}
      data-slot="dropdown-menu-checkbox-item"
      data-disabled={disabled ? "" : undefined}
      className={cn(itemClassName, touchRowClassName, "ps-9", className)}
    >
      <ItemCheck checked={checked} />
      {children}
    </button>
  );
}

const RadioGroupContext = React.createContext<{
  value: string | undefined;
  setValue: (value: string) => void;
} | null>(null);

function DropdownMenuRadioGroup({
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
}: {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  children: React.ReactNode;
}) {
  const { shape } = useDropdownMenu("DropdownMenuRadioGroup");
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: (next: string | undefined) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  const context = React.useMemo(() => ({ value, setValue }), [value, setValue]);
  return (
    <RadioGroupContext.Provider value={context}>
      {shape === "desktop" ? (
        <MenuPrimitive.RadioGroup
          data-slot="dropdown-menu-radio-group"
          // Null rather than undefined while nothing is chosen, so Base UI never takes the group for uncontrolled.
          value={value ?? null}
          onValueChange={(next: string) => setValue(next)}
        >
          {children}
        </MenuPrimitive.RadioGroup>
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: a group of menu items, which a fieldset is not
        <div role="group" data-slot="dropdown-menu-radio-group">
          {children}
        </div>
      )}
    </RadioGroupContext.Provider>
  );
}

interface RadioItemProps extends RowProps {
  value: string;
  /** False when the menu holds more to choose, such as a filter menu. */
  closeOnClick?: boolean | undefined;
}

/** One of a set. Choosing it closes the menu, unless the set sits among other choices. */
function DropdownMenuRadioItem({
  ref,
  value,
  closeOnClick = true,
  className,
  children,
  ...props
}: RadioItemProps) {
  const { shape, setOpen } = useDropdownMenu("DropdownMenuRadioItem");
  const group = React.useContext(RadioGroupContext);
  if (!group)
    throw new Error("DropdownMenuRadioItem must be used within a DropdownMenuRadioGroup.");
  const checked = group.value === value;
  if (shape === "desktop") {
    return (
      <MenuPrimitive.RadioItem
        data-slot="dropdown-menu-radio-item"
        {...props}
        ref={ref as React.Ref<HTMLDivElement> | undefined}
        value={value}
        closeOnClick={closeOnClick}
        className={cn(itemClassName, "ps-9", className)}
      >
        <ItemCheck checked={checked} />
        {children}
      </MenuPrimitive.RadioItem>
    );
  }
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      {...mergeProps<"button">(
        {
          onClick: () => {
            if (closeOnClick) setOpen(false);
            group.setValue(value);
          },
        },
        props,
      )}
      ref={ref as React.Ref<HTMLButtonElement> | undefined}
      data-slot="dropdown-menu-radio-item"
      className={cn(itemClassName, touchRowClassName, "ps-9", className)}
    >
      <ItemCheck checked={checked} />
      {children}
    </button>
  );
}

interface LinkItemProps extends React.ComponentProps<"a"> {
  /** The anchor: a router `Link`, or a plain `<a href>`. */
  render: React.ReactElement;
  inset?: boolean | undefined;
}

/** Lymi's addition: a row that navigates, on Base UI's `Menu.LinkItem`. */
function DropdownMenuLinkItem(props: LinkItemProps) {
  const { shape } = useDropdownMenu("DropdownMenuLinkItem");
  if (shape === "touch") return <DrawerMenuLinkItem {...props} />;
  const { inset, className, ...rest } = props;
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-menu-link-item"
      data-inset={inset}
      closeOnClick
      {...rest}
      className={cn(itemClassName, className)}
    />
  );
}

function DrawerMenuLinkItem({ render, ref, inset, className, ...props }: LinkItemProps) {
  const { setOpen } = useDropdownMenu("DropdownMenuLinkItem");
  return useRender({
    defaultTagName: "a",
    render,
    ref,
    props: {
      ...mergeProps<"a">({ role: "menuitem", tabIndex: -1, onClick: () => setOpen(false) }, props),
      "data-slot": "dropdown-menu-link-item",
      "data-inset": inset || undefined,
      className: cn(itemClassName, touchRowClassName, className),
    },
  });
}

function DropdownMenuSeparator({ className }: { className?: string | undefined }) {
  const { shape } = useDropdownMenu("DropdownMenuSeparator");
  return shape === "desktop" ? (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={listSeparatorClassName("edge", className)}
    />
  ) : (
    <hr
      data-slot="dropdown-menu-separator"
      className={listSeparatorClassName("inset", cn("border-0", className))}
    />
  );
}

/** A keyboard hint beside a row. Touch has no keyboard to hint at, so the drawer leaves it out. */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  const { shape } = useDropdownMenu("DropdownMenuShortcut");
  if (shape === "touch") return null;
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ms-auto ps-3 text-xs text-muted", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
};
