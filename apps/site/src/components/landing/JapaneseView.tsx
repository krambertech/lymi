import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { clsx } from "clsx";
import type { Locale } from "../../lib/routes";
import { addUrl } from "../deck/DeckView";
import { Attachment } from "./AssistantChat";
import { DeckPath } from "./DeckPath";
import { FeatureSection, Wide } from "./FeatureSection";
import { JAPANESE_QUESTIONS } from "./faq";
import { EnrichJapanese, PageToCards } from "./JapaneseAi";
import { JapaneseBento } from "./JapaneseBento";
import { CLASS_CARDS, HAND_EXAMPLES, JAPANESE_HAND, JAPANESE_PATH, VOICE_WORDS } from "./japanese";
import { KanjiReadings } from "./KanjiReadings";
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
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";

const KANA = "read-japanese-kana";

interface Props {
  /** Every published Japanese deck in this locale, beginner decks first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Japanese, from their first kana to N4 and their own lessons. */
export function JapaneseView({ decks, locale }: Props) {
  const kana = decks.find((d) => d.slug === KANA);
  const steps = pathSteps(JAPANESE_PATH, decks);

  return (
    <LandingLayout
      page="japanese"
      hero={
        <LanguageHero
          kicker={<LanguageName lang="ja">日本語</LanguageName>}
          title={<Trans>The flashcard app that gets Japanese.</Trans>}
          narrow
          lede={
            <Trans>
              Learn Japanese words in a few minutes a day, from your first hiragana to the words in
              this week’s lesson. Every card shows you how to read the kanji until you don’t need
              the help.
            </Trans>
          }
          start={{
            href: kana ? addDeckUrl(kana) : addUrl(KANA),
            label: <Trans>Start with kana</Trans>,
          }}
          cards={JAPANESE_HAND}
          examples={HAND_EXAMPLES}
          lang="ja"
        />
      }
    >
      <ReturnSection
        lang="ja"
        term={(known) => (
          <ruby>
            電車
            <rt className={clsx("text-[0.45em] text-amber-text", known && "invisible opacity-0")}>
              でんしゃ
            </rt>
          </ruby>
        )}
      />

      <Wide
        title={<Trans>One kanji, seven sounds.</Trans>}
        body={
          <Trans>
            The same kanji sounds different in different words. Lymi shows the reading over the
            kanji until you know the word, then takes it away so you learn to read it on your own.
          </Trans>
        }
      >
        <KanjiReadings />
      </Wide>

      {steps.length > 0 && (
        <Wide
          id="start"
          title={
            <Trans>
              Start at <span lang="ja">あ</span>. Keep going.
            </Trans>
          }
          body={
            <Trans>
              Free decks to take one after another. Each day brings a few new words, mixed in with
              your reviews.
            </Trans>
          }
        >
          <DeckPath steps={steps} lang="ja" />
        </Wide>
      )}

      <VoiceSection
        body={
          <Trans>
            Every card is read aloud by a native Japanese AI voice. It follows the reading on your
            card, so <span lang="ja">明日</span> is <span lang="ja">あした</span> and{" "}
            <span lang="ja">今日</span> is <span lang="ja">きょう</span>. Tap a word to hear it. If
            your deck has its own recordings, those play instead.
          </Trans>
        }
        words={VOICE_WORDS}
        lang="ja"
        folder="japanese"
      />

      <EnrichSection
        body={
          <Trans>
            Add a word from today’s lesson and AI fills in the reading, the meaning, an example and
            a hint to help you remember it. It only fills what you left empty, and marks what it
            wrote.
          </Trans>
        }
      >
        <EnrichJapanese />
      </EnrichSection>

      <FeatureSection
        demoFirst
        title={<Trans>Turn a textbook page into cards.</Trans>}
        body={
          <Trans>
            Take a photo of your textbook or notes. The new words become cards with their readings,
            and you pick the ones to keep.
          </Trans>
        }
      >
        <PageToCards />
      </FeatureSection>

      <OwnAiSection
        api
        body={
          <Trans>
            Connect Claude, ChatGPT or another assistant once. Send it a photo of today’s page and
            it adds the new words, or ask what’s waiting for you tonight.
          </Trans>
        }
        attachment={<Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />}
        ask={<Trans>Today’s page from my textbook. Add the new words to my Japanese deck.</Trans>}
        card={{
          label: msg`日本語 · new`,
          term: "乗り換える",
          language: "ja",
          meaning: msg`To change trains`,
        }}
        added={
          <Trans>
            Added 6 cards to Japanese, with readings. I skipped <span lang="ja">電車</span>, which
            you already have.
          </Trans>
        }
        waiting={<Trans>Eighteen. The new words will come up a few at a time.</Trans>}
      />

      <TogetherSection name={msg`Tuesday Japanese class`} language="ja" cards={CLASS_CARDS} />

      <DetailsSection title={<Trans>Built with Japanese in mind.</Trans>}>
        <JapaneseBento />
      </DetailsSection>

      {decks.length > 0 && (
        <LanguageDecks
          decks={decks}
          locale={locale}
          shelf="japanese"
          body={
            <Trans>
              Free Japanese decks with readings and a voice on every card. Add one in a tap. More
              are on the way.
            </Trans>
          }
          all={<Trans>All Japanese decks</Trans>}
        />
      )}

      <Questions title={<Trans>Questions before you start.</Trans>} items={JAPANESE_QUESTIONS} />

      <SignUpSection
        title={
          <Trans>
            Start with <span lang="ja">あ</span> tonight.
          </Trans>
        }
      />
    </LandingLayout>
  );
}
