import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { openLymiUrl, signUpUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import { UKRAINIAN_QUESTIONS } from "./faq";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import { LanguageDecks } from "./LanguageDecks";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { StressPairs } from "./StressPairs";
import { EnrichUkrainian } from "./UkrainianAi";
import {
  UKRAINIAN_CLASS_CARDS,
  UKRAINIAN_EXAMPLES,
  UKRAINIAN_HAND,
  UKRAINIAN_PAIRS,
  UKRAINIAN_PATH,
  UKRAINIAN_VOICE_WORDS,
} from "./ukrainian";
import { VoiceTiles } from "./VoiceTiles";

const Uk = ({ children }: { children: ReactNode }) => <span lang="uk">{children}</span>;

/** The edition a deck row was read in, which rides along so the learner gets the same meanings. */
const editionOf = (deck: PublicDeckSummary) =>
  deck.meaningLanguage === "en" ? undefined : deck.meaningLanguage;

function Hero({ firstDeck }: { firstDeck: PublicDeckSummary | undefined }) {
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
          <p lang="uk" className="mb-5 text-md tracking-[0.06em] text-amber-text">
            Українська
          </p>
          <h1 className="max-w-[480px] text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[3.5rem] @4xl:leading-[1.02]">
            <Trans>The flashcard app that gets Ukrainian.</Trans>
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
            <Trans>
              Keep the words from your lessons and your books in one place. Each card marks its
              stress until you know the word, and a native voice says it.
            </Trans>
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
          <HandExamples front={front} examples={UKRAINIAN_EXAMPLES} lang="uk" />
          <div className="relative">
            <HandOfCards cards={UKRAINIAN_HAND} onFront={setFront} quiet ordered />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The assistant the learner already uses, adding a lesson's words with their stress. */
function OwnAiSection() {
  return (
    <FeatureSection
      id="ai"
      title={<Trans>Bring your own AI.</Trans>}
      body={
        <Trans>
          Connect ChatGPT, Claude or another assistant. Send it today’s notes and it adds the new
          words with their stress. Or ask how many cards are waiting tonight.
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
                <Trans>Add the new words from today’s lesson to my Ukrainian deck.</Trans>
              </>
            ),
          },
          {
            from: "them",
            body: (
              <Added
                card={{
                  label: msg`Українська · new`,
                  term: "по́дорож",
                  language: "uk",
                  meaning: msg`Journey`,
                }}
              >
                <Trans>
                  Added 7 cards with their stress. I skipped <Uk>квито́к</Uk>, which you already
                  have.
                </Trans>
              </Added>
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
  );
}

interface Props {
  /** Every published Ukrainian deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Ukrainian: stress marked until Known, words told apart by stress, and Ukrainian, never Russian. */
export function UkrainianView({ decks, locale }: Props) {
  const openAppUrl = openLymiUrl();
  const steps = UKRAINIAN_PATH.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck
      ? [{ ...step, name: deck.name, count: deck.cardCount, edition: editionOf(deck) }]
      : [];
  });

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="ukrainian" />
        <Hero firstDeck={decks[0]} />
      </header>

      <main>
        <Wide
          title={<Trans>One spelling, two words.</Trans>}
          body={
            <Trans>
              Ukrainian writes <Uk>за́мок</Uk>, a castle, and <Uk>замо́к</Uk>, a lock, the same
              way. Only the stress tells them apart. Lymi keeps each as its own card, with its own
              stress and its own sound.
            </Trans>
          }
        >
          <StressPairs pairs={UKRAINIAN_PAIRS} lang="uk" />
        </Wide>

        <Wide
          title={<Trans>The mark leaves as you learn.</Trans>}
          body={
            <Trans>
              A card shows its stress mark until you know the word, then the word as Ukrainians
              write it. Each time you remember it, Lymi waits a little longer before showing it
              again. Turning the card over always shows the mark.
            </Trans>
          }
        >
          <ReturnLane
            lang="uk"
            term={(known) => <span className="whitespace-nowrap">{known ? "неділя" : "неді́ля"}</span>}
          />
        </Wide>

        <FeatureSection
          title={<Trans>Type one word. Get a whole card.</Trans>}
          body={
            <Trans>
              Add a word from today’s lesson. AI marks its stress, writes an example in Ukrainian
              with every stress marked, and says when a word looks Russian but means something else.
              It fills only what you left empty and marks what it wrote.
            </Trans>
          }
        >
          <EnrichUkrainian />
        </FeatureSection>

        <OwnAiSection />

        {steps.length > 0 && (
          <Wide
            id="start"
            title={<Trans>Start with the alphabet. Keep going.</Trans>}
            body={
              <Trans>
                Free decks from the letters to everyday words. Read the alphabet, then take A1 and
                A2. Each day adds a few new words to your reviews.
              </Trans>
            }
          >
            <DeckPath steps={steps} lang="uk" />
          </Wide>
        )}

        <Wide
          title={<Trans>Hear where the stress falls.</Trans>}
          body={
            <Trans>
              A native Ukrainian AI voice reads every card and stresses the syllable the mark shows,
              so <Uk>за́мок</Uk> and <Uk>замо́к</Uk> sound different. If a card has its own
              recording, that plays instead.
            </Trans>
          }
        >
          <VoiceTiles words={UKRAINIAN_VOICE_WORDS} lang="uk" folder="ukrainian" />
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
          <SharedDeckDemo
            name={msg`Tuesday Ukrainian class`}
            language="uk"
            cards={UKRAINIAN_CLASS_CARDS}
          />
        </FeatureSection>

        {decks.length > 0 && (
          <LanguageDecks
            decks={decks}
            locale={locale}
            shelf="ukrainian"
            body={
              <Trans>
                Free Ukrainian decks with a voice on every card. Add one in a tap. More are on the
                way.
              </Trans>
            }
            all={<Trans>All Ukrainian decks</Trans>}
          />
        )}

        <Questions title={<Trans>Questions before you start.</Trans>} items={UKRAINIAN_QUESTIONS} />

        <SignUpSection title={<Trans>Start with the alphabet tonight.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="ukrainian" />
    </div>
  );
}
