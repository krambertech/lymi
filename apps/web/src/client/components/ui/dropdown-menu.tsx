import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import { Check } from "lucide-react";
import * as React from "react";
import { useOverlayShape } from "../../lib/device";
import { useFluidHover } from "../../lib/fluid-hover";
import { FluidHighlight } from "../fluid-highlight";
import { Drawer, DrawerContent, DrawerTrigger } from "./drawer";

/*
 * shadcn's Dropdown Menu, in the shape of the machine: anchored to its trigger on a desktop, a
 * drawer with the same rows and menu semantics on a touch device. Every part below renders both
 * shapes, so a call site never asks which machine it is on. ADR 0017.
 *
 * A submenu part is left out until a screen needs one: it must bring its drawer shape and its tests
 * with it.
 */

type Shape = "desktop" | "touch";

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

const itemClassName =
  "group/dropdown-menu-item relative flex h-11 w-full cursor-default items-center gap-2.5 whitespace-nowrap rounded-sm px-2.5 text-start text-[1rem] text-text outline-none select-none md:h-10 md:text-base focus-visible:bg-hover data-highlighted:bg-hover data-inset:ps-9 data-[variant=destructive]:text-danger data-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:[&_svg]:text-danger [&_svg:not([class*='size-'])]:size-4";

/** Pressed feedback for a row under a finger, where there is no hover. */
const touchItemClassName = "active:bg-hover";

