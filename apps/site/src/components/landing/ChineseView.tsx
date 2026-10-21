import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { CHINESE_PAGE_DECKS } from "../../lib/language-pages";
import { openLymiUrl, signUpUrl } from "../../lib/origins";
import { type Locale, localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { EnrichChinese, NotesToCardsChinese, PlecoImport } from "./ChineseAi";
import { ChineseBento } from "./ChineseBento";
import { ChineseReadings } from "./ChineseReadings";
import {
  CHINESE_CLASS_CARDS,
  CHINESE_EXAMPLES,
  CHINESE_HAND,
  CHINESE_PATH,
  CHINESE_VOICE_WORDS,
} from "./chinese";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import { CHINESE_QUESTIONS } from "./faq";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import { LanguageDecks } from "./LanguageDecks";
import { Pinyin } from "./Pinyin";
import { PinyinFade } from "./PinyinFade";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { VoiceTiles } from "./VoiceTiles";

export const CHINESE_TITLE = msg`Learn Chinese vocabulary with flashcards · Lymi`;
export const CHINESE_BLURB = msg`A free flashcard app for Mandarin Chinese. Pinyin sits over each word until you know it, each reading of a character gets its own card, and your Pleco flashcards and free HSK 1 and HSK 2 decks come in whole.`;

const Zh = ({ children }: { children: ReactNode }) => <span lang="zh-Hans">{children}</span>;

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
          <p lang="zh" className="mb-5 text-md tracking-[0.06em] text-amber-text">
            中文
          </p>
          <h1 className="max-w-[480px] text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[3.5rem] @4xl:leading-[1.02]">
            <Trans>The flashcard app that gets Chinese.</Trans>
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
            <Trans>
              Keep the words from your lessons, your books and Pleco in one place. Each card shows
              pinyin over its word until you know it.
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
                <Trans>Start with HSK&nbsp;1</Trans>
              </a>
            )}
          </div>
        </div>
        <div className="relative pt-20 pb-4 @5xl:py-20">
          <HandExamples front={front} examples={CHINESE_EXAMPLES} lang="zh-Hans" />
          <div className="relative">
            <HandOfCards cards={CHINESE_HAND} onFront={setFront} quiet ordered />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The assistant the learner already uses, adding a lesson's words with their pinyin. */
