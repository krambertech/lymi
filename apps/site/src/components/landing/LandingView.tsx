import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { BriefcaseBusiness, GraduationCap, Languages, Telescope } from "lucide-react";
import { productUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { LanguageLinks } from "../LanguageLinks";
import { Lockup } from "../Logo";
import { ApiConnections } from "./ApiConnections";
import { AssistantChat } from "./AssistantChat";
import { AssistantMarks } from "./AssistantMarks";
import { EnrichDemo } from "./EnrichDemo";
import { HandOfCards } from "./HandOfCards";
import { JoinBeta } from "./JoinBeta";
import { ReviewDemo } from "./ReviewDemo";
import { WhyItWorks } from "./WhyItWorks";

export const LANDING_TITLE = msg`Lymi · Keep what you learn`;
export const LANDING_BLURB = msg`Save a Finnish verb, a chess term, or a line from a paper. Lymi fills in what’s missing, says it aloud, and brings the card back before you forget. Free during the private beta.`;
export const SHARE_IMAGE_ALT = msg`The Lymi lantern and wordmark above the English line “Keep what you learn.”`;

/** The public front door: a hand of real cards to turn over, then how Lymi keeps them. */
export function LandingView({ productOrigin }: { productOrigin?: string | undefined } = {}) {
  const { t, i18n } = useLingui();
  const openAppUrl = new URL("/", productOrigin ?? productUrl()).toString();
  const homeHref = i18n.locale === "en" ? "/" : `/${i18n.locale}/`;
  const useCases = [
    {
      id: "languages",
      icon: Languages,
      title: t`A new language`,
      body: t`Words and phrases from lessons, conversations, and reading.`,
    },
    {
      id: "courses",
      icon: GraduationCap,
      title: t`A course or lesson`,
      body: t`Ideas from classes, workshops, and exam preparation.`,
    },
    {
      id: "professional-terms",
      icon: BriefcaseBusiness,
      title: t`A professional field`,
      body: t`Terms and concepts from a new role, project, or technical field.`,
    },
    {
      id: "personal-interests",
      icon: Telescope,
      title: t`A personal interest`,
      body: t`Things worth keeping from books, hobbies, and everyday curiosity.`,
    },
  ] as const;

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <nav
          aria-label={t`Main navigation`}
          className="mx-auto flex max-w-[1120px] items-center justify-between px-5 pt-5 @2xl:px-10 @2xl:pt-7"
        >
          <a href={homeHref} aria-label={t`Lymi home`} className="rounded-xs py-1.5">
            <Lockup size={30} flicker glow />
          </a>
          <div className="flex items-center gap-1">
            <a href="/docs" className={buttonClass("ghost", "sm")}>
              <Trans>Docs</Trans>
            </a>
            <span className="hidden @2xl:contents">
              <a href={openAppUrl} className={buttonClass("ghost", "sm")}>
                <Trans>Open app</Trans>
              </a>
            </span>
            <a href="#join" className={buttonClass("secondary", "sm")}>
              <Trans>Request access</Trans>
            </a>
          </div>
        </nav>

        <div className="mx-auto grid max-w-[1120px] items-center gap-8 px-5 pt-12 pb-16 @2xl:px-10 @4xl:min-h-[700px] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)] @4xl:gap-14 @4xl:pt-14">
          <div className="min-w-0 max-w-[540px]">
            <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.25rem] @4xl:leading-[0.98]">
              <Trans>Keep what you learn.</Trans>
            </h1>
            <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
              <Trans>
                A Finnish verb, a chess term, a line from a physics paper. Save it once, hear how
                it’s said, and Lymi brings it back right before you’d forget.
              </Trans>
            </p>
            <div className="mt-8">
              <a href="#join" className={buttonClass("primary", "lg")}>
                <Trans>Request access</Trans>
              </a>
            </div>
            <p className="mt-3.5 text-sm text-muted">
              <Trans>Free during the private beta.</Trans>
            </p>
          </div>

          <HandOfCards />
        </div>
      </header>

      <main>
        <section
          aria-labelledby="use-cases-title"
          className="border-y border-edge bg-plate px-5 py-20 @2xl:px-10 @4xl:py-28"
        >
          <div className="mx-auto max-w-[1040px]">
            <h2
              id="use-cases-title"
              className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:whitespace-nowrap @2xl:text-5xl"
            >
              <Trans>For whatever you’re learning.</Trans>
            </h2>

            <ul className="mt-12 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-4 @4xl:gap-4">
              {useCases.map((useCase) => (
                <li
                  id={`use-case-${useCase.id}`}
                  key={useCase.id}
                  className="edge rounded-lg bg-canvas px-6 py-6 @4xl:min-h-[180px] @4xl:py-7"
                >
                  <useCase.icon
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="size-6 text-text-2"
                  />
                  <h3 className="mt-5 text-lg font-medium tracking-[-0.02em] text-text">
                    {useCase.title}
                  </h3>
                  <p className="mt-3 max-w-[28ch] text-sm text-muted">{useCase.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto max-w-[1040px]">
            <div className="mx-auto max-w-[680px] text-center">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                <Trans>The right moment matters.</Trans>
              </h2>
              <p className="mt-5 text-md text-text-2">
                <Trans>
                  Memory fades. Recalling something at the right time strengthens it and lets the
                  next gap grow. Lymi uses each grade to decide when the card returns.
                </Trans>
              </p>
            </div>
            <div className="mt-14">
              <WhyItWorks />
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-8 border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
        >
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] @4xl:gap-20">
            <div className="max-w-[430px]">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                <Trans>Recall first. Reveal second.</Trans>
              </h2>
              <p className="mt-5 text-md text-text-2">
                <Trans>
                  Try to recall the meaning before Lymi shows it. Then grade how well you
                  remembered. Difficult cards return sooner; easy ones wait.
                </Trans>
              </p>
            </div>
            <div className="min-w-0 py-4 @4xl:pl-6">
              <ReviewDemo />
            </div>
          </div>
        </section>

        <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] @4xl:gap-20">
            <div className="order-1 max-w-[430px] @4xl:order-2 @4xl:justify-self-end">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                <Trans>Start with the term. Keep control of the rest.</Trans>
              </h2>
              <p className="mt-5 text-md text-text-2">
                <Trans>
                  Add what you heard in the lesson. Lymi can fill in the missing meaning, example,
                  pronunciation, and language without overwriting anything you entered.
                </Trans>
              </p>
            </div>
            <div className="order-2 min-w-0 py-4 @4xl:order-1 @4xl:pr-6">
              <EnrichDemo />
            </div>
          </div>
        </section>

        <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[0.82fr_1.18fr] @4xl:gap-20">
            <div className="max-w-[420px]">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                <Trans>Stay in the conversation.</Trans>
              </h2>
              <p className="mt-5 text-md text-text-2">
                <Trans>
                  When a term comes up while you’re talking with an assistant, ask it to add the
                  card. Keep talking; the card will be waiting in Lymi.
                </Trans>
              </p>
              <div className="mt-8">
                <AssistantMarks />
              </div>
            </div>
            <div className="min-w-0 @4xl:pl-6">
              <AssistantChat />
            </div>
          </div>
        </section>

        <section className="border-b border-edge bg-plate px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-2 @4xl:gap-20">
            <div className="order-1 max-w-[480px] @4xl:order-2 @4xl:justify-self-end">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl">
                <Trans>Plug Lymi into anything.</Trans>
              </h2>
              <p className="mt-5 text-md text-text-2">
                <Trans>
                  Lymi has a public API, so the apps and tools you already use can work with your
                  cards. Add a word from a shortcut on your phone, bring in a lesson from a
                  spreadsheet, or show what’s due on your own site.
                </Trans>
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <a href="/docs" className={buttonClass("secondary")}>
                  <Trans>See how it works</Trans>
                </a>
                <a href="/docs/api" className={buttonClass("ghost")}>
                  <Trans>API reference</Trans>
                </a>
              </div>
            </div>
            <div className="order-2 min-w-0 py-4 @4xl:order-1">
              <ApiConnections />
            </div>
          </div>
        </section>

        <section id="join" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] gap-10 rounded-2xl bg-plate-2 p-7 edge-inset @2xl:p-12 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:items-center @4xl:gap-20 @4xl:p-16">
            <div>
              <h2 className="max-w-[12ch] text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                <Trans>Keep the next thing you learn.</Trans>
              </h2>
              <p className="mt-5 max-w-[44ch] text-md text-text-2">
                <Trans>
                  The private beta is free. Leave your email and we’ll write when a place opens.
                </Trans>
              </p>
            </div>
            <JoinBeta />
          </div>
        </section>
      </main>

      <footer className="border-t border-edge px-5 py-10 @2xl:px-10">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-5">
          <Lockup size={18} className="text-muted" />
          <div className="flex flex-wrap gap-5 text-sm text-muted">
            <a href="/docs" className="rounded-xs hoverable:hover:text-text">
              <Trans>Docs</Trans>
            </a>
            <a href="/docs/api" className="rounded-xs hoverable:hover:text-text">
              API
            </a>
            <a href="/docs/mcp" className="rounded-xs hoverable:hover:text-text">
              MCP
            </a>
            <a href="/privacy" className="rounded-xs hoverable:hover:text-text">
              <Trans>Privacy</Trans>
            </a>
            <a href="/terms" className="rounded-xs hoverable:hover:text-text">
              <Trans>Terms</Trans>
            </a>
            <a href="/support" className="rounded-xs hoverable:hover:text-text">
              <Trans>Support</Trans>
            </a>
            <a href={openAppUrl} className="rounded-xs hoverable:hover:text-text">
              <Trans>Open app</Trans>
            </a>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-[1040px] text-xs text-muted">
          <Trans>Lymi is provided by Krambertech OÜ.</Trans>
        </p>
        <LanguageLinks page="landing" />
      </footer>
    </div>
  );
}
