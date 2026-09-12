import { clsx } from "clsx";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  /** Close and put focus back on the trigger. */
  close: () => void;
  id: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
}
const MenuCtx = createContext<Ctx | null>(null);

/**
 * A short list of actions behind one button. Arrow keys move, Escape closes, a click
 * outside closes. Give the trigger the props from MenuTrigger.
 */
export function Menu({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return (
    <MenuCtx.Provider value={{ open, setOpen, close, id, triggerRef }}>
      <div ref={ref} className={clsx("relative inline-flex", className)}>
        {children}
      </div>
    </MenuCtx.Provider>
  );
}

export type TriggerProps = {
  ref: RefObject<HTMLButtonElement | null>;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
};

export function MenuTrigger({ children }: { children: (p: TriggerProps) => ReactNode }) {
  const ctx = useContext(MenuCtx);
  if (!ctx) throw new Error("MenuTrigger outside Menu");
  return children({
    ref: ctx.triggerRef,
    "aria-haspopup": "menu",
    "aria-expanded": ctx.open,
    "aria-controls": ctx.id,
    onClick: () => ctx.setOpen(!ctx.open),
    onKeyDown: (e) => {
      if (e.key === "ArrowDown" && !ctx.open) {
        e.preventDefault();
        ctx.setOpen(true);
      }
    },
  });
}

export function MenuList({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "end" | undefined;
  className?: string | undefined;
}) {
  const ctx = useContext(MenuCtx);
  if (!ctx) throw new Error("MenuList outside Menu");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ctx.open) ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [ctx.open]);
  const onKey = useCallback((e: KeyboardEvent) => {
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ??
        [],
    );
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  }, []);
  if (!ctx.open) return null;
  return (
    <div
      ref={ref}
      id={ctx.id}
      role="menu"
      onKeyDown={onKey}
      className={clsx(
        "enter-menu edge-2 absolute top-[calc(100%+6px)] z-(--z-dropdown) min-w-48 rounded-md bg-plate p-1",
        align === "end" ? "end-0 origin-top-right" : "start-0 origin-top-left",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  children,
  onSelect,
  tone = "default",
  icon,
  kbd,
  disabled,
}: {
  children: ReactNode;
  onSelect?: (() => void) | undefined;
  tone?: "default" | "danger" | undefined;
  icon?: ReactNode | undefined;
  kbd?: string | undefined;
  disabled?: boolean | undefined;
}) {
  const ctx = useContext(MenuCtx);
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        ctx?.close();
      }}
      className={clsx(
        "flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-sm px-2.5 text-left text-base outline-none transition-colors",
        "focus-visible:bg-hover hoverable:hover:bg-hover",
        tone === "danger" ? "text-danger [&_svg]:text-danger" : "text-text [&_svg]:text-muted",
        disabled && "opacity-45",
        "[&_svg]:size-4",
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {kbd && <span className="ps-3 text-xs text-muted">{kbd}</span>}
    </button>
  );
}

export function MenuSeparator() {
  return <hr className="my-1 h-px border-0 bg-edge" />;
}
