import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { offersLanguage } from "@lymi/core/catalog";
import { type ReactNode, useState } from "react";
import { type LocalizedPage, localizedPath } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Added, AssistantChat, type Turn } from "./AssistantChat";
import { AssistantMarks, AssistantMarksWithMore } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { LANGUAGES_QUESTIONS, type Question } from "./faq";
import { FeatureSection } from "./FeatureSection";
import { HandOfCards } from "./HandOfCards";
import { WORD_FRAMES, type WordFrame } from "./hero-words";
import { LandingLayout } from "./LandingLayout";
import {
  type LanguageCard,
  LEARNING_LANGUAGES,
  type LearningLanguage,
  MIXED_HAND,
} from "./language-cards";
import { LanguageLinks } from "./LanguageLinks";
import { ReturnSection } from "./LanguageSections";
import { NotesToCards } from "./NotesToCards";
import { Picker } from "./Picker";
import { Questions } from "./Questions";
import { Section } from "./Section";
import { SharedDeckDemo } from "./SharedDeckDemo";
import { SignUpSection } from "./SignUpSection";
import { WordFieldHero } from "./WordFieldHero";

export const LANGUAGES_TITLE = msg`Flashcards for language learning · Lymi`;
export const LANGUAGES_BLURB = msg`Keep the words and phrases from lessons, tutors and reading. Photograph your notes, and your assistant turns them into cards you review in Lymi.`;

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
    <Section>
      <Section.Header align="center">
        <Section.Title>
          <Trans>Turn your notes into cards.</Trans>
        </Section.Title>
        <Section.Body>
          <Trans>
            Take a photo of your notebook or the whiteboard. Lymi reads the handwriting, adds the
            new words to your deck and leaves out the ones you already have. Your assistant can do
            the same from a chat.
          </Trans>
        </Section.Body>
        <Section.After>
          <div className="grid justify-items-center gap-5">
            <AssistantMarks compact />
            <TutorLessonsLink />
          </div>
        </Section.After>
      </Section.Header>
      <div className="mt-12">
        <NotesToCards notebooks={notebooks} />
      </div>
    </Section>
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
  return (
    <FeatureSection
      demoFirst
      title={<Trans>More than a translation.</Trans>}
      body={body}
      after={
        languages && (
          <Picker
            label={t`Cards in`}
            options={[t`Every language`, ...languages.map((l) => i18n._(l.name))]}
            at={chosen === null ? 0 : languages.findIndex((l) => l.id === chosen) + 1}
            onPick={(i) => setChosen(i === 0 ? null : (languages[i - 1]?.id ?? null))}
            align="start"
          />
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
      <LanguageLinks />

      <NotesSection notebooks={props.notebooks} />

      <HandSection body={props.handBody} hand={props.hand} languages={props.handLanguages} />

      <ReturnSection lang="es" term={() => "ojalá"} />

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

      <Questions title={<Trans>Common questions.</Trans>} items={props.questions} />

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
          in a few seconds, hear how it’s said, and Lymi brings it back less often as you learn it.
        </Trans>
      }
      notebooks={[LEARNING_LANGUAGES.find((l) => l.id === "fr") as LearningLanguage]}
      hand={MIXED_HAND}
      handLanguages={LEARNING_LANGUAGES}
      handBody={
        <Trans>
          Every card says its word aloud, in its own language. The back holds the note that helps
          you remember it: the false friend, the gender, the tone that changes the meaning.
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
