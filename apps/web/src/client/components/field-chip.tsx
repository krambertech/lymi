import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";

/** A chip's look, for a picker's trigger to share with the chips that add a field. */
export function fieldChipClassName(filled: boolean) {
  return cn(
    "relative inline-flex h-8 max-w-44 shrink-0 items-center gap-1.5 rounded-sm bg-plate-2 ps-2 pe-2.5 text-sm font-medium edge transition-[box-shadow,background-color,color,scale] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 hoverable:hover:edge-2 aria-expanded:edge-2 data-popup-open:edge-2 aria-invalid:shadow-[0_0_0_1px_var(--danger)]",
    filled ? "text-text" : "text-text-2 hoverable:hover:text-text aria-invalid:text-danger",
    // The hit area reaches 44 px without moving the row.
    "before:absolute before:-inset-1.5 before:content-['']",
  );
}

/** What a chip shows: its icon, or a thumbnail once filled, then its label or value. */
export function FieldChipContent({
  icon: Icon,
  thumbnail,
  filled,
  children,
}: {
  icon: LucideIcon;
  thumbnail?: ReactNode;
  filled: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {thumbnail ?? (
        <Icon
          className={cn("size-4 shrink-0", filled ? "text-text-2" : "text-muted")}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </>
  );
}

interface ButtonProps extends ComponentProps<"button"> {
  icon: LucideIcon;
  thumbnail?: ReactNode;
  filled?: boolean | undefined;
}

/**
 * A chip that adds one of a card's fields to the form. docs/design/library-decks-and-cards.md,
 * "Adding and editing a card".
 */
export function FieldChipButton({
  icon,
  thumbnail,
  filled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button type="button" {...props} className={cn(fieldChipClassName(filled), className)}>
      <FieldChipContent icon={icon} thumbnail={thumbnail} filled={filled}>
        {children}
      </FieldChipContent>
    </button>
  );
}

const FADE = "2.5rem";

/**
 * The row the chips sit in: one line that scrolls sideways once the chips outgrow it, fading at
 * each edge that has more. A mouse wheel scrolls it too, since a mouse has no sideways scroll.
 */
export function FieldChipRow({
  label,
  className,
  children,
}: {
  label: string;
  /** Bleeds the row to the sheet's edges, e.g. "-mx-5 px-5" for a sheet padded 20 px. */
  className?: string | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ start: false, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      // scrollLeft runs negative from zero in a right-to-left row, so its size is the distance in.
      const scrolled = Math.abs(el.scrollLeft);
      const next = { start: scrolled > 2, end: scrolled + el.clientWidth < el.scrollWidth - 2 };
      setMore((now) => (now.start === next.start && now.end === next.end ? now : next));
    };
    measure();
    // A chip that fills in grows the row, which a mutation of its text reports.
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const mutation = new MutationObserver(measure);
    mutation.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener("scroll", measure, { passive: true });
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const rtl = getComputedStyle(el).direction === "rtl";
      const step = rtl ? -e.deltaY : e.deltaY;
      const before = el.scrollLeft;
      el.scrollLeft += step;
      // At the end of the row the wheel goes on to scroll the sheet, so the row never traps it.
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      resize.disconnect();
      mutation.disconnect();
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", wheel);
    };
  }, []);
  const start = more.start ? `transparent, black ${FADE}` : "black, black";
  const end = more.end ? `black calc(100% - ${FADE}), transparent` : "black";
  return (
    // biome-ignore lint/a11y/useSemanticElements: a row of controls with a name, which a fieldset is not
    <div
      ref={ref}
      role="group"
      aria-label={label}
      style={
        more.start || more.end
          ? { maskImage: `linear-gradient(to var(--chip-row-end, right), ${start}, ${end})` }
          : undefined
      }
      className={cn(
        // Room for focus rings inside the clip.
        "flex items-center gap-2 overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:none] rtl:[--chip-row-end:left] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
