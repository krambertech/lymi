import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { offersLanguage } from "@lymi/core/catalog";
import { clsx } from "clsx";
import { type ReactNode, useState } from "react";
import { type LocalizedPage, localizedPath } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Added, AssistantChat, type Turn } from "./AssistantChat";
import { AssistantMarks, AssistantMarksWithMore } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { LANGUAGES_QUESTIONS, type Question } from "./faq";
import { HandOfCards } from "./HandOfCards";
import { WORD_FRAMES, type WordFrame } from "./hero-words";
import { LandingLayout } from "./LandingLayout";
import {
  type LanguageCard,
  LEARNING_LANGUAGES,
  type LearningLanguage,
  MIXED_HAND,
} from "./language-cards";
import { NotesToCards } from "./NotesToCards";
import { Questions } from "./Questions";
import { RightMoment } from "./RightMoment";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { WordFieldHero } from "./WordFieldHero";

export const LANGUAGES_TITLE = msg`Lymi for language learning · Keep the words from every lesson`;
export const LANGUAGES_BLURB = msg`Keep the words and phrases from lessons, tutors and reading. Photograph your notes, and your assistant turns them into cards Lymi brings back before you forget.`;

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
          <p className="mx-auto mt-5 max-w-[50ch] text-md text-pretty text-ink-secondary">
            <Trans>
              Take a photo of your notebook or the whiteboard and send it to your assistant. It
              reads the handwriting, adds the new words to your deck and leaves out the ones you
              already have.
            </Trans>
          </p>
          <div className="mt-6">
            <AssistantMarks compact />
          </div>
          <div className="mt-5">
            <TutorLessonsLink />
          </div>
        </div>
        <div className="mt-12">
          <NotesToCards notebooks={notebooks} />
        </div>
      </div>
    </section>
  );
}

/** Leads a learner with a tutor to the step-by-step page for after a lesson. */
function TutorLessonsLink() {
  const { i18n } = useLingui();
  return (
    <ArrowLink href={localizedPath("tutorLessons", i18n.locale)}>
      <Trans>Step by step, after a tutor lesson</Trans>
    </ArrowLink>
  );
}

/** Leads a teacher reading about class decks to the page written for them. */
function TeachersLink() {
  const { i18n } = useLingui();
  return (
    <ArrowLink href={localizedPath("teachers", i18n.locale)}>
      <Trans>Lymi for teachers</Trans>
    </ArrowLink>
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
        ? "bg-ink font-medium text-canvas"
        : "bg-plate text-ink-secondary edge hoverable:hover:bg-plate-hover hoverable:hover:text-ink",
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
  return (
    <LandingLayout
      page={props.page}
      hero={<WordFieldHero frames={props.frames} label={props.heroLabel} lede={props.heroLede} />}
    >
      <NotesSection notebooks={props.notebooks} />

      <HandSection body={props.handBody} hand={props.hand} languages={props.handLanguages} />

      <RightMoment
        title={<Trans>The right moment matters.</Trans>}
        body={
          <Trans>
            Memory fades. Recalling something at the right time strengthens it and lets the next gap
            grow. Lymi uses each grade to decide when the card returns.
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
            Connect Claude, ChatGPT, Gemini or Grok to Lymi once. Then paste a transcript and ask
            for the new words, ask what’s waiting tonight, or tidy a deck in plain language.
            Building something of your own? The same things work through the public API.
          </Trans>
        }
        after={<AssistantMarksWithMore />}
      >
        <AssistantChat conversation={props.conversation} />
      </FeatureSection>

      <Questions title={<Trans>Questions before you start.</Trans>} items={props.questions} />

      <SignUpSection title={props.joinTitle} />
    </LandingLayout>
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

/** The page for anyone learning a language from lessons, tutors and reading. */
export function LanguagesView() {
  const { t, i18n } = useLingui();
  const spanish = LEARNING_LANGUAGES.find((l) => l.id === "es") as LearningLanguage;

  return (
    <LanguagePage
      page="languages"
      frames={WORD_FRAMES.filter((frame) => offersLanguage(i18n.locale, frame.language))}
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
      questions={LANGUAGES_QUESTIONS}
      joinTitle={<Trans>Keep the words from your next lesson.</Trans>}
    />
  );
}
