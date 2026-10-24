import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { LanguagePageName } from "../../lib/language-pages";
import { openLymiUrl, signUpUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import type { Question } from "./faq";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import type { HandCard } from "./hand-cards";
import type { PathStep, VoiceWord } from "./japanese";
import { LanguageDecks } from "./LanguageDecks";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { type StressPair, StressPairs } from "./StressPairs";
import { VoiceTiles } from "./VoiceTiles";

/** What a language on the marks-in-place engine puts on its page: its words, and the copy that names it. */
export interface StressPage {
  page: LanguagePageName;
  lang: string;
  /** The language's own name, untranslated, over the headline. */
  kicker: string;
  hand: HandCard[];
  examples: Record<string, string[]>;
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

/** The edition a deck row was read in, which rides along so the learner gets the same meanings. */
const editionOf = (deck: PublicDeckSummary) =>
  deck.meaningLanguage === "en" ? undefined : deck.meaningLanguage;

function Hero({ page, firstDeck }: { page: StressPage; firstDeck: PublicDeckSummary | undefined }) {
  const [front, setFront] = useState<string>();
  return (
    <div className="relative overflow-x-clip">
      {/* The lantern's light, pooled behind the hand. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_48%_62%_at_74%_56%,var(--color-pool),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 pt-12 pb-20 @2xl:px-10 @4xl:pt-14 @5xl:min-h-[700px] @5xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)] @5xl:gap-14">
        <div className="min-w-0 max-w-[560px]">
          <p lang={page.lang} className="mb-5 text-md tracking-[0.06em] text-amber-text">
            {page.kicker}
          </p>
          <h1 className="max-w-[480px] text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[3.5rem] @4xl:leading-[1.02]">
            {page.copy.headline}
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
            {page.copy.lede}
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
              <Trans>Get started</Trans>
            </a>
            {firstDeck && (
              <a
                href={addUrl(firstDeck.slug, editionOf(firstDeck))}
                className={buttonClass("secondary", "lg")}
              >
                <Trans>Start with the alphabet</Trans>
              </a>
            )}
          </div>
        </div>
        <div className="relative pt-20 pb-4 @5xl:py-20">
          <HandExamples front={front} examples={page.examples} lang={page.lang} />
          <div className="relative">
            <HandOfCards cards={page.hand} onFront={setFront} quiet ordered />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  page: StressPage;
  /** Every published deck in the language for this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** A page for a language whose cards mark their stress until Known: Russian and Ukrainian. */
export function StressView({ page, decks, locale }: Props) {
  const openAppUrl = openLymiUrl();
  const steps = page.path.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck
      ? [{ ...step, name: deck.name, count: deck.cardCount, edition: editionOf(deck) }]
      : [];
  });

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current={page.page} />
        <Hero page={page} firstDeck={decks[0]} />
      </header>

      <main>
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

        <FeatureSection
          title={<Trans>Type one word. Get a whole card.</Trans>}
          body={page.copy.enrich}
        >
          {page.enrich}
        </FeatureSection>

        <FeatureSection
          id="ai"
          title={<Trans>Bring your own AI.</Trans>}
          body={
            <Trans>
              Connect ChatGPT, Claude or another assistant. Send it today’s notes and it adds the
              new words with their stress. Or ask how many cards are waiting tonight.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat
            conversation={[
              {
                from: "you",
                body: (
                  <>
                    <Attachment name="lesson-4-notes.pdf" kind={<Trans>PDF</Trans>} />
                    {page.copy.ask}
                  </>
                ),
              },
              {
                from: "them",
                body: (
                  <Added card={{ ...page.added, language: page.lang }}>{page.copy.skipped}</Added>
                ),
              },
              { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
              {
                from: "them",
                body: <Trans>Twenty-two. The new words will come up a few at a time.</Trans>,
              },
            ]}
          />
        </FeatureSection>

        {steps.length > 0 && (
          <Wide
            id="start"
            title={<Trans>Start with the alphabet. Keep going.</Trans>}
            body={page.copy.start}
          >
            <DeckPath steps={steps} lang={page.lang} />
          </Wide>
        )}

        <Wide title={<Trans>Hear where the stress falls.</Trans>} body={page.copy.voice}>
          <VoiceTiles words={page.voice} lang={page.lang} folder={page.page} />
        </Wide>

        <FeatureSection
          demoFirst
          title={<Trans>Learning is more fun together.</Trans>}
          body={
            <Trans>
              Study a deck with your class, your tutor or a friend. One of you adds the words after
              each lesson and shares a link, and everyone reviews on their own schedule.
            </Trans>
          }
          after={
            <a
              href={localizedPath("teachers", locale)}
              className="inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
            >
              <Trans>Lymi for teachers</Trans>
              <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
            </a>
          }
        >
          <SharedDeckDemo name={page.className} language={page.lang} cards={page.classCards} />
        </FeatureSection>

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
      </main>

      <SiteFooter openAppUrl={openAppUrl} page={page.page} />
    </div>
  );
}
