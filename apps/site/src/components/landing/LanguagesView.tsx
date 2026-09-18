import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import { type ReactNode, useState } from "react";
import { productUrl } from "../../lib/origins";
import { type LocalizedPage, localizedPath } from "../../lib/routes";
import { Added, AssistantChat, type Turn } from "./AssistantChat";
import { AssistantMarks, AssistantMarksWithMore } from "./AssistantMarks";
import { ConversationScenes } from "./ConversationScenes";
import type { SampleCard } from "./cards";
import { ESTONIAN_SCENES } from "./estonian-scenes";
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { HandOfCards } from "./HandOfCards";
import { Hero } from "./Hero";
import { WORD_FRAMES, type WordFrame } from "./hero-words";
import {
  ESTONIAN,
  ESTONIAN_HAND,
  ESTONIAN_REVIEW,
  type LanguageCard,
  LEARNING_LANGUAGES,
  type LearningLanguage,
  MIXED_HAND,
} from "./language-cards";
import { NotesToCards } from "./NotesToCards";
import { type Question, Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { RightMoment } from "./RightMoment";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { WordFieldHero } from "./WordFieldHero";

export const LANGUAGES_TITLE = msg`Lymi for language learning · Keep the words from every lesson`;
export const LANGUAGES_BLURB = msg`Keep the words and phrases from lessons, tutors and reading. Photograph your notes, and your assistant turns them into cards Lymi brings back before you forget.`;
export const ESTONIAN_TITLE = msg`Remember Estonian vocabulary · Lymi`;
export const ESTONIAN_BLURB = msg`Keep the Estonian from classes, letters and conversations. Photograph your notes, hear every word said, and review each card right before you’d forget.`;

const SPANISH_ADDED: SampleCard = {
  label: msg`Español · new`,
  term: "echar de menos",
  language: "es",
  meaning: msg`To miss someone or something`,
};

interface PageProps {
  page: LocalizedPage;
  frames: WordFrame[];
  heroLabel: string;
  heroLede: ReactNode;
  notebooks: LearningLanguage[];
  hand: LanguageCard[];
  /** Languages the visitor can narrow the hand to. */
  handLanguages?: LearningLanguage[] | undefined;
  handBody: ReactNode;
  conversation: Turn[];
  classDeck: { name: MessageDescriptor; language: string; cards: SampleCard[] };
  questions: Question[];
  joinTitle: ReactNode;
}

/** The notes photographed into cards, with the assistants that can do the reading. */
function NotesSection({ notebooks }: { notebooks: LearningLanguage[] }) {
  return (
    <section
      aria-labelledby="notes-title"
      className="border-y border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="mx-auto max-w-[640px] text-center">
          <div id="notes-title">
            <SectionTitle>
              <Trans>Turn your notes into cards.</Trans>
            </SectionTitle>
          </div>
          <p className="mx-auto mt-5 max-w-[50ch] text-md text-pretty text-text-2">
            <Trans>
              Take a photo of your notebook or the whiteboard and send it to your assistant. It
              reads the handwriting, adds the new words to your deck and leaves out the ones you
              already have.
            </Trans>
          </p>
          <div className="mt-6">
            <AssistantMarks compact />
          </div>
        </div>
        <div className="mt-12">
          <NotesToCards notebooks={notebooks} />
        </div>
      </div>
    </section>
  );
}

/** Leads a teacher reading about class decks to the page written for them. */
function TeachersLink() {
  const { i18n } = useLingui();
  return (
    <a
      href={localizedPath("teachers", i18n.locale)}
      className="inline-flex items-center gap-1.5 rounded-xs text-sm font-medium text-text-2 hoverable:hover:text-text"
    >
      <Trans>Lymi for teachers</Trans>
      <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
    </a>
  );
}

/** The stack of cards, with a switch between every language and one when the page covers several. */
function HandSection({
  body,
  hand,
  languages,
}: {
  body: ReactNode;
  hand: LanguageCard[];
  languages?: LearningLanguage[] | undefined;
}) {
  const { t, i18n } = useLingui();
  const [chosen, setChosen] = useState<LearningLanguage["id"] | null>(null);
  const cards = languages?.find((l) => l.id === chosen)?.hand ?? hand;
  const pill = (active: boolean) =>
    clsx(
      "h-9 rounded-full px-3.5 text-sm transition-colors duration-150",
      active
        ? "bg-text font-medium text-canvas"
        : "bg-plate text-text-2 edge hoverable:hover:bg-hover hoverable:hover:text-text",
    );

  return (
    <FeatureSection
      demoFirst
      title={<Trans>More than a translation.</Trans>}
      body={body}
      after={
        languages && (
          <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">{t`Cards in`}</legend>
            <button
              type="button"
              aria-pressed={chosen === null}
              onClick={() => setChosen(null)}
              className={pill(chosen === null)}
            >
              <Trans>Every language</Trans>
            </button>
            {languages.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={chosen === l.id}
                onClick={() => setChosen(l.id)}
                className={pill(chosen === l.id)}
              >
                {i18n._(l.name)}
              </button>
            ))}
          </fieldset>
        )
      }
    >
      <HandOfCards cards={cards} layout="stack" />
    </FeatureSection>
  );
}

