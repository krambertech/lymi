import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Keyboard hint shown inside the button on desktop, e.g. "R". */
  kbd?: string;
  loading?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md border border-transparent cursor-pointer select-none " +
  "transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out-quart " +
  "hover:-translate-y-px active:translate-y-0 active:scale-[0.98] " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-amber text-amber-ink shadow-amber hover:bg-amber-hover",
  secondary: "bg-bg text-ink border-border-strong hover:bg-hover",
  ghost: "bg-transparent text-ink-2 hover:bg-raised hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13.5px] rounded-sm",
  md: "h-10 px-4 text-[14.5px]",
  lg: "h-11 px-5 text-[15px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  kbd,
  loading,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={clsx(base, variants[variant], sizes[size], className)}
      aria-busy={loading}
      {...rest}
    >
      {children}
      {kbd && (
        <kbd
          className={clsx(
            "hidden sm:inline-block font-sans text-[11px] font-medium leading-none px-1.5 py-[3px] rounded-[5px]",
            variant === "primary" ? "bg-black/15" : "bg-raised border border-border text-muted",
          )}
        >
          {kbd}
        </kbd>
      )}
    </button>
  );
}
