import { Trans } from "@lingui/react/macro";
import { BriefcaseBusiness, GraduationCap, Languages, Telescope } from "lucide-react";
import { productUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { highlight } from "../docs/highlight";
import { Lockup } from "../Logo";
import { AssistantChat } from "./AssistantChat";
import { EnrichDemo } from "./EnrichDemo";
import { HandOfCards } from "./HandOfCards";
import { JoinBeta } from "./JoinBeta";
import { ReviewDemo } from "./ReviewDemo";
import { WhyItWorks } from "./WhyItWorks";

export const LANDING_TITLE = "Lymi · Keep what you learn";
export const LANDING_BLURB =
  "Save a Finnish verb, a chess term, or a line from a paper. Lymi adds what's missing, says it " +
  "aloud, and brings the card back right before you'd forget. Free during the private beta.";

const REQUEST = `{
  "deckId": "0mtoyiymqa34h1xeaqo",
  "term": "hysteresis",
  "source": "paper"
}`;

const RESPONSE = `{
  "status": "added",
  "card": {
    "term": "hysteresis",
    "createdBy": "api"
  }
}`;

const USE_CASES = [
  {
    id: "languages",
    icon: Languages,
    title: "A new language",
    body: "Words and phrases from lessons, conversations, and reading.",
  },
  {
    id: "courses",
    icon: GraduationCap,
    title: "A course or lesson",
    body: "Ideas from classes, workshops, and exam preparation.",
  },
  {
    id: "professional-terms",
    icon: BriefcaseBusiness,
    title: "A professional field",
    body: "Terms and concepts from a new role, project, or technical domain.",
  },
  {
    id: "personal-interests",
    icon: Telescope,
    title: "A personal interest",
    body: "Things worth keeping from books, hobbies, and everyday curiosity.",
  },
] as const;

/** The public front door: a hand of real cards to turn over, then how Lymi keeps them. */
export function LandingView({ productOrigin }: { productOrigin?: string | undefined } = {}) {
  const openAppUrl = new URL("/", productOrigin ?? productUrl()).toString();

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1120px] items-center justify-between px-5 pt-5 @2xl:px-10 @2xl:pt-7"
        >
          <a href="/" aria-label="Lymi home" className="rounded-xs py-1.5">
            <Lockup size={30} flicker glow />
          </a>
          <div className="flex items-center gap-1">
            <a href="/docs" className={buttonClass("ghost", "sm")}>
              Docs
            </a>
            <span className="hidden @2xl:contents">
              <a href={openAppUrl} className={buttonClass("ghost", "sm")}>
                Open app
              </a>
            </span>
            <a href="#join" className={buttonClass("secondary", "sm")}>
              Request access
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
              For whatever you’re learning.
            </h2>

            <ul className="mt-12 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-4 @4xl:gap-4">
              {USE_CASES.map((useCase) => (
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
                The right moment matters.
              </h2>
              <p className="mt-5 text-md text-text-2">
                Memory fades. A well-timed recall strengthens it and lets the next gap grow. Lymi
                schedules with FSRS, then adapts to every grade.
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
                Recall first. Reveal second.
              </h2>
              <p className="mt-5 text-md text-text-2">
                Look for the meaning before Lymi shows it. Then grade the recall. That one choice
                sets the next review: difficult cards return sooner, easy ones wait.
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
                Start with the term. Keep control of the rest.
              </h2>
              <p className="mt-5 text-md text-text-2">
                Add what you heard in the lesson. Lymi can enrich the missing meaning, example,
                pronunciation, and language without overwriting anything you entered.
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
                Stay in the conversation.
              </h2>
              <p className="mt-5 text-md text-text-2">
                When a term appears while you are talking with an assistant, ask it to add the card
                there and then. The conversation continues; the card waits in Lymi.
              </p>
              <p className="mt-5 text-sm text-muted">
                Works with Claude, ChatGPT, and other assistants that support MCP.
              </p>
              <a
                href="/docs/mcp"
                className="mt-6 inline-block rounded-xs py-1 text-sm text-amber-text underline underline-offset-4"
              >
                Connect an assistant
              </a>
            </div>
            <div className="min-w-0 @4xl:pl-6">
              <AssistantChat />
            </div>
          </div>
        </section>

        <section className="flex min-h-[680px] items-center border-b border-edge bg-plate px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto w-full max-w-[1040px]">
            <div className="grid items-end gap-8 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:gap-20">
              <h2 className="max-w-[12ch] text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                One endpoint. Everything else.
              </h2>
              <div className="max-w-[520px] @4xl:justify-self-end">
                <p className="text-md text-text-2">
                  Send a card from a reading list, notes app, or script. Include what you know; Lymi
                  keeps the source and lets you complete the card later.
                </p>
                <p className="mt-3 text-sm text-muted">
                  Each key is read-only or read-and-write, and API-created cards stay identifiable.
                </p>
                <a
                  href="/docs/api"
                  className="mt-6 inline-block rounded-xs py-1 text-sm text-amber-text underline underline-offset-4"
                >
                  Explore the API reference
                </a>
              </div>
            </div>

            <div className="mt-12 min-w-0 overflow-hidden rounded-xl bg-canvas edge">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-6 py-5 @2xl:px-8">
                <p className="text-xs text-muted">Create a card</p>
                <p className="flex items-center gap-2 font-mono text-xs text-text-2">
                  <span className="rounded-xs bg-plate-2 px-1.5 py-0.5 font-medium text-text">
                    POST
                  </span>
                  /api/cards
                </p>
              </div>
              <div className="grid @3xl:grid-cols-[1.08fr_0.92fr]">
                <pre className="doc-code overflow-x-auto p-6 @2xl:p-8">
                  <code>{highlight(REQUEST, "json")}</code>
                </pre>
                <div className="border-t border-edge p-6 @2xl:p-8 @3xl:border-t-0 @3xl:border-l">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">Response</p>
                    <p className="font-mono text-xs text-good">201 Created</p>
                  </div>
                  <pre className="doc-code overflow-x-auto pt-5">
                    <code>{highlight(RESPONSE, "json")}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="join" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] gap-10 rounded-2xl bg-plate-2 p-7 edge-inset @2xl:p-12 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:items-center @4xl:gap-20 @4xl:p-16">
            <div>
              <h2 className="max-w-[12ch] text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                Bring your next lesson with you.
              </h2>
              <p className="mt-5 max-w-[44ch] text-md text-text-2">
                <Trans>The private beta is free. If we can invite you, we’ll email you.</Trans>
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
              Docs
            </a>
            <a href="/docs/api" className="rounded-xs hoverable:hover:text-text">
              API
            </a>
            <a href="/docs/mcp" className="rounded-xs hoverable:hover:text-text">
              MCP
            </a>
            <a href={openAppUrl} className="rounded-xs hoverable:hover:text-text">
              Open app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
