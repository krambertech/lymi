import { clsx } from "clsx";
import { type CSSProperties, createContext, type ReactNode, useContext, useId } from "react";
import type { SiteLinkPlace } from "../../lib/analytics";

/** The page's gutter: the same at every section, so edges line up down the page. */
export const GUTTER = "px-5 @2xl:px-10";
/** The column every section's content sits in. */
export const COLUMN = "mx-auto max-w-[1040px]";

/** The id of the section's heading, which names the section for screen readers. */
const TitleId = createContext<string | undefined>(undefined);

/** For a section whose heading isn't `Section.Title`, so its own heading still names the section. */
export function useSectionTitleId() {
  return useContext(TitleId);
}

const SPACING = {
  default: "py-16 @4xl:py-20",
  end: "pt-4 pb-16 @4xl:pt-6 @4xl:pb-20",
  ruled: "border-t border-edge py-16 @4xl:py-24",
  /** A section that is one plate of its own, such as the API's night plate, needs little room. */
  tight: "py-4 @4xl:py-8",
} as const;

interface SectionProps {
  id?: string | undefined;
  /**
   * "plate" sets one section apart from its neighbours; "nested" is a step deeper, for the setup
   * steps a visitor follows, whose own steps sit on plate.
   */
  surface?: "canvas" | "plate" | "nested" | undefined;
  /** The place `site_link_followed` reports for links inside, read by the analytics listener. */
  nav?: SiteLinkPlace | undefined;
  /** Leaves the column and gutter to the children, for rows that scroll to the screen's edge. */
  bleed?: boolean | undefined;
  /** Clips what spills sideways, such as a demo's shadows, so the page never scrolls across. */
  clip?: boolean | undefined;
  /**
   * "end" is the closing section, which sits closer to what came before it. "ruled" opens a new
   * part of a reference page, such as an exam's decks, with a rule and more room above.
   */
  spacing?: keyof typeof SPACING | undefined;
  /** A `Section.Header`, or a heading that reads `useSectionTitleId`, then the content. */
  children: ReactNode;
}

/**
 * One band of a marketing page: the gutter, the vertical rhythm and the 1040px column. Every
 * section has a heading, and the section is named by it.
 */
function SectionRoot({
  id,
  surface = "canvas",
  nav,
  bleed,
  clip,
  spacing = "default",
  children,
}: SectionProps) {
  const titleId = useId();
  return (
    <TitleId.Provider value={titleId}>
      <section
        id={id}
        data-nav={nav}
        aria-labelledby={titleId}
        className={clsx(
          "scroll-mt-8",
          !bleed && GUTTER,
          SPACING[spacing],
          clip && "overflow-x-clip",
          surface === "plate" && "bg-plate",
          surface === "nested" && "bg-plate-nested",
        )}
      >
        {bleed ? children : <div className={COLUMN}>{children}</div>}
      </section>
    </TitleId.Provider>
  );
}

const MEASURE = {
  /** Beside a demo, in a two-column section. */
  narrow: "440px",
  /** Above a demo that runs the column's width. */
  wide: "640px",
  /** A heading that takes the whole row, such as one over a bento. */
  full: "100%",
} as const;

interface HeaderProps {
  /** "center" for a section that stands on its own between two demos. */
  align?: "start" | "center" | undefined;
  measure?: keyof typeof MEASURE | undefined;
  /** `Section.Title`, then `Section.Body`, `Section.After` or `Section.Action` as needed. */
  children: ReactNode;
}

/**
 * The heading and the copy under it. A `Section.Action` among the children moves to the end of
 * the heading's row on wide screens, so the copy keeps its measure.
 */
function Header({ align = "start", measure = "wide", children }: HeaderProps) {
  const centered = align === "center";
  return (
    <div
      style={{ "--measure": centered ? "680px" : MEASURE[measure] } as CSSProperties}
      className={clsx(
        "grid grid-cols-[minmax(0,var(--measure))] gap-x-6",
        centered
          ? "justify-center text-center"
          : "@2xl:grid-cols-[minmax(0,var(--measure))_auto] @2xl:justify-between",
      )}
    >
      {children}
    </div>
  );
}

interface TitleProps {
  /** "sm" is for a page about one thing, such as an exam, whose sections are reference, not pitch. */
  size?: "md" | "sm" | undefined;
  /** The longest line in characters, for a heading that should break early. */
  measure?: number | undefined;
  children: ReactNode;
}

/** A section's heading: one size for every pitch, so the page reads as one voice. */
function Title({ size = "md", measure, children }: TitleProps) {
  const id = useSectionTitleId();
  return (
    <h2
      id={id}
      style={measure ? { maxWidth: `${measure}ch` } : undefined}
      className={clsx(
        // The heading row may hold a `Section.Action` in a second column; the copy keeps the first.
        "col-start-1 font-medium tracking-[-0.03em] text-balance text-ink in-[.text-center]:mx-auto",
        size === "md" ? "text-4xl @2xl:text-5xl" : "text-3xl @2xl:text-4xl",
      )}
    >
      {children}
    </h2>
  );
}

/** The paragraph under the heading that says what the section shows. */
function Body({ children }: { children: ReactNode }) {
  return (
    <p className="col-start-1 mt-5 max-w-[60ch] text-md text-pretty text-ink-secondary in-[.text-center]:mx-auto">
      {children}
    </p>
  );
}

/** Marks, links or a button under the copy. */
function After({ children }: { children: ReactNode }) {
  return <div className="col-start-1 mt-8">{children}</div>;
}

/** A link on to the rest, under the copy on a phone and at the end of the heading's row when wide. */
function Action({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 @2xl:col-start-2 @2xl:row-span-3 @2xl:row-start-1 @2xl:mt-0 @2xl:self-end">
      {children}
    </div>
  );
}

export const Section = Object.assign(SectionRoot, { Header, Title, Body, After, Action });
