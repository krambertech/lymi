import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { explorePath } from "../../lib/explore";
import { localizedPath } from "../../lib/routes";
import { AiGallery } from "./AiGallery";
import { ApiSection } from "./ApiSection";
import { WorksWith } from "./AssistantMarks";
import { AssistantSection } from "./AssistantSection";
import { USE_CASE_CARDS } from "./cards";
import { FeatureBento } from "./FeatureBento";
import { Wide } from "./FeatureSection";
import { FreeDecks } from "./FreeDecks";
import { Furigana } from "./Furigana";
import { Hero } from "./Hero";
import { LandingLayout } from "./LandingLayout";
import { ReturnLane } from "./ReturnLane";
import { SignUpSection } from "./SignUpSection";
import { type UseCase, UseCases } from "./UseCases";

export const LANDING_TITLE = msg`Lymi · Flashcard app with spaced repetition`;
export const LANDING_BLURB = msg`Lymi is a flashcard app with spaced repetition. Add a word or a term, AI fills in the meaning, and the card comes back before you forget. Free to use.`;
export const SHARE_IMAGE_ALT = msg`The Lymi lantern and wordmark above the English line “Keep what you learn.”`;

/** The public front door: a hand of real cards to turn over, then how Lymi keeps them. */
export function LandingView() {
  const { i18n } = useLingui();
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
      link: {
        href: localizedPath("exams", i18n.locale),
        label: <Trans>Citizenship and driving tests</Trans>,
      },
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
    <LandingLayout
      page="landing"
      hero={
        <Hero
          title={<Trans>Flashcards that stick.</Trans>}
          lede={
            <Trans>
              Make a card in seconds and review it in Lymi. Spaced repetition brings it back right
              before you’d forget, until you remember it for good.
            </Trans>
          }
          secondary={{
            href: explorePath(i18n.locale),
            label: <Trans>Browse free decks</Trans>,
          }}
          after={<WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />}
        />
      }
    >
      <UseCases title={<Trans>For anything you’re learning.</Trans>} items={useCases} />

      <Wide
        title={<Trans>Review less, remember longer.</Trans>}
        body={
          <Trans>
            Each time you remember a card, Lymi waits longer before showing it again. Forget it, and
            it comes back soon. Once you know a word, Lymi hides its reading too.
          </Trans>
        }
      >
        <ReturnLane
          lang="ja"
          term={(known) => <Furigana term="花見" reading="はなみ" lang="ja" hidden={known} />}
        />
      </Wide>

      <AiGallery />
      <AssistantSection />
      <FeatureBento />
      <ApiSection />
      <FreeDecks />
      <SignUpSection title={<Trans>Make your first card tonight.</Trans>} />
    </LandingLayout>
  );
}
