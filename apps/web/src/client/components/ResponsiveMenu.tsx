import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import {
  createContext,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useOverlayShape } from "../lib/device";
import { useFluidHover } from "../lib/fluid-hover";
import { FluidHighlight } from "./FluidHighlight";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "./ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  menuItemClassName,
} from "./ui/dropdown-menu";

/*
 * The Dropdown Menu anatomy, in the shape of the machine: anchored to its trigger on a desktop, a
 * drawer with the same rows and menu semantics on a touch device. ADR 0017.
 */

interface Ctx {
  shape: "desktop" | "touch";
  setOpen: (open: boolean) => void;
}
const MenuCtx = createContext<Ctx | null>(null);
const ITEM = '[role="menuitem"]';

function useMenu(part: string): Ctx {
  const ctx = useContext(MenuCtx);
  if (!ctx) throw new Error(`${part} must be used within a ResponsiveMenu.`);
  return ctx;
}

function ResponsiveMenu({
  open: controlled,
  onOpenChange,
  children,
}: {
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children: ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlled ?? uncontrolled;
  const setOpen = useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const shape = useOverlayShape(open);
  return (
    <MenuCtx.Provider value={{ shape, setOpen }}>
      {shape === "desktop" ? (
        // Not modal: the page keeps its scrollbar, so nothing under the menu shifts as it opens.
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false} highlightItemOnHover={false}>
          {children}
        </DropdownMenu>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          {children}
        </Drawer>
      )}
    </MenuCtx.Provider>
  );
}

/** Give it the control through `render`: `<ResponsiveMenuTrigger render={<IconButton … />} />`. */
function ResponsiveMenuTrigger({ render }: { render: ReactElement }) {
  const { shape } = useMenu("ResponsiveMenuTrigger");
  return shape === "desktop" ? (
    <DropdownMenuTrigger render={render} />
  ) : (
    <DrawerTrigger render={render} />
  );
}

function ResponsiveMenuContent({
  label,
  align,
  side,
  className,
  children,
}: {
  /** Names the drawer for screen readers. The anchored list takes its name from the trigger. */
  label: string;
  align?: "start" | "center" | "end" | undefined;
  /** "top" for a trigger at the foot of the screen, so the list opens into the room above. */
  side?: "top" | "bottom" | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  const { shape } = useMenu("ResponsiveMenuContent");
  return shape === "desktop" ? (
    <AnchoredContent align={align} side={side} className={className}>
      {children}
    </AnchoredContent>
  ) : (
    <DrawerMenu label={label}>{children}</DrawerMenu>
  );
}

function AnchoredContent({
  align,
  side,
  className,
  children,
}: {
  align?: "start" | "center" | "end" | undefined;
  side?: "top" | "bottom" | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(ref, { items: ITEM, dividers: '[role="separator"]' });
  return (
    <DropdownMenuContent
      ref={ref}
      {...(align ? { align } : {})}
      {...(side ? { side } : {})}
      className={className}
      // Keyboard moves focus, and focus carries its own fill; two fills would be two cursors.
      onKeyDown={hover.hide}
      {...hover.handlers}
    >
      <FluidHighlight hover={hover} />
      {children}
    </DropdownMenuContent>
  );
}

/**
 * The rows in a drawer, with the anchored menu's keyboard model for a touch device with a keyboard
 * attached: rows are out of the tab order, arrow keys walk them, disabled rows included so a screen
 * reader still hears them, and Tab leaves the menu, which closes it.
 */
function DrawerMenu({ label, children }: { label: string; children: ReactNode }) {
  const { setOpen } = useMenu("ResponsiveMenuContent");
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
      // Through the drawer rather than an effect, so it still knows the trigger to hand focus back to.
      initialFocus={() =>
        ref.current?.querySelector<HTMLElement>(`${ITEM}:not([aria-disabled="true"])`) ?? true
      }
    >
      <DrawerTitle className="sr-only">{label}</DrawerTitle>
      <div ref={ref} role="menu" aria-label={label} onKeyDown={onKeyDown} className="grid p-2 pt-1">
        {children}
      </div>
    </DrawerContent>
  );
}

interface ItemProps {
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  variant?: "default" | "destructive" | undefined;
  className?: string | undefined;
  children: ReactNode;
}

function ResponsiveMenuItem(props: ItemProps) {
  const { shape } = useMenu("ResponsiveMenuItem");
  if (shape === "touch") return <DrawerMenuItem {...props} />;
  const { onClick, disabled, variant, className, children } = props;
  return (
    <DropdownMenuItem
      onClick={() => onClick?.()}
      disabled={disabled}
      variant={variant ?? "default"}
      className={className}
    >
      {children}
    </DropdownMenuItem>
  );
}

function DrawerMenuItem({
  onClick,
  disabled,
  variant = "default",
  className,
  children,
}: ItemProps) {
  const { setOpen } = useMenu("ResponsiveMenuItem");
  return useRender({
    defaultTagName: "button",
    props: {
      type: "button",
      role: "menuitem",
      tabIndex: -1,
      "aria-disabled": disabled || undefined,
      "data-disabled": disabled ? "" : undefined,
      "data-variant": variant,
      className: cn(menuItemClassName, "active:bg-hover", className),
      onClick: () => {
        if (disabled) return;
        setOpen(false);
        onClick?.();
      },
      children,
    },
  });
}

interface LinkItemProps {
  /** The anchor: a router `Link`, or a plain `<a href>`. */
  render: ReactElement;
  className?: string | undefined;
  children: ReactNode;
}

function ResponsiveMenuLinkItem(props: LinkItemProps) {
  const { shape } = useMenu("ResponsiveMenuLinkItem");
  if (shape === "touch") return <DrawerMenuLinkItem {...props} />;
  return (
    <DropdownMenuLinkItem closeOnClick render={props.render} className={props.className}>
      {props.children}
    </DropdownMenuLinkItem>
  );
}

function DrawerMenuLinkItem({ render, className, children }: LinkItemProps) {
  const { setOpen } = useMenu("ResponsiveMenuLinkItem");
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        role: "menuitem",
        tabIndex: -1,
        className: cn(menuItemClassName, "active:bg-hover", className),
        onClick: () => setOpen(false),
      },
      { children },
    ),
  });
}

function ResponsiveMenuSeparator() {
  const { shape } = useMenu("ResponsiveMenuSeparator");
  return shape === "desktop" ? (
    <DropdownMenuSeparator />
  ) : (
    <hr className="mx-2.5 my-1 h-px border-0 bg-edge" />
  );
}

/** A keyboard hint beside a row. Touch has no keyboard to hint at, so the drawer leaves it out. */
function ResponsiveMenuShortcut({ children }: { children: ReactNode }) {
  const { shape } = useMenu("ResponsiveMenuShortcut");
  return shape === "desktop" ? <DropdownMenuShortcut>{children}</DropdownMenuShortcut> : null;
}

export {
  ResponsiveMenu,
  ResponsiveMenuContent,
  ResponsiveMenuItem,
  ResponsiveMenuLinkItem,
  ResponsiveMenuSeparator,
  ResponsiveMenuShortcut,
  ResponsiveMenuTrigger,
};