/** The sections every language page shares, filled with one page's words and cards. */
function LanguagePage(props: PageProps) {
  const openAppUrl = new URL("/", productUrl()).toString();

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current={props.page} />
        <WordFieldHero frames={props.frames} label={props.heroLabel} lede={props.heroLede} />
      </header>

      <main>
        <NotesSection notebooks={props.notebooks} />

        <HandSection body={props.handBody} hand={props.hand} languages={props.handLanguages} />

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
          demoFirst
          title={<Trans>Share one deck with your class.</Trans>}
          after={<TeachersLink />}
          body={
            <Trans>
              Make a deck for the class and send its join link. Every card you add after a lesson
              reaches everyone who joined, and each person keeps their own schedule.
            </Trans>
          }
        >
          <SharedDeckDemo
            name={props.classDeck.name}
            language={props.classDeck.language}
            cards={props.classDeck.cards}
          />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Bring your favourite AI along.</Trans>}
          body={
            <Trans>
              Connect Claude, ChatGPT or Gemini to Lymi once. Then paste a transcript and ask for
              the new words, ask what’s waiting tonight, or tidy a deck in plain language. Building
              something of your own? The same things work through the public API.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat conversation={props.conversation} />
        </FeatureSection>

        <Questions title={<Trans>Questions before you start.</Trans>} items={props.questions} />

        <SignUpSection title={props.joinTitle} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page={props.page} />
    </div>
  );
}

/** A class deck holds the card added after class and the glossed words from the notes. */
const classCards = (language: LearningLanguage): SampleCard[] => [
  language.classDeck.added,
  ...language.notes.lines.flatMap((line) =>
    line.gloss
      ? [{ label: language.classDeck.added.label, term: line.term, meaning: line.gloss }]
      : [],
  ),
];

function commonQuestions(): Question[] {
  return [
    {
      id: "phone",
      question: <Trans>Does it work on my phone?</Trans>,
      answer: (
        <Trans>
          Yes. Lymi runs in the browser on your phone and your computer, and you can add it to your
          home screen. Your cards and progress are the same on both.
        </Trans>
      ),
    },
    {
      id: "cost",
      question: <Trans>What does it cost?</Trans>,
      answer: <Trans>Nothing while Lymi is in public beta.</Trans>,
    },
  ];
}

