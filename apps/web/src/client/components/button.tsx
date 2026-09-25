import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import { cn } from "cn";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Kbd } from "./kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";
type IconButtonSize = Exclude<ButtonSize, "xl">;

interface Props extends useRender.ComponentProps<"button"> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Keyboard hint shown inside the button on desktop, e.g. "R". */
  kbd?: string | undefined;
  loading?: boolean | undefined;
  children: ReactNode;
}

// No tabular figures: Onest's tabular 1 carries side bearings wide enough to pull "Lezione 12"
// apart mid-label. A button showing figures that line up in a column asks for `tabular-nums` itself.
const base =
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-[background-color,color,box-shadow,scale] duration-150 ease-out " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 " +
  // Busy and unavailable dim the same way, but stay focusable: see the note on `Button`.
  "aria-disabled:opacity-45 aria-disabled:active:scale-100";

/** An icon marked `data-icon="inline-start"` or `"inline-end"` trims 2 px on its side so the label reads centred. */
const iconSide =
  "[&:has(>span>[data-icon=inline-start])]:ps-[calc(var(--btn-px)-2px)] [&:has(>[data-icon=inline-start])]:ps-[calc(var(--btn-px)-2px)] " +
  "[&:has(>span>[data-icon=inline-end])]:pe-[calc(var(--btn-px)-2px)] [&:has(>[data-icon=inline-end])]:pe-[calc(var(--btn-px)-2px)]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-amber text-amber-ink hoverable:hover:bg-amber-hover",
  secondary: "edge bg-plate text-text hoverable:hover:bg-hover",
  // `hover`, not `plate-2`: in the light room plate-2 is the rail, so the fill vanished there.
  ghost: "bg-transparent text-text-2 hoverable:hover:bg-hover hoverable:hover:text-text",
  danger: "bg-danger-soft text-danger hoverable:hover:bg-danger hoverable:hover:text-canvas",
};

// Hit areas reach 44 px vertically only, so buttons side by side never cover each other.
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-(--btn-px) [--btn-px:12px] text-sm rounded-sm [&_svg]:size-4 before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
  md: "h-10 px-(--btn-px) [--btn-px:16px] text-base [&_svg]:size-[18px] before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-['']",
  lg: "h-12 px-(--btn-px) [--btn-px:20px] text-md [&_svg]:size-5",
  // Today's one full-width action: Review, or what stands in for it when nothing is due.
  xl: "h-16 px-(--btn-px) [--btn-px:20px] text-lg [&_svg]:size-5",
};

/** The button's classes on their own, for a place that takes only a class name. */
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
 *
 * A link that looks like a button passes itself as `render`: `<Button render={<Link to="/today" />}>`.
 */
export function Button({
  variant = "secondary",
  size = "md",
  kbd,
  loading,
  className,
  children,
  onClick,
  render,
  ref,
  ...rest
}: Props) {
  const inert = loading || rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  return useRender({
    defaultTagName: "button",
    render,
    ref,
    props: mergeProps<"button">(
      {
        type: render ? undefined : "button",
        className: clsx(base, iconSide, variants[variant], sizes[size], className),
        "aria-busy": loading || undefined,
        "aria-disabled": inert || undefined,
        onClick: (e) => {
          if (inert) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        },
        children: (
          <>
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
          </>
        ),
      },
      rest,
    ),
  });
}

interface IconButtonProps extends ComponentProps<"button"> {
  /** Required. Describes the action, not the icon. */
  label: string;
  size?: IconButtonSize | undefined;
  variant?: ButtonVariant | undefined;
  /** A circle instead of the 10 px square. For the pronunciation button and capture. */
  round?: boolean | undefined;
  children: ReactNode;
}

const iconVariants: Record<ButtonVariant, string> = {
  ...variants,
  // An icon on a plate sits a step quieter than a label would.
  secondary: cn(variants.secondary, "text-text-2"),
};

const iconSizes: Record<IconButtonSize, string> = {
  sm: "size-8 [&_svg]:size-4 before:absolute before:-inset-y-1.5 before:[inset-inline:var(--hit-x,-6px)] before:content-['']",
  md: "size-10 [&_svg]:size-[18px] before:absolute before:-inset-y-0.5 before:[inset-inline:var(--hit-x,-2px)] before:content-['']",
  lg: "size-12 [&_svg]:size-5",
};

/**
 * A square button holding one icon. The hit area reaches 44 px; a row whose buttons sit closer
 * than their extensions sets `[--hit-x:0px]` so neither covers its neighbour.
 * Its label is the accessible name and shows as a tooltip; it stays quiet while its menu is open.
 */
export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  round,
  className,
  children,
  onClick,
  ref,
  ...rest
}: IconButtonProps) {
  const expanded = rest["aria-expanded"] === true || rest["aria-expanded"] === "true";
  const inert = rest["aria-disabled"] === true || rest["aria-disabled"] === "true";
  return (
    <Tooltip disabled={expanded || rest.disabled}>
      <TooltipTrigger
        render={
          <button
            ref={ref}
            type="button"
            aria-label={label}
            className={clsx(
              "relative inline-flex shrink-0 items-center justify-center transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-disabled:opacity-45 aria-disabled:active:scale-100",
              round ? "rounded-full" : "rounded-sm",
              iconVariants[variant],
              iconSizes[size],
              className,
            )}
            onClick={(e) => {
              // An unavailable control swallows the press, so it cannot reach a clickable parent either.
              if (inert) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onClick?.(e);
            }}
            {...rest}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
