import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { productUrl } from "../../lib/origins";
import { localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { ApiConnections } from "./ApiConnections";
import { AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { USE_CASE_CARDS } from "./cards";
import { EnrichDemo } from "./EnrichDemo";
import { FeatureSection } from "./FeatureSection";
import { Hero } from "./Hero";
import { JoinSection } from "./JoinSection";
import { ReviewDemo } from "./ReviewDemo";
import { RightMoment } from "./RightMoment";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { type UseCase, UseCases } from "./UseCases";

export const LANDING_TITLE = msg`Lymi · Flashcard app with spaced repetition`;
export const LANDING_BLURB = msg`Lymi is a flashcard app with spaced repetition. Add a word or a term, AI fills in the meaning, and the card comes back before you forget. Free in beta.`;
export const SHARE_IMAGE_ALT = msg`The Lymi lantern and wordmark above the English line “Keep what you learn.”`;

/** The public front door: a hand of real cards to turn over, then how Lymi keeps them. */
export function LandingView({ productOrigin }: { productOrigin?: string | undefined } = {}) {
  const { i18n } = useLingui();
  const openAppUrl = new URL("/", productOrigin ?? productUrl()).toString();
  const useCases: UseCase[] = [
    {
      id: "languages",
      title: <Trans>A new language</Trans>,
      body: <Trans>Words and phrases from lessons, chats and books.</Trans>,
      card: USE_CASE_CARDS.languages,
      link: {
        href: localizedPath("languages", i18n.locale),
        label: <Trans>Lymi for language learning</Trans>,
      },
    },
    {
      id: "courses",
      title: <Trans>A course or lesson</Trans>,
      body: <Trans>What you need to know for a class or an exam.</Trans>,
      card: USE_CASE_CARDS.courses,
    },
    {
      id: "professional-terms",
      title: <Trans>Work</Trans>,
      body: <Trans>Terms from a new job or project.</Trans>,
      card: USE_CASE_CARDS.professionalTerms,
    },
    {
      id: "personal-interests",
      title: <Trans>A hobby</Trans>,
      body: <Trans>Anything you pick up and want to remember.</Trans>,
      card: USE_CASE_CARDS.personalInterests,
    },
  ];

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} />
        <Hero
          title={<Trans>Keep what you learn.</Trans>}
          lede={
            <Trans>
              Save a word, a term or an idea as a flashcard. Lymi shows it again right before you’d
              forget. Free during the beta.
            </Trans>
          }
        />
      </header>

      <main>
        <UseCases title={<Trans>For anything you’re learning.</Trans>} items={useCases} />

        <RightMoment
          title={<Trans>How spaced repetition works.</Trans>}
          body={
            <Trans>
              Remember a card, and Lymi waits longer before showing it again. Forget it, and it
              comes back soon.
            </Trans>
          }
        />

        <FeatureSection
          id="how-it-works"
          title={<Trans>Remember first, then check.</Trans>}
          body={
            <Trans>
              Try to recall the meaning, then show it. Pick how well you knew it. Hard cards come
              back sooner, easy ones later.
            </Trans>
          }
        >
          <ReviewDemo />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Type the term. AI fills in the rest.</Trans>}
          body={
            <Trans>
              AI adds the meaning, an example and the pronunciation. It never changes what you
              typed, and everything it wrote is marked.
            </Trans>
          }
        >
          <EnrichDemo />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Make flashcards in ChatGPT, Claude or Gemini.</Trans>}
          body={
            <Trans>
              Ask your AI assistant to add a card while you chat. It shows up in Lymi, ready to
              review.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat />
        </FeatureSection>

        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Connect your own tools.</Trans>}
          body={
            <Trans>
              Lymi has a public API. Add cards from a phone shortcut or a spreadsheet, or show
              what’s due on your own site.
            </Trans>
          }
          after={
            <div className="flex flex-wrap gap-2">
              <a href="/docs" className={buttonClass("secondary")}>
                <Trans>Read the docs</Trans>
              </a>
              <a href="/docs/api" className={buttonClass("ghost")}>
                <Trans>API reference</Trans>
              </a>
            </div>
          }
        >
          <ApiConnections />
        </FeatureSection>

        <JoinSection title={<Trans>Join the free beta.</Trans>} source="landing" />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="landing" />
    </div>
  );
}