/** The page for anyone learning a language from lessons, tutors and reading. */
export function LanguagesView() {
  const { t } = useLingui();
  const spanish = LEARNING_LANGUAGES.find((l) => l.id === "es") as LearningLanguage;

  return (
    <LanguagePage
      page="languages"
      frames={WORD_FRAMES}
      heroLabel={t`Keep what you learn in any language.`}
      heroLede={
        <Trans>
          The phrase your tutor typed in the chat, the word you looked up twice in a novel. Save it
          in a few seconds, hear how it’s said, and Lymi brings it back right before you’d forget.
        </Trans>
      }
      notebooks={[LEARNING_LANGUAGES.find((l) => l.id === "fr") as LearningLanguage]}
      hand={MIXED_HAND}
      handLanguages={LEARNING_LANGUAGES}
      handBody={
        <Trans>
          Every card says its word aloud, in its own language. The back keeps the line that makes it
          stick: the false friend, the gender, the tone that changes the meaning.
        </Trans>
      }
      conversation={[
        {
          from: "you",
          body: (
            <Trans>
              Here are my notes from today’s Spanish lesson. Add the new words to my deck.
            </Trans>
          ),
        },
        {
          from: "them",
          body: (
            <Added card={SPANISH_ADDED}>
              <Trans>Added 8 cards to Spanish. I skipped “ojalá”, which you already have.</Trans>
            </Added>
          ),
        },
        { from: "you", body: <Trans>How many are waiting for me tonight?</Trans> },
        {
          from: "them",
          body: <Trans>Twelve. Today’s new words will start coming up a few at a time.</Trans>,
        },
      ]}
      classDeck={{ name: spanish.classDeck.name, language: "es", cards: classCards(spanish) }}
      questions={[
        {
          id: "which-languages",
          question: <Trans>Which languages can I learn?</Trans>,
          answer: (
            <Trans>
              Any language you can type, in any script. Lymi can say most widely taught languages
              aloud.
            </Trans>
          ),
        },
        {
          id: "ai",
          question: <Trans>Does the AI write my cards?</Trans>,
          answer: (
            <Trans>
              Only when you ask your assistant to. Anything it writes on a card is marked AI, so you
              can always tell it from your own notes.
            </Trans>
          ),
        },
        {
          id: "anki",
          question: <Trans>What if I already use Anki?</Trans>,
          answer: (
            <Trans>
              Lymi schedules reviews with FSRS, an algorithm Anki also offers, so the timing will
              feel familiar. What changes is the work around it: a card takes seconds to add, and
              your assistant can add a whole lesson. There is no Anki import yet.
            </Trans>
          ),
        },
        ...commonQuestions(),
      ]}
      joinTitle={<Trans>Keep the words from your next lesson.</Trans>}
    />
  );
}

/** The page for people learning Estonian: its words up top, then its notes, reviews and small talk. */
export function EstonianView() {
  const openAppUrl = new URL("/", productUrl()).toString();

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="estonian" />
        <Hero
          title={<Trans>Keep what you learn in Estonian.</Trans>}
          lede={
            <Trans>
              The phrase from Tuesday’s class, the word on a letter from the tax office, the thing
              the cashier said twice. Save it in a few seconds, hear it said, and Lymi brings it
              back right before you’d forget.
            </Trans>
          }
          cards={ESTONIAN_HAND}
          layout="stack"
        />
      </header>

      <main>
        <NotesSection notebooks={[ESTONIAN]} />

        <FeatureSection
          id="how-it-works"
          demoFirst
          title={<Trans>Recall first. Reveal second.</Trans>}
          body={
            <Trans>
              Try to recall the meaning before Lymi shows it. Then grade how well you remembered.
              Difficult cards return sooner; easy ones wait.
            </Trans>
          }
        >
          <ReviewDemo cards={ESTONIAN_REVIEW} />
        </FeatureSection>

        <ConversationScenes
          title={<Trans>Learn to speak Estonian.</Trans>}
          body={
            <Trans>
              Keep the phrases you’ll actually say. Every card plays aloud, and Lymi asks both ways:
              what a phrase means, and how to say it from the meaning.
            </Trans>
          }
          scenes={ESTONIAN_SCENES}
          language="et"
        />

        <FeatureSection
          demoFirst
          title={<Trans>Share one deck with your class.</Trans>}
          after={<TeachersLink />}
          body={
            <Trans>
              Make a deck for the class and send its join link. Every card you add after a lesson
              reaches everyone who joined, and each person keeps their own schedule.
            </Trans>
          }
        >
          <SharedDeckDemo
            name={ESTONIAN.classDeck.name}
            language="et"
            cards={classCards(ESTONIAN)}
          />
        </FeatureSection>

        <Questions
          title={<Trans>Questions before you start.</Trans>}
          items={[
            {
              id: "audio",
              question: <Trans>Can Lymi say Estonian words aloud?</Trans>,
              answer: <Trans>Yes. Press play on any card to hear it in Estonian.</Trans>,
            },
            {
              id: "letters",
              question: <Trans>Does it keep õ, ä, ö and ü apart?</Trans>,
              answer: (
                <Trans>
                  Yes. Every letter stays as you typed it, so tuli, fire, and tüli, a quarrel, are
                  two different cards.
                </Trans>
              ),
            },
            {
              id: "class",
              question: <Trans>Can my class use it together?</Trans>,
              answer: (
                <Trans>
                  Yes. Whoever makes the cards shares the deck’s join link, and everyone who joins
                  gets each new card as it’s added.
                </Trans>
              ),
            },
            ...commonQuestions(),
          ]}
        />

        <SignUpSection title={<Trans>Keep the Estonian from your next class.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="estonian" />
    </div>
  );
}
