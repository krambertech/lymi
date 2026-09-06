import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { Kbd } from "./Kbd";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Keyboard hint shown inside the button on desktop, e.g. "R". */
  kbd?: string | undefined;
  loading?: boolean | undefined;
  children: ReactNode;
}

const base =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tabular-nums " +
  "transition-[background-color,color,box-shadow,scale] duration-150 ease-out " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 " +
  // Busy and unavailable dim the same way, but stay focusable: see the note on `Button`.
  "aria-disabled:opacity-45 aria-disabled:active:scale-100";

/** Buttons with an icon on one side trim 2 px on that side so the label reads centred. */
const iconSide =
  "[&:has(>span>svg:first-child)]:pl-[calc(var(--btn-px)-2px)] [&:has(>span>svg:last-child)]:pr-[calc(var(--btn-px)-2px)]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-amber text-amber-ink hoverable:hover:bg-amber-hover",
  secondary: "edge bg-plate text-text hoverable:hover:bg-hover",
  ghost: "bg-transparent text-text-2 hoverable:hover:bg-plate-2 hoverable:hover:text-text",
  danger: "bg-danger-soft text-danger hoverable:hover:bg-danger hoverable:hover:text-canvas",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-(--btn-px) [--btn-px:12px] text-sm rounded-sm [&_svg]:size-4",
  md: "h-10 px-(--btn-px) [--btn-px:16px] text-base [&_svg]:size-[18px]",
  lg: "h-12 px-(--btn-px) [--btn-px:20px] text-md [&_svg]:size-5",
};

/** The button's classes on their own, for a Link that should look and behave like one. */
export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
) {
  return clsx(base, iconSide, variants[variant], sizes[size], className);
}

/**
 * A button is never taken away for being unable to run yet. `disabled` drops it out of the
 * tab order and tells a screen reader nothing about why, so a form that greys out its submit
 * leaves the learner with no way to ask what is missing. Instead the button stays pressable,
 * the form validates on submit and says what is wrong. `aria-disabled` is for the cases where
 * pressing genuinely cannot do anything yet — mid-request, or a handler that does not exist —
 * and it keeps the button focusable and announced while swallowing the press.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", kbd, loading, className, children, onClick, ...rest },
  ref,
) {
  const inert = loading || rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(base, iconSide, variants[variant], sizes[size], className)}
      aria-busy={loading || undefined}
      aria-disabled={inert || undefined}
      onClick={(e) => {
        if (inert) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      <span
        className={clsx(
          "inline-flex items-center gap-2 transition-[opacity,filter] duration-150",
          loading && "opacity-0 blur-[2px]",
        )}
      >
        {children}
        {kbd && (
          <span className="hidden @2xl:contents">
            <Kbd tone={variant === "primary" ? "on-primary" : "default"}>{kbd}</Kbd>
          </span>
        )}
      </span>
      {loading && (
        <span className="spinner-enter absolute inset-0 grid place-items-center">
          <Loader2 className="animate-spin" aria-hidden="true" />
        </span>
      )}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required. Describes the action, not the icon. */
  label: string;
  size?: ButtonSize | undefined;
  variant?: "ghost" | "secondary" | undefined;
  /** A circle instead of the 10 px square. For the pronunciation button. */
  round?: boolean | undefined;
  children: ReactNode;
}

/** A square button holding one icon. The hit area is at least 40 px even when the box is smaller. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", variant = "ghost", round, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center text-text-2 transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
        round ? "rounded-full" : "rounded-sm",
        "before:absolute before:-inset-1.5 before:content-['']",
        variant === "ghost" && "hoverable:hover:bg-plate-2 hoverable:hover:text-text",
        variant === "secondary" && "edge bg-plate hoverable:hover:bg-hover",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-10 [&_svg]:size-[18px]",
        size === "lg" && "size-12 [&_svg]:size-5",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