function DropdownMenu({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  children,
}: {
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
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

/** Compose the control through `render`: `<DropdownMenuTrigger render={<IconButton … />} />`. */
function DropdownMenuTrigger({ render }: { render: React.ReactElement }) {
  const { shape } = useDropdownMenu("DropdownMenuTrigger");
  return shape === "desktop" ? (
    <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" render={render} />
  ) : (
    <DrawerTrigger data-slot="dropdown-menu-trigger" render={render} />
  );
}

interface ContentProps {
  /** Names the menu for screen readers in both shapes. */
  "aria-label": string;
  align?: "start" | "center" | "end" | undefined;
  /** "top" for a trigger at the foot of the screen, so the list opens into the room above. */
  side?: "top" | "bottom" | undefined;
  sideOffset?: number | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

function DropdownMenuContent(props: ContentProps) {
  const { shape } = useDropdownMenu("DropdownMenuContent");
  return shape === "desktop" ? <AnchoredContent {...props} /> : <DrawerMenuContent {...props} />;
}

function AnchoredContent({
  "aria-label": label,
  align = "start",
  side = "bottom",
  sideOffset = 6,
  className,
  children,
}: ContentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
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
          ref={ref}
          data-slot="dropdown-menu-content"
          aria-label={label}
          className={cn(
            // Grows out of the corner nearest its trigger, scale 0.94 to 1 over 140 ms.
            "edge-2 relative max-h-(--available-height) w-max max-w-(--available-width) min-w-[max(12rem,var(--anchor-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md bg-plate p-1 text-text outline-none transition-[opacity,scale] duration-140 ease-(--ease-out) data-starting-style:scale-94 data-starting-style:opacity-0 data-ending-style:scale-97 data-ending-style:opacity-0 data-ending-style:duration-100 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100",
            className,
          )}
          // Keyboard moves focus, and focus carries its own fill; two fills would be two cursors.
          onKeyDown={hover.hide}
          {...hover.handlers}
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
function DrawerMenuContent({ "aria-label": label, className, children }: ContentProps) {
  const { setOpen } = useDropdownMenu("DropdownMenuContent");
  const ref = React.useRef<HTMLDivElement>(null);
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
        ref={ref}
        role="menu"
        aria-label={label}
        data-slot="dropdown-menu-content"
        onKeyDown={onKeyDown}
        className={cn("grid p-2 pt-1", className)}
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

interface ItemProps {
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  inset?: boolean | undefined;
  variant?: "default" | "destructive" | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

function DropdownMenuItem(props: ItemProps) {
  const { shape } = useDropdownMenu("DropdownMenuItem");
  if (shape === "touch") return <DrawerMenuItem {...props} />;
  const { onClick, disabled, inset, variant = "default", className, children } = props;
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      disabled={disabled}
      onClick={() => onClick?.()}
      className={cn(itemClassName, className)}
    >
      {children}
    </MenuPrimitive.Item>
  );
}

function DrawerMenuItem({
  onClick,
  disabled,
  inset,
  variant = "default",
  className,
  children,
}: ItemProps) {
  const { setOpen } = useDropdownMenu("DropdownMenuItem");
  return useRender({
    defaultTagName: "button",
    props: {
      type: "button",
      role: "menuitem",
      tabIndex: -1,
      "data-slot": "dropdown-menu-item",
      "data-inset": inset || undefined,
      "data-variant": variant,
      "aria-disabled": disabled || undefined,
      "data-disabled": disabled ? "" : undefined,
      className: cn(itemClassName, touchItemClassName, className),
      onClick: () => {
        if (disabled) return;
        setOpen(false);
        onClick?.();
      },
      children,
    },
  });
}

interface CheckboxItemProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
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
function DropdownMenuCheckboxItem(props: CheckboxItemProps) {
  const { shape } = useDropdownMenu("DropdownMenuCheckboxItem");
  const { checked, onCheckedChange, disabled, className, children } = props;
  if (shape === "desktop") {
    return (
      <MenuPrimitive.CheckboxItem
        data-slot="dropdown-menu-checkbox-item"
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
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
      data-slot="dropdown-menu-checkbox-item"
      aria-disabled={disabled || undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(itemClassName, touchItemClassName, "ps-9", className)}
      onClick={() => {
        if (!disabled) onCheckedChange(!checked);
      }}
    >
      <ItemCheck checked={checked} />
      {children}
    </button>
  );
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const { shape } = useDropdownMenu("DropdownMenuRadioGroup");
  const context = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange]);
  return (
    <RadioGroupContext.Provider value={context}>
      {shape === "desktop" ? (
        <MenuPrimitive.RadioGroup
          data-slot="dropdown-menu-radio-group"
          value={value}
          onValueChange={(next: string) => onValueChange(next)}
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

/** One of a set. Choosing it closes the menu, unless the set sits among other choices. */
function DropdownMenuRadioItem({
  value,
  closeOnClick = true,
  className,
  children,
}: {
  value: string;
  /** False when the menu holds more to choose, such as a filter menu. */
  closeOnClick?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  const { shape, setOpen } = useDropdownMenu("DropdownMenuRadioItem");
  const group = React.useContext(RadioGroupContext);
  if (!group)
    throw new Error("DropdownMenuRadioItem must be used within a DropdownMenuRadioGroup.");
  const checked = group.value === value;
  if (shape === "desktop") {
    return (
      <MenuPrimitive.RadioItem
        data-slot="dropdown-menu-radio-item"
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
      data-slot="dropdown-menu-radio-item"
      className={cn(itemClassName, touchItemClassName, "ps-9", className)}
      onClick={() => {
        if (closeOnClick) setOpen(false);
        group.onValueChange(value);
      }}
    >
      <ItemCheck checked={checked} />
      {children}
    </button>
  );
}

interface LinkItemProps {
  /** The anchor: a router `Link`, or a plain `<a href>`. */
  render: React.ReactElement;
  inset?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

/** Lymi's addition: a row that navigates, on Base UI's `Menu.LinkItem`. */
function DropdownMenuLinkItem(props: LinkItemProps) {
  const { shape } = useDropdownMenu("DropdownMenuLinkItem");
  if (shape === "touch") return <DrawerMenuLinkItem {...props} />;
  const { render, inset, className, children } = props;
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-menu-link-item"
      data-inset={inset}
      closeOnClick
      render={render}
      className={cn(itemClassName, className)}
    >
      {children}
    </MenuPrimitive.LinkItem>
  );
}

function DrawerMenuLinkItem({ render, inset, className, children }: LinkItemProps) {
  const { setOpen } = useDropdownMenu("DropdownMenuLinkItem");
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      role: "menuitem",
      tabIndex: -1,
      "data-slot": "dropdown-menu-link-item",
      "data-inset": inset || undefined,
      className: cn(itemClassName, touchItemClassName, className),
      onClick: () => setOpen(false),
      children,
    },
  });
}

function DropdownMenuSeparator({ className }: { className?: string | undefined }) {
  const { shape } = useDropdownMenu("DropdownMenuSeparator");
  return shape === "desktop" ? (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-edge", className)}
    />
  ) : (
    <hr
      data-slot="dropdown-menu-separator"
      className={cn("mx-2.5 my-1 h-px border-0 bg-edge", className)}
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
