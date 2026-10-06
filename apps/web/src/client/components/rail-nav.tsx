import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import { cn } from "cn";
import { type ComponentProps, type ReactNode, useLayoutEffect, useRef } from "react";
import { useFluidHover } from "../lib/fluid-hover";
import { FluidHighlight } from "./fluid-highlight";

const ROW = "[data-rail-row]";
const BREAK = "[data-rail-break]";

interface RailNavProps extends ComponentProps<"nav"> {
  /** Changes whenever the rows do, so the hover measures the new list while the pointer is still on it. */
  rows?: unknown;
}

/**
 * The rows of a rail, under one hover fill that glides to the row nearest the pointer. The current
 * row is opaque, so the fill passes under it and never outranks it; docs/design/system/rail.md.
 */
export function RailNav({ rows, className, children, ...rest }: RailNavProps) {
  const ref = useRef<HTMLElement>(null);
  const hover = useFluidHover(ref, { items: ROW, dividers: BREAK });
  const { remeasure } = hover;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `rows` is the signal to measure again.
  useLayoutEffect(() => remeasure(), [rows, remeasure]);
  return (
    <nav
      ref={ref}
      className={clsx("relative flex flex-col gap-0.5", className)}
      {...mergeProps<"nav">(
        // Focus carries its own ring; a fill left behind the pointer would be a second cursor.
        {
          onKeyDown: hover.hide,
          onFocus: (e) => {
            if (e.target.matches(":focus-visible")) hover.hide();
          },
          ...hover.handlers,
        },
        rest,
      )}
    >
      <FluidHighlight hover={hover} className="bg-rail-hover" />
      {children}
    </nav>
  );
}

interface RailRowProps extends useRender.ComponentProps<"a"> {
  icon?: ReactNode | undefined;
  /** Sits at the end of the row, such as a deck's `DueCount`. */
  end?: ReactNode | undefined;
}

/**
 * One place in the rail. Render it as the router's link, which marks the current row `.active`.
 * The text hovers to full ink; the fill comes from `RailNav`.
 */
export function RailRow({ render, icon, end, className, children, ...rest }: RailRowProps) {
  const own: ComponentProps<"a"> & { "data-rail-row": "" } = {
    "data-rail-row": "",
    className: cn(
      "relative flex h-10 items-center gap-2.5 rounded-sm px-2.5 text-base text-text-2",
      "transition-[background-color,color,box-shadow] duration-150 ease-out hoverable:hover:text-text",
      "[&.active]:edge-inset [&.active]:bg-rail-chosen [&.active]:text-text",
      "[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-muted [&.active_svg]:text-text",
      className,
    ),
    children: (
      <>
        {icon}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {end}
      </>
    ),
  };
  return useRender({ defaultTagName: "a", render, props: mergeProps<"a">(own, rest) });
}

/** A section of the rail, such as Decks. A label, not a heading, so the screen beside it keeps its own outline. */
export function RailHeading({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      data-rail-break=""
      className={clsx(
        "relative mx-2.5 mt-7 mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted",
        className,
      )}
      {...rest}
    />
  );
}