function OwnAiSection() {
  return (
    <FeatureSection
      id="ai"
      title={<Trans>Bring your own AI.</Trans>}
      body={
        <Trans>
          Connect ChatGPT, Claude or another assistant. Send it today’s notes and it adds the new
          words with pinyin. Or ask how many cards are waiting tonight.
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
                <Trans>Add the new words from today’s lesson to my Chinese deck.</Trans>
              </>
            ),
          },
          {
            from: "them",
            body: (
              <Added
                card={{
                  label: msg`中文 · new`,
                  term: "换乘",
                  language: "zh-Hans",
                  meaning: msg`huànchéng · To change lines`,
                }}
              >
                <Trans>
                  Added 7 cards with pinyin. I skipped <Zh>地铁</Zh>, which you already have.
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
  /** Every published Chinese deck in this locale. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Mandarin: pinyin that fades by character, readings kept apart, Pleco brought in. */
export function ChineseView({ decks, locale }: Props) {
  const openAppUrl = openLymiUrl();
  const rank = (slug: string) => {
    const at = (CHINESE_PAGE_DECKS as readonly string[]).indexOf(slug);
    return at === -1 ? CHINESE_PAGE_DECKS.length : at;
  };
  const ordered = [...decks].sort((a, b) => rank(a.slug) - rank(b.slug));
  const steps = CHINESE_PATH.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck
      ? [{ ...step, name: deck.name, count: deck.cardCount, edition: editionOf(deck) }]
      : [];
  });

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="chinese" />
        <Hero firstDeck={ordered[0]} />
      </header>

      <main>
        <Wide
          title={<Trans>One character, two sounds.</Trans>}
          body={
            <Trans>
              In Chinese, one character can have more than one sound. <Zh>行</Zh> is háng in{" "}
              <Zh>银行</Zh>, a bank, and xíng in <Zh>不行</Zh>, no good. Lymi treats each sound as
              its own word, with its own card and its own pinyin.
            </Trans>
          }
        >
          <ChineseReadings />
        </Wide>

        <Wide
          title={<Trans>Pinyin fades as you learn.</Trans>}
          body={
            <Trans>
              A card shows pinyin over its word until the card is Known. In the examples on your
              cards, pinyin leaves each character you’ve learned, and stays where a character sounds
              different.
            </Trans>
          }
        >
          <div className="mt-12 rounded-2xl bg-plate px-5 pt-6 pb-7 edge @2xl:px-10 @2xl:pt-8 @2xl:pb-10 @4xl:mt-16">
            <PinyinFade />
          </div>
        </Wide>

        <Wide
          title={<Trans>It comes back just before you’d forget.</Trans>}
          body={
            <Trans>
              Each time you remember a word, Lymi waits a little longer before showing it again. A
              few minutes a day is enough, and the words you learned months ago stay with you.
            </Trans>
          }
        >
          <ReturnLane
            lang="zh-Hans"
            term={(known) => (
              <span className="whitespace-nowrap">
                <Pinyin term="火车" pinyin="huǒ chē" hidden={known} rt="text-[0.4em]" />
              </span>
            )}
          />
        </Wide>

        <FeatureSection
          demoFirst
          title={<Trans>Your words, not a course.</Trans>}
          body={
            <Trans>
              Lymi has no course of its own. Snap your notes or paste a transcript, and the new
              words become cards with pinyin. You choose which to keep.
            </Trans>
          }
        >
          <NotesToCardsChinese />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Type one word. Get a whole card.</Trans>}
          body={
            <Trans>
              Add a word from today’s lesson. AI fills in the pinyin, an example and a hook to help
              you remember it. It fills only what you left empty and marks what it wrote.
            </Trans>
          }
        >
          <EnrichChinese />
        </FeatureSection>

        <Wide
          id="pleco"
          title={<Trans>Bring your Pleco flashcards.</Trans>}
          body={
            <Trans>
              Keep using Pleco as your dictionary. Import its flashcards into Lymi: categories
              become tags, the other script becomes a note, and ni3 hao3 becomes nǐ hǎo.
            </Trans>
          }
        >
          <PlecoImport />
        </Wide>

        <OwnAiSection />

        {steps.length > 0 && (
          <Wide
            id="start"
            title={<Trans>Start with HSK&nbsp;1. Keep going.</Trans>}
            body={
              <Trans>
                Free decks for the first two HSK levels. Take HSK&nbsp;1, then HSK&nbsp;2. Each day
                adds a few new words to your reviews.
              </Trans>
            }
          >
            <DeckPath steps={steps} lang="zh-Hans" />
          </Wide>
        )}

        <Wide
          title={<Trans>Hear how it’s really said.</Trans>}
          body={
            <Trans>
              A native Mandarin AI voice reads every card. Tap a word to hear it. If a card has its
              own recording, that plays instead.
            </Trans>
          }
        >
          <VoiceTiles words={CHINESE_VOICE_WORDS} lang="zh-Hans" folder="chinese" />
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
            name={msg`Thursday Mandarin class`}
            language="zh-Hans"
            cards={CHINESE_CLASS_CARDS}
          />
        </FeatureSection>

        <Wide
          title={<Trans>Built with Chinese in mind.</Trans>}
          body={<Trans>The small things that matter once you’re a few weeks in.</Trans>}
        >
          <ChineseBento />
        </Wide>

        {ordered.length > 0 && (
          <LanguageDecks
            decks={ordered}
            locale={locale}
            shelf="chinese"
            body={
              <Trans>
                Free Chinese decks with a voice on every card. Add one in a tap. More are on the
                way.
              </Trans>
            }
            all={<Trans>All Chinese decks</Trans>}
          />
        )}

        <Questions title={<Trans>Questions before you start.</Trans>} items={CHINESE_QUESTIONS} />

        <SignUpSection title={<Trans>Start with HSK&nbsp;1 tonight.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="chinese" />
    </div>
  );
}
