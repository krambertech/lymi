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

export const LANDING_TITLE = msg`Lymi · Keep what you learn`;
export const LANDING_BLURB = msg`Save a Finnish verb, a chess term, or a line from a paper. Lymi fills in what’s missing, says it aloud, and brings the card back before you forget. Free during the private beta.`;
export const SHARE_IMAGE_ALT = msg`The Lymi lantern and wordmark above the English line “Keep what you learn.”`;

/** The public front door: a hand of real cards to turn over, then how Lymi keeps them. */
export function LandingView({ productOrigin }: { productOrigin?: string | undefined } = {}) {
  const { i18n } = useLingui();
  const openAppUrl = new URL("/", productOrigin ?? productUrl()).toString();
  const useCases: UseCase[] = [
    {
      id: "languages",
      title: <Trans>A new language</Trans>,
      body: <Trans>Words and phrases from lessons, conversations, and reading.</Trans>,
      card: USE_CASE_CARDS.languages,
      link: {
        href: localizedPath("languages", i18n.locale),
        label: <Trans>Lymi for language learning</Trans>,
      },
    },
    {
      id: "courses",
      title: <Trans>A course or lesson</Trans>,
      body: <Trans>Ideas from classes, workshops, and exam preparation.</Trans>,
      card: USE_CASE_CARDS.courses,
    },
    {
      id: "professional-terms",
      title: <Trans>A professional field</Trans>,
      body: <Trans>Terms and concepts from a new role, project, or technical field.</Trans>,
      card: USE_CASE_CARDS.professionalTerms,
    },
    {
      id: "personal-interests",
      title: <Trans>A personal interest</Trans>,
      body: <Trans>Things worth keeping from books, hobbies, and everyday curiosity.</Trans>,
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
              A Finnish verb, a chess term, a line from a physics paper. Save it once, hear how it’s
              said, and Lymi brings it back right before you’d forget.
            </Trans>
          }
        />
      </header>

      <main>
        <UseCases title={<Trans>For whatever you’re learning.</Trans>} items={useCases} />

        <RightMoment
          title={<Trans>The right moment matters.</Trans>}
          body={
            <Trans>
              Memory fades. Recalling something at the right time strengthens it and lets the next
              gap grow. Lymi uses each grade to decide when the card returns.
            </Trans>
          }
        />

        <FeatureSection
          id="how-it-works"
          title={<Trans>Recall first. Reveal second.</Trans>}
          body={
            <Trans>
              Try to recall the meaning before Lymi shows it. Then grade how well you remembered.
              Difficult cards return sooner; easy ones wait.
            </Trans>
          }
        >
          <ReviewDemo />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Start with the term. Keep control of the rest.</Trans>}
          body={
            <Trans>
              Add what you heard in the lesson. Lymi can fill in the missing meaning, example,
              pronunciation, and language without overwriting anything you entered.
            </Trans>
          }
        >
          <EnrichDemo />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Stay in the conversation.</Trans>}
          body={
            <Trans>
              When a term comes up while you’re talking with an assistant, ask it to add the card.
              Keep talking; the card will be waiting in Lymi.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat />
        </FeatureSection>

        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Plug Lymi into anything.</Trans>}
          body={
            <Trans>
              Lymi has a public API, so the apps and tools you already use can work with your cards.
              Add a word from a shortcut on your phone, bring in a lesson from a spreadsheet, or
              show what’s due on your own site.
            </Trans>
          }
          after={
            <div className="flex flex-wrap gap-2">
              <a href="/docs" className={buttonClass("secondary")}>
                <Trans>See how it works</Trans>
              </a>
              <a href="/docs/api" className={buttonClass("ghost")}>
                <Trans>API reference</Trans>
              </a>
            </div>
          }
        >
          <ApiConnections />
        </FeatureSection>

        <JoinSection title={<Trans>Keep the next thing you learn.</Trans>} source="landing" />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="landing" />
    </div>
  );
}
