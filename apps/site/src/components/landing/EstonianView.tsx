import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { openLymiUrl, signUpUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { DeckPath } from "./DeckPath";
import { EnrichEstonian, NotesToCardsEstonian } from "./EstonianAi";
import { EstonianBento } from "./EstonianBento";
import { EstonianForms } from "./EstonianForms";
import {
  ESTONIAN_CLASS_CARDS,
  ESTONIAN_EXAMPLES,
  ESTONIAN_PAGE_HAND,
  ESTONIAN_PATH,
  ESTONIAN_VOICE_WORDS,
} from "./estonian";
import { FeatureSection, Wide } from "./FeatureSection";
import { ESTONIAN_QUESTIONS } from "./faq";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import { LanguageDecks } from "./LanguageDecks";
import { ESTONIAN } from "./language-cards";
import { EstonianStartup } from "./OriginBadge";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { VoiceTiles } from "./VoiceTiles";

export const ESTONIAN_TITLE = msg`Learn Estonian vocabulary with flashcards · Lymi`;
export const ESTONIAN_BLURB = msg`A free flashcard app for Estonian, made by an Estonian startup. Every card is read by a native Estonian voice, every word comes with its three forms, and free decks take you from tere to the 1000 most common words.`;

const FIRST_DECK = "everyday-estonian";

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
          <EstonianStartup />
          <h1 className="max-w-[480px] text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[3.5rem] @4xl:leading-[1.02]">
            <Trans>The flashcard app that speaks Estonian.</Trans>
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
            <Trans>
              Learn Estonian words in a few minutes a day, from <span lang="et">tere</span> to the
              words from this week’s class. Hear every card in a native Estonian voice, and learn
              each word with its three forms.
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
                <Trans>Start with everyday phrases</Trans>
              </a>
            )}
          </div>
        </div>
        <div className="relative pt-20 pb-4 @5xl:py-20">
          <HandExamples front={front} examples={ESTONIAN_EXAMPLES} lang="et" />
          <div className="relative">
            <HandOfCards cards={ESTONIAN_PAGE_HAND} onFront={setFront} quiet ordered />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The assistant the learner already uses, with a word for those who'd rather build. */
