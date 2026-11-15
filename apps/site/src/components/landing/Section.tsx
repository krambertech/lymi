import { clsx } from "clsx";
import type { ReactNode } from "react";

/** The page's gutter: the same at every section, so edges line up down the page. */
export const GUTTER = "px-5 @2xl:px-10";
/** The column every section's content sits in. */
export const COLUMN = "mx-auto max-w-[1040px]";

interface SectionProps {
  id?: string | undefined;
  /**
   * "plate" sets one section apart from its neighbours; "nested" is a step deeper, for the setup
   * steps a visitor follows, whose own steps sit on plate.
   */
  surface?: "canvas" | "plate" | "nested" | undefined;
  /** The place `site_link_followed` reports for links inside, read by the analytics listener. */
  nav?: string | undefined;
  /** The id of the heading that names the section, for screen readers. */
  labelledBy?: string | undefined;
  /** Leaves the column and gutter to the children, for rows that scroll to the screen's edge. */
  bleed?: boolean | undefined;
  /**
   * "end" is the closing section, which sits closer to what came before it. "ruled" opens a new
   * part of a reference page, such as an exam's decks, with a rule and more room above.
   */
  spacing?: "default" | "end" | "ruled" | undefined;
  children: ReactNode;
}

const SPACING = {
  default: "py-16 @4xl:py-20",
  end: "pt-4 pb-16 @4xl:pt-6 @4xl:pb-20",
  ruled: "border-t border-edge py-16 @4xl:py-24",
} as const;

/** One band of a marketing page: the gutter, the vertical rhythm and the 1040px column. */
export function Section({
  id,
  surface = "canvas",
  nav,
  labelledBy,
  bleed,
  spacing = "default",
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      data-nav={nav}
      aria-labelledby={labelledBy}
      className={clsx(
        "scroll-mt-8",
        !bleed && GUTTER,
        SPACING[spacing],
        surface === "plate" && "bg-plate",
        surface === "nested" && "bg-plate-nested",
      )}
    >
      {bleed ? children : <div className={COLUMN}>{children}</div>}
    </section>
  );
}

interface TitleProps {
  id?: string | undefined;
  /** "sm" is for a page about one thing, such as an exam, whose sections are reference, not pitch. */
  size?: "md" | "sm" | undefined;
  children: ReactNode;
}

/** A section's heading: one size for every pitch, so the page reads as one voice. */
export function SectionTitle({ id, size = "md", children }: TitleProps) {
  return (
    <h2
      id={id}
      className={clsx(
        "font-medium tracking-[-0.03em] text-balance text-ink",
        size === "md" ? "text-4xl @2xl:text-5xl" : "text-3xl @2xl:text-4xl",
      )}
    >
      {children}
    </h2>
  );
}

/** The paragraph under a section's heading. */
export function SectionBody({ children }: { children: ReactNode }) {
  return <p className="mt-5 text-md text-pretty text-ink-secondary">{children}</p>;
}

const MEASURE = {
  /** Beside a demo, in a two-column section. */
  narrow: "max-w-[440px]",
  /** Above a demo that runs the column's width. */
  wide: "max-w-[640px]",
} as const;

interface HeaderProps {
  title: ReactNode;
  body?: ReactNode;
  /** The heading's id, for a section labelled by it. */
  id?: string | undefined;
  /** A link on to the rest, at the end of the heading's row on wide screens. */
  action?: ReactNode;
  /** "center" for a section that stands on its own between two demos. */
  align?: "start" | "center" | undefined;
  measure?: keyof typeof MEASURE | undefined;
  /** Marks or links under the copy. */
  after?: ReactNode;
}

/** A section's heading and the line that says what it shows. */
export function SectionHeader({
  title,
  body,
  id,
  action,
  align = "start",
  measure = "wide",
  after,
}: HeaderProps) {
  const copy = (
    <div
      className={clsx(
        align === "center" ? "mx-auto max-w-[680px] text-center" : MEASURE[measure],
        action && "min-w-0",
      )}
    >
      <SectionTitle id={id}>{title}</SectionTitle>
      {body && <SectionBody>{body}</SectionBody>}
      {after && <div className="mt-8">{after}</div>}
    </div>
  );
  if (!action) return copy;
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      {copy}
      {action}
    </div>
  );
}
