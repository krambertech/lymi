import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { OriginBadge } from "./OriginBadge";

const VISUAL = {
  420: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]",
  460: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]",
  480: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]",
  500: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]",
  540: "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)]",
} as const;

interface HeroProps {
  /** The visual's column at its widest. */
  visualWidth?: keyof typeof VISUAL | undefined;
  /** `Hero.Copy`, then `Hero.Visual`. */
  children: ReactNode;
}

/**
 * The top of a landing page: the copy on the start side and the thing it shows on the end side,
 * stacked on a phone. `CardsHero` and `LanguageHero` are built from these parts.
 */
function HeroRoot({ visualWidth = 460, children }: HeroProps) {
  return (
    <div
      className={clsx(
        "relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 pt-12 pb-20 @2xl:px-10 @4xl:pt-14 @5xl:min-h-[680px] @5xl:gap-14",
        VISUAL[visualWidth],
      )}
    >
      {children}
    </div>
  );
}

/** The badges, headline, lede and actions, in that order. */
function Copy({ children }: { children: ReactNode }) {
  return <div className="min-w-0 max-w-[560px]">{children}</div>;
}

/** What the page shows beside the copy. */
function Visual({ children }: { children: ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}

/** The pills over a headline: what the page always says, then the origin badge when a visitor has one. */
function Badges({ children }: { children?: ReactNode }) {
  if (!children) return <OriginBadge />;
  return (
    // The origin badge brings its own bottom margin; in the row the row owns it.
    <div className="mb-6 flex flex-wrap items-center gap-2 *:mb-0">
      {children}
      <OriginBadge />
    </div>
  );
}

const TITLE = {
  /** A page that sells Lymi as a whole or one way to use it. */
  display: "@4xl:text-[4.25rem] @4xl:leading-[1]",
  /** A page about one thing, such as a language or an assistant, whose headline names it. */
  page: "@4xl:text-[3.75rem] @4xl:leading-[1.02]",
} as const;

interface TitleProps {
  size?: keyof typeof TITLE | undefined;
  /** The headline's language, where it isn't the page's. */
  lang?: string | undefined;
  /** The longest line in characters, for a headline that should break early. */
  measure?: number | undefined;
  /** For a headline that animates its words and names itself in one sentence. */
  "aria-label"?: string | undefined;
  ref?: Ref<HTMLHeadingElement> | undefined;
  children: ReactNode;
}

/** The page's one `h1`. */
function Title({ size = "display", lang, measure, children, ...rest }: TitleProps) {
  return (
    <h1
      {...rest}
      lang={lang}
      style={measure ? { maxWidth: `${measure}ch` } : undefined}
      className={clsx(
        "text-5xl font-medium tracking-[-0.038em] text-balance text-ink in-[.text-center]:mx-auto",
        TITLE[size],
      )}
    >
      {children}
    </h1>
  );
}

/** The sentence under the headline that says what the page offers. */
function Lede({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 max-w-[44ch] text-lg text-pretty text-ink-secondary in-[.text-center]:mx-auto @2xl:text-xl">
      {children}
    </p>
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
  /** A small line or row under the buttons. */
  after?: ReactNode;
}

/**
 * Get started, the page's one primary action, and at most one other. The `hero` place tells
 * analytics which links were followed from the top of the page.
 */
function Actions({ secondary, after }: ActionsProps) {
  const variant = secondary ? (secondary.variant ?? "ghost") : undefined;
  return (
    <div data-nav="hero">
      <div className="mt-8 flex flex-wrap items-center gap-2.5 in-[.text-center]:justify-center">
        <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
          <Trans>Get started</Trans>
        </a>
        {secondary && (
          <a href={secondary.href} className={buttonClass(variant, "lg")}>
            {secondary.label}
            {variant === "ghost" && (
              <ArrowRight aria-hidden="true" data-icon="inline-end" className="rtl:-scale-x-100" />
            )}
          </a>
        )}
      </div>
      {after && <div className="mt-8">{after}</div>}
    </div>
  );
}

export const Hero = Object.assign(HeroRoot, { Copy, Visual, Badges, Title, Lede, Actions });