function OwnAiSection() {
  return (
    <FeatureSection
      id="ai"
      title={<Trans>Bring your own AI.</Trans>}
      body={
        <Trans>
          Connect Claude, ChatGPT or another assistant once. Send it a photo of today’s notes and it
          adds the new words, or ask what’s waiting for you tonight.
        </Trans>
      }
      after={
        <>
          <AssistantMarksWithMore />
          <p className="mt-8 text-md text-pretty text-text-2">
            <Trans>
              Building something of your own? Lymi has a full API.{" "}
              <a
                href="/docs/api"
                className="font-medium text-text underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-text"
              >
                Read the API docs
              </a>
            </Trans>
          </p>
        </>
      }
    >
      <AssistantChat
        conversation={[
          {
            from: "you",
            body: (
              <>
                <Attachment name="IMG_3187.jpg" kind={<Trans>Photo</Trans>} photo />
                <Trans>Notes from today’s Estonian class. Add the new words to my deck.</Trans>
              </>
            ),
          },
          {
            from: "them",
            body: (
              <Added
                card={{
                  label: msg`Eesti · new`,
                  term: "broneerima",
                  language: "et",
                  meaning: msg`To book; to reserve`,
                }}
              >
                <Trans>
                  Added 7 cards to Estonian. I skipped <span lang="et">palun</span>, which you
                  already have.
                </Trans>
              </Added>
            ),
          },
          { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
          {
            from: "them",
            body: <Trans>Fifteen. The new words will come up a few at a time.</Trans>,
          },
        ]}
      />
    </FeatureSection>
  );
}

interface Props {
  /** Every published Estonian deck in this locale, beginner decks first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Estonian, from their first tere to the words from class. */
export function EstonianView({ decks, locale }: Props) {
  const openAppUrl = openLymiUrl();
  const steps = ESTONIAN_PATH.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck
      ? [{ ...step, name: deck.name, count: deck.cardCount, edition: editionOf(deck) }]
      : [];
  });

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="estonian" />
        <Hero firstDeck={decks.find((d) => d.slug === FIRST_DECK)} />
      </header>

      <main>
        <Wide
          title={<Trans>It comes back just before you’d forget.</Trans>}
          body={
            <Trans>
              Each time you remember a word, Lymi waits a little longer before showing it again. A
              few minutes a day is enough, and the words you learned months ago stay with you.
            </Trans>
          }
        >
          <ReturnLane lang="et" term={() => "sõber"} />
        </Wide>

        <Wide
          title={<Trans>Every word with its three forms.</Trans>}
          body={
            <Trans>
              Estonian words change their shape: <span lang="et">vesi</span>,{" "}
              <span lang="et">vee</span>, <span lang="et">vett</span>. Learn the three forms with
              each word and the other cases follow from them. The verb deck has them on every card,
              and AI adds them to the words you save.
            </Trans>
          }
        >
          <EstonianForms />
        </Wide>

        {steps.length > 1 && (
          <Wide
            id="start"
            title={
              <Trans>
                Start with <span lang="et">tere</span>. Keep going.
              </Trans>
            }
            body={
              <Trans>
                Free decks to take one after another. Each day brings a few new words, mixed in with
                your reviews.
              </Trans>
            }
          >
            <DeckPath steps={steps} lang="et" />
          </Wide>
        )}

        <Wide
          title={<Trans>Hear how it’s really said.</Trans>}
          body={
            <Trans>
              Every card is read aloud by a native Estonian AI voice, so õ, ü and the long vowels
              sound the way they should. Tap a word to hear it. If your deck has its own recordings,
              those play instead.
            </Trans>
          }
        >
          <VoiceTiles words={ESTONIAN_VOICE_WORDS} lang="et" folder="estonian" />
        </Wide>

        <FeatureSection
          title={<Trans>Type one word. Get a whole card.</Trans>}
          body={
            <Trans>
              Add a word from today’s class and AI fills in the meaning, the three forms, an example
              and a hook to help you remember it. It only fills what you left empty, and marks what
              it wrote.
            </Trans>
          }
        >
          <EnrichEstonian />
        </FeatureSection>

        <Wide
          title={<Trans>Turn your class notes into cards.</Trans>}
          body={
            <Trans>
              Take a photo of your notebook or the whiteboard. The new words become cards, and the
              ones you already have are left out.
            </Trans>
          }
        >
          <NotesToCardsEstonian />
        </Wide>

        <OwnAiSection />

        <FeatureSection
          demoFirst
          title={<Trans>Learning is more fun together.</Trans>}
          body={
            <Trans>
              Study a deck with your course group, your tutor or a friend. One of you adds the words
              after each lesson and shares a link, and everyone reviews on their own schedule.
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
            name={ESTONIAN.classDeck.name}
            language="et"
            cards={ESTONIAN_CLASS_CARDS}
          />
        </FeatureSection>

        <Wide
          title={<Trans>Built with Estonian in mind.</Trans>}
          body={<Trans>The small things that matter once you’re a few weeks in.</Trans>}
        >
          <EstonianBento />
        </Wide>

        {decks.length > 0 && (
          <LanguageDecks
            decks={decks}
            locale={locale}
            shelf="estonian"
            body={
              <Trans>
                Free Estonian decks with a native voice on every card, with meanings in English,
                Russian or Ukrainian. Add one in a tap.
              </Trans>
            }
            all={<Trans>All Estonian decks</Trans>}
          />
        )}

        <Questions title={<Trans>Questions before you start.</Trans>} items={ESTONIAN_QUESTIONS} />

        <SignUpSection
          title={
            <Trans>
              Start with <span lang="et">tere</span> tonight.
            </Trans>
          }
        />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="estonian" />
    </div>
  );
}
