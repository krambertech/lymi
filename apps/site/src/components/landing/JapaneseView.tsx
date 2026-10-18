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
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { JAPANESE_QUESTIONS } from "./faq";
import { HandExamples } from "./HandExamples";
import { HandOfCards } from "./HandOfCards";
import { EnrichJapanese, PageToCards } from "./JapaneseAi";
import { JapaneseBento } from "./JapaneseBento";
import { JapaneseDecks } from "./JapaneseDecks";
import { CLASS_CARDS, HAND_EXAMPLES, JAPANESE_HAND, JAPANESE_PATH, VOICE_WORDS } from "./japanese";
import { KanjiReadings } from "./KanjiReadings";
import { Questions } from "./Questions";
import { ReturnLane } from "./ReturnLane";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { VoiceTiles } from "./VoiceTiles";

export const JAPANESE_TITLE = msg`Learn Japanese vocabulary with flashcards · Lymi`;
export const JAPANESE_BLURB = msg`A free flashcard app for Japanese. Start with kana, then N5 and N4 words, and add the words from your own lessons. Cards show the reading over the kanji until you know the word.`;

const KANA = "read-japanese-kana";

/** A section with its title and copy centred above a wide demo. */
function Wide({
  id,
  title,
  body,
  children,
}: {
  id?: string;
  title: ReactNode;
  body: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[640px]">
          <SectionTitle>{title}</SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">{body}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function Hero() {
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
          <p lang="ja" className="mb-5 text-md tracking-[0.06em] text-amber-text">
            日本語
          </p>
          <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.25rem] @4xl:leading-[0.98]">
            <Trans>The flashcard app that gets Japanese.</Trans>
          </h1>
          <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">
            <Trans>
              Learn Japanese words in a few minutes a day, from your first hiragana to the words in
              this week’s lesson. Every card shows you how to read the kanji until you don’t need
              the help.
            </Trans>
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
              <Trans>Get started</Trans>
            </a>
            <a href={addUrl(KANA)} className={buttonClass("secondary", "lg")}>
              <Trans>Start with kana</Trans>
            </a>
          </div>
        </div>
        <div className="relative pt-20 pb-4 @5xl:py-20">
          <HandExamples front={front} examples={HAND_EXAMPLES} />
          <div className="relative">
            <HandOfCards cards={JAPANESE_HAND} onFront={setFront} quiet ordered />
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
          Connect Claude, ChatGPT or another assistant once. Send it a photo of today’s page and it
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
                <Attachment name="IMG_2041.jpg" kind={<Trans>Photo</Trans>} photo />
                <Trans>Today’s page from my textbook. Add the new words to my Japanese deck.</Trans>
              </>
            ),
          },
          {
            from: "them",
            body: (
              <Added
                card={{
                  label: msg`日本語 · new`,
                  term: "乗り換える",
                  language: "ja",
                  meaning: msg`To change trains`,
                }}
              >
                <Trans>
                  Added 6 cards to Japanese, with readings. I skipped <span lang="ja">電車</span>,
                  which you already have.
                </Trans>
              </Added>
            ),
          },
          { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
          {
            from: "them",
            body: <Trans>Eighteen. The new words will come up a few at a time.</Trans>,
          },
        ]}
      />
    </FeatureSection>
  );
}

interface Props {
  /** Every published Japanese deck in this locale, beginner decks first. */
  decks: PublicDeckSummary[];
  locale: Locale;
}

/** The page for people learning Japanese, from their first kana to N4 and their own lessons. */
export function JapaneseView({ decks, locale }: Props) {
  const openAppUrl = openLymiUrl();
  const steps = JAPANESE_PATH.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck ? [{ ...step, name: deck.name, count: deck.cardCount }] : [];
  });

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="japanese" />
        <Hero />
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
          <ReturnLane />
        </Wide>

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
            <DeckPath steps={steps} />
          </Wide>
        )}

        <Wide
          title={<Trans>Hear how it’s really said.</Trans>}
          body={
            <Trans>
              Every card is read aloud by a native Japanese AI voice. It follows the reading on your
              card, so <span lang="ja">明日</span> is <span lang="ja">あした</span> and{" "}
              <span lang="ja">今日</span> is <span lang="ja">きょう</span>. Tap a word to hear it.
              If your deck has its own recordings, those play instead.
            </Trans>
          }
        >
          <VoiceTiles words={VOICE_WORDS} />
        </Wide>

        <FeatureSection
          title={<Trans>Type one word. Get a whole card.</Trans>}
          body={
            <Trans>
              Add a word from today’s lesson and AI fills in the reading, the meaning, an example
              and a hook to help you remember it. It only fills what you left empty, and marks what
              it wrote.
            </Trans>
          }
        >
          <EnrichJapanese />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Turn a textbook page into cards.</Trans>}
          body={
            <Trans>
              Take a photo of your textbook or notes. The new words become cards with their
              readings, and you pick the ones to keep.
            </Trans>
          }
        >
          <PageToCards />
        </FeatureSection>

        <OwnAiSection />

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
          <SharedDeckDemo name={msg`Tuesday Japanese class`} language="ja" cards={CLASS_CARDS} />
        </FeatureSection>

        <Wide
          title={<Trans>Built with Japanese in mind.</Trans>}
          body={<Trans>The small things that matter once you’re a few weeks in.</Trans>}
        >
          <JapaneseBento />
        </Wide>

        {decks.length > 0 && <JapaneseDecks decks={decks} locale={locale} />}

        <Questions title={<Trans>Questions before you start.</Trans>} items={JAPANESE_QUESTIONS} />

        <SignUpSection
          title={
            <Trans>
              Start with <span lang="ja">あ</span> tonight.
            </Trans>
          }
        />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="japanese" />
    </div>
  );
}
