import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import type { LanguagePageName } from "../../lib/language-pages";
import type { Locale } from "../../lib/routes";
import { Attachment } from "./AssistantChat";
import { Wide } from "./FeatureSection";
import type { Question } from "./faq";
import type { Example } from "./HandExamples";
import type { HandCard } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";
import { LandingLayout } from "./LandingLayout";
import { LanguageDecks } from "./LanguageDecks";
import {
  EnrichSection,
  LanguageHero,
  LanguageName,
  OwnAiSection,
  StartSection,
  TogetherSection,
  VoiceSection,
} from "./LanguageSections";
import { addDeckUrl, pathSteps } from "./language-decks";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SignUpSection } from "./SignUpSection";
import { type StressPair, StressPairs } from "./StressPairs";

/** What a language on the marks-in-place engine puts on its page: its words, and the copy that names it. */
export interface StressPage {
  page: LanguagePageName;
  lang: string;
  /** The language's own name, untranslated, over the headline. */
  kicker: string;
  hand: HandCard[];
  examples: Record<string, Example[]>;
  pairs: StressPair[];
  /** One word, plain and marked, for the card that comes back over seven weeks. */
  returning: { plain: string; marked: string };
  path: PathStep[];
  voice: VoiceWord[];
  classCards: { term: string; meaning: MessageDescriptor }[];
  className: MessageDescriptor;
  questions: Question[];
  /** The card an assistant adds from a lesson's notes. */
  added: { label: MessageDescriptor; term: string; meaning: MessageDescriptor };
  enrich: ReactNode;
  copy: {
    headline: ReactNode;
    lede: ReactNode;
    pairs: ReactNode;
    returning: ReactNode;
    enrich: ReactNode;
    ask: ReactNode;
    skipped: ReactNode;
    start: ReactNode;
    voice: ReactNode;
    decks: ReactNode;
    allDecks: ReactNode;
  };
}

interface Props {
  page: StressPage;
  /** Every published deck in the language for this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** A page for a language whose cards mark their stress until Known: Russian and Ukrainian. */
export function StressView({ page, decks, locale }: Props) {
  const firstDeck = decks[0];
  const steps = pathSteps(page.path, decks);

  return (
    <LandingLayout
      page={page.page}
      hero={
        <LanguageHero
          kicker={<LanguageName lang={page.lang}>{page.kicker}</LanguageName>}
          title={page.copy.headline}
          lede={page.copy.lede}
          start={
            firstDeck && {
              href: addDeckUrl(firstDeck),
              label: <Trans>Start with the alphabet</Trans>,
            }
          }
          cards={page.hand}
          examples={page.examples}
          lang={page.lang}
        />
      }
    >
      <Wide title={<Trans>One spelling, two words.</Trans>} body={page.copy.pairs}>
        <StressPairs pairs={page.pairs} lang={page.lang} />
      </Wide>

      <Wide title={<Trans>The mark leaves as you learn.</Trans>} body={page.copy.returning}>
        <ReturnLane
          lang={page.lang}
          term={(known) => (
            <span className="whitespace-nowrap">
              {known ? page.returning.plain : page.returning.marked}
            </span>
          )}
        />
      </Wide>

      <EnrichSection body={page.copy.enrich}>{page.enrich}</EnrichSection>

      <OwnAiSection
        body={
          <Trans>
            Connect ChatGPT, Claude or another assistant. Send it today’s notes and it adds the new
            words with their stress. Or ask how many cards are waiting tonight.
          </Trans>
        }
        attachment={<Attachment name="lesson-4-notes.pdf" kind={<Trans>PDF</Trans>} />}
        ask={page.copy.ask}
        card={{ ...page.added, language: page.lang }}
        added={page.copy.skipped}
        waiting={<Trans>Twenty-two. The new words will come up a few at a time.</Trans>}
      />

      {steps.length > 0 && (
        <StartSection
          title={<Trans>Start with the alphabet. Keep going.</Trans>}
          body={page.copy.start}
          steps={steps}
          lang={page.lang}
        />
      )}

      <VoiceSection
        title={<Trans>Hear where the stress falls.</Trans>}
        body={page.copy.voice}
        words={page.voice}
        lang={page.lang}
        folder={page.page}
      />

      <TogetherSection name={page.className} language={page.lang} cards={page.classCards} />

      {decks.length > 0 && (
        <LanguageDecks
          decks={decks}
          locale={locale}
          shelf={page.page}
          body={page.copy.decks}
          all={page.copy.allDecks}
        />
      )}

      <Questions title={<Trans>Questions before you start.</Trans>} items={page.questions} />

      <SignUpSection title={<Trans>Start with the alphabet tonight.</Trans>} />
    </LandingLayout>
  );
}
