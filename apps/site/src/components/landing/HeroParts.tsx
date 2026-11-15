import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { OriginBadge } from "./OriginBadge";

/**
 * "display" is a page that sells Lymi as a whole or one way to use it; "page" is a page about one
 * thing, such as a language or an assistant, whose headline names it and runs longer.
 */
export type HeroSize = "display" | "page";

const TITLE: Record<HeroSize, string> = {
  display: "@4xl:text-[4.25rem] @4xl:leading-[1]",
  page: "@4xl:text-[3.75rem] @4xl:leading-[1.02]",
};

/** The headline's classes on their own, for a headline that animates its own words. */
export function heroTitleClass(size: HeroSize = "display", className?: string) {
  return clsx(
    "text-5xl font-medium tracking-[-0.038em] text-balance text-ink",
    TITLE[size],
    className,
  );
}

interface TitleProps {
  size?: HeroSize | undefined;
  /** The headline's language, where it isn't the page's. */
  lang?: string | undefined;
  /** The longest line in characters of the headline, for one that should break early. */
  measure?: number | undefined;
  children: ReactNode;
}

/** The page's one `h1`. */
export function HeroTitle({ size = "display", lang, measure, children }: TitleProps) {
  return (
    <h1
      lang={lang}
      style={measure ? { maxWidth: `${measure}ch` } : undefined}
      className={heroTitleClass(size)}
    >
      {children}
    </h1>
  );
}

/** The sentence under the headline that says what the page offers. */
export function HeroLede({
  centered,
  children,
}: {
  centered?: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <p
      className={clsx(
        "mt-6 max-w-[44ch] text-lg text-pretty text-ink-secondary @2xl:text-xl",
        centered && "mx-auto",
      )}
    >
      {children}
    </p>
  );
}

/** The pills over a headline: what the page always says, then the origin badge when a visitor has one. */
export function HeroBadges({ children }: { children?: ReactNode }) {
  if (!children) return <OriginBadge />;
  return (
    // The origin badge brings its own bottom margin; in the row the row owns it.
    <div className="mb-6 flex flex-wrap items-center gap-2 *:mb-0">
      {children}
      <OriginBadge />
    </div>
  );
}

export interface HeroLink {
  href: string;
  label: ReactNode;
  /**
   * "ghost" moves within the page or to a page about Lymi; "secondary" starts something, such as
   * adding a deck or connecting an app.
   */
  variant?: "ghost" | "secondary" | undefined;
}

interface ActionsProps {
  /** A quieter second way in, beside Get started. */
  secondary?: HeroLink | false | null | undefined;
  centered?: boolean | undefined;
  /** A small line or row under the buttons. */
  after?: ReactNode;
}

/**
 * Get started, the page's one primary action, and at most one other. The `hero` place tells
 * analytics which links were followed from the top of the page.
 */
export function HeroActions({ secondary, centered, after }: ActionsProps) {
  const ghost = secondary && (secondary.variant ?? "ghost") === "ghost";
  return (
    <div data-nav="hero">
      <div
        className={clsx("mt-8 flex flex-wrap items-center gap-2.5", centered && "justify-center")}
      >
        <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
          <Trans>Get started</Trans>
        </a>
        {secondary && (
          <a href={secondary.href} className={buttonClass(secondary.variant ?? "ghost", "lg")}>
            {secondary.label}
            {ghost && (
              <ArrowRight aria-hidden="true" data-icon="inline-end" className="rtl:-scale-x-100" />
            )}
          </a>
        )}
      </div>
      {after && <div className="mt-8">{after}</div>}
    </div>
  );
}

interface FrameProps {
  /** The badges, headline, lede and actions. */
  copy: ReactNode;
  /** What sits beside the copy on wide screens and under it on a phone. */
  visual: ReactNode;
  /** The visual's column at its widest. */
  visualWidth?: 420 | 460 | 480 | 500 | 540 | undefined;
}

const VISUAL: Record<NonNullable<FrameProps["visualWidth"]>, string> = {
  420: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]",
  460: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]",
  480: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]",
  500: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]",
  540: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)]",
};

/** The top of a landing page: the copy on the start side, the thing it shows on the end side. */
export function HeroFrame({ copy, visual, visualWidth = 460 }: FrameProps) {
  return (
    <div
      className={clsx(
        "relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 pt-12 pb-16 @2xl:px-10 @4xl:pt-14 @5xl:min-h-[680px] @5xl:gap-14",
        VISUAL[visualWidth],
      )}
    >
      <div className="min-w-0 max-w-[560px]">{copy}</div>
      {visual}
    </div>
  );
}
