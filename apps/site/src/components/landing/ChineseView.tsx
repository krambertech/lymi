import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { ReactNode } from "react";
import type { Locale } from "../../lib/routes";
import { Attachment } from "./AssistantChat";
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
import { LandingLayout } from "./LandingLayout";
import { LanguageDecks } from "./LanguageDecks";
import {
  DetailsSection,
  EnrichSection,
  LanguageHero,
  LanguageName,
  OwnAiSection,
  ReturnSection,
  TogetherSection,
  VoiceSection,
} from "./LanguageSections";
import { addDeckUrl, pathSteps } from "./language-decks";
import { Pinyin } from "./Pinyin";
import { PinyinFade } from "./PinyinFade";
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";

const Zh = ({ children }: { children: ReactNode }) => <span lang="zh-Hans">{children}</span>;

interface Props {
  /** Every published Chinese deck in this locale, those a beginner starts from first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Mandarin: pinyin that fades by character, readings kept apart, Pleco brought in. */
export function ChineseView({ decks, locale }: Props) {
  const firstDeck = decks[0];
  const steps = pathSteps(CHINESE_PATH, decks);

  return (
    <LandingLayout
      page="chinese"
      hero={
        <LanguageHero
          kicker={<LanguageName lang="zh">中文</LanguageName>}
          title={<Trans>The flashcard app that gets Chinese.</Trans>}
          lede={
            <Trans>
              Keep the words from your lessons, your books and Pleco in one place. Each card shows
              pinyin over its word until you know it.
            </Trans>
          }
          start={
            firstDeck && {
              href: addDeckUrl(firstDeck),
              label: <Trans>Start with HSK&nbsp;1</Trans>,
            }
          }
          cards={CHINESE_HAND}
          examples={CHINESE_EXAMPLES}
          lang="zh-Hans"
        />
      }
    >
      <Wide
        title={<Trans>One character, two sounds.</Trans>}
        body={
          <Trans>
            In Chinese, one character can have more than one sound. <Zh>行</Zh> is háng in{" "}
            <Zh>银行</Zh>, a bank, and xíng in <Zh>不行</Zh>, no good. Lymi treats each sound as its
            own word, with its own card and its own pinyin.
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

      <ReturnSection
        lang="zh-Hans"
        term={(known) => (
          <span className="whitespace-nowrap">
            <Pinyin term="火车" pinyin="huǒ chē" hidden={known} rt="text-[0.4em]" />
          </span>
        )}
      />

      <FeatureSection
        demoFirst
        title={<Trans>Your words, not a course.</Trans>}
        body={
          <Trans>
            Lymi has no course of its own. Snap your notes or paste a transcript, and the new words
            become cards with pinyin. You choose which to keep.
          </Trans>
        }
      >
        <NotesToCardsChinese />
      </FeatureSection>

      <EnrichSection
        body={
          <Trans>
            Add a word from today’s lesson. AI fills in the pinyin, an example and a hint to help
            you remember it. It fills only what you left empty and marks what it wrote.
          </Trans>
        }
      >
        <EnrichChinese />
      </EnrichSection>

      <Wide
        id="pleco"
        title={<Trans>Bring your Pleco flashcards.</Trans>}
        body={
          <Trans>
            Keep using Pleco as your dictionary. Import its flashcards into Lymi: categories become
            tags, the other script becomes a note, and ni3 hao3 becomes nǐ hǎo.
          </Trans>
        }
      >
        <PlecoImport />
      </Wide>

      <OwnAiSection
        body={
          <Trans>
            Connect ChatGPT, Claude or another assistant. Send it today’s notes and it adds the new
            words with pinyin. Or ask how many cards are waiting tonight.
          </Trans>
        }
        attachment={<Attachment name="lesson-4-notes.pdf" kind={<Trans>PDF</Trans>} />}
        ask={<Trans>Add the new words from today’s lesson to my Chinese deck.</Trans>}
        card={{
          label: msg`中文 · new`,
          term: "换乘",
          language: "zh-Hans",
          meaning: msg`huànchéng · To change lines`,
        }}
        added={
          <Trans>
            Added 7 cards with pinyin. I skipped <Zh>地铁</Zh>, which you already have.
          </Trans>
        }
        waiting={<Trans>Twenty-two. The new words will come up a few at a time.</Trans>}
      />

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

      <VoiceSection
        body={
          <Trans>
            A native Mandarin AI voice reads every card. Tap a word to hear it. If a card has its
            own recording, that plays instead.
          </Trans>
        }
        words={CHINESE_VOICE_WORDS}
        lang="zh-Hans"
        folder="chinese"
      />

      <TogetherSection
        name={msg`Thursday Mandarin class`}
        language="zh-Hans"
        cards={CHINESE_CLASS_CARDS}
      />

      <DetailsSection title={<Trans>Built with Chinese in mind.</Trans>}>
        <ChineseBento />
      </DetailsSection>

      {decks.length > 0 && (
        <LanguageDecks
          decks={decks}
          locale={locale}
          shelf="chinese"
          body={
            <Trans>
              Free Chinese decks with a voice on every card. Add one in a tap. More are on the way.
            </Trans>
          }
          all={<Trans>All Chinese decks</Trans>}
        />
      )}

      <Questions title={<Trans>Questions before you start.</Trans>} items={CHINESE_QUESTIONS} />

      <SignUpSection title={<Trans>Start with HSK&nbsp;1 tonight.</Trans>} />
    </LandingLayout>
  );
}
