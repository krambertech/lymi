import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { openLymiUrl } from "../../lib/origins";
import { Added, AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { ConnectSteps } from "./ConnectSteps";
import type { SampleCard } from "./cards";
import { FeatureSection } from "./FeatureSection";
import { TUTOR_LESSONS_QUESTIONS } from "./faq";
import { GuideSteps } from "./GuideSteps";
import { Hero } from "./Hero";
import { LEARNING_LANGUAGES, type LearningLanguage } from "./language-cards";
import { NotesToCards } from "./NotesToCards";
import { Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export const TUTOR_LESSONS_TITLE = msg`Turn your tutor lessons into flashcards · Lymi`;
export const TUTOR_LESSONS_BLURB = msg`After a lesson on italki, Preply or with a private tutor, send the chat, notes or a photo of your notebook to your AI assistant. It adds the new words to Lymi, which brings each one back before you forget. Free.`;

const byId = (id: LearningLanguage["id"]) =>
  LEARNING_LANGUAGES.find((l) => l.id === id) as LearningLanguage;
const SPANISH = byId("es");
const GERMAN = byId("de");

const ADDED: SampleCard = {
  label: msg`Español · new`,
  term: "echar de menos",
  language: "es",
  meaning: msg`To miss someone or something`,
};

const REVIEW: SampleCard[] = [
  {
    label: msg`Español`,
    term: "echar de menos",
    language: "es",
    meaning: msg`To miss someone or something`,
    example: "Echo de menos a mi familia.",
  },
  {
    label: msg`Deutsch`,
    term: "Feierabend",
    language: "de",
    meaning: msg`The end of the working day, and the free time after it`,
    example: "Endlich Feierabend!",
  },
  {
    label: msg`Español`,
    term: "aprovechar",
    language: "es",
    meaning: msg`To make the most of something`,
    example: "Hay que aprovechar el buen tiempo.",
  },
  {
    label: msg`Español`,
    term: "soler",
    language: "es",
    meaning: msg`To usually do something`,
    example: "Suelo desayunar a las ocho.",
  },
];

/** For the learner who books lessons with a tutor and loses the words between them. */
export function TutorLessonsView() {
  const openAppUrl = openLymiUrl();

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="tutorLessons" />
        <Hero
          title={<Trans>Keep every word from your tutor lessons.</Trans>}
          lede={
            <Trans>
              The phrases your tutor typed in the chat and the corrections in your notebook. Send
              them to your assistant after the lesson, and Lymi brings each one back right before
              you’d forget it, ready for the next lesson.
            </Trans>
          }
          cards={[...SPANISH.hand, ...GERMAN.hand]}
        />
      </header>

      <main>
        <GuideSteps
          id="guide"
          title={<Trans>After the lesson, in five minutes.</Trans>}
          lede={
            <Trans>
              It works the same for a lesson on italki, on Preply or with a tutor you meet in
              person.
            </Trans>
          }
          steps={[
            {
              id: "connect",
              title: <Trans>Connect your assistant once</Trans>,
              body: (
                <Trans>
                  Add Lymi to Claude, ChatGPT, Gemini, Cursor or Grok. The steps are further down
                  this page, and you only do them once.
                </Trans>
              ),
            },
            {
              id: "collect",
              title: <Trans>Collect what the lesson left you</Trans>,
              body: (
                <Trans>
                  Copy the lesson chat, export your shared notes, or take a photo of your notebook
                  or your tutor’s whiteboard.
                </Trans>
              ),
            },
            {
              id: "send",
              title: <Trans>Send it to your assistant</Trans>,
              body: (
                <Trans>
                  Paste the text or attach the photo and ask: “Add the new words to my Spanish deck
                  in Lymi.” Say which deck, or ask it to make one.
                </Trans>
              ),
            },
            {
              id: "check",
              title: <Trans>Check the cards in Lymi</Trans>,
              body: (
                <Trans>
                  The new cards are in your deck. A meaning from your notes stays as written, and
                  anything the assistant wrote is marked AI. Words you already have are skipped.
                  Edit or archive any card.
                </Trans>
              ),
            },
            {
              id: "review",
              title: <Trans>Review a few minutes a day</Trans>,
              body: (
                <Trans>
                  Open Today on your phone or laptop. Lymi shows each word again right before you’d
                  forget it, so the next lesson starts where the last one ended.
                </Trans>
              ),
            },
          ]}
          note={
            <Trans>
              Lymi doesn’t connect to tutoring sites and doesn’t read files itself: your assistant
              reads the chat, notes or photo and adds the cards. Without an assistant, you can add
              each word in Lymi with New card, and AI fills in the meaning.
            </Trans>
          }
        />

        <section
          aria-labelledby="notebook-title"
          className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
        >
          <div className="mx-auto max-w-[1040px]">
            <div className="mx-auto max-w-[640px] text-center">
              <h2
                id="notebook-title"
                className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
              >
                <Trans>A page of lesson notes, as cards.</Trans>
              </h2>
              <p className="mx-auto mt-5 max-w-[50ch] text-md text-pretty text-text-2">
                <Trans>
                  Your assistant reads the handwriting, keeps the meanings you wrote down, fills in
                  the ones you didn’t and leaves out words already in your deck.
                </Trans>
              </p>
            </div>
            <div className="mt-12">
              <NotesToCards notebooks={[GERMAN, SPANISH]} />
            </div>
          </div>
        </section>

        <FeatureSection
          tinted
          title={<Trans>Ask in your own words.</Trans>}
          body={
            <Trans>
              Your assistant can also tell you what’s due before the next lesson, or which words you
              keep getting wrong, so you can ask your tutor about them.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat
            conversation={[
              {
                from: "you",
                body: (
                  <Trans>
                    Here’s the chat from today’s lesson with Marta. Add the new phrases.
                  </Trans>
                ),
              },
              {
                from: "them",
                body: (
                  <Added card={ADDED}>
                    <Trans>
                      Added 9 cards to Spanish. I skipped “ojalá”, which you already have.
                    </Trans>
                  </Added>
                ),
              },
              { from: "you", body: <Trans>Which words should I ask Marta about on Friday?</Trans> },
              {
                from: "them",
                body: (
                  <Trans>
                    The three you missed most this week: “echar de menos”, “aprovechar” and “soler”.
                  </Trans>
                ),
              },
            ]}
          />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Between lessons, a few minutes a day.</Trans>}
          body={
            <Trans>
              One card at a time, graded in a tap, even offline. Every card says its word aloud.
              Words you know wait longer, and the ones you miss come back sooner.
            </Trans>
          }
        >
          <ReviewDemo cards={REVIEW} />
        </FeatureSection>

        <ConnectSteps />

        <Questions
          title={<Trans>Questions before you start.</Trans>}
          items={TUTOR_LESSONS_QUESTIONS}
        />

        <SignUpSection title={<Trans>Keep the words from your next lesson.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="tutorLessons" />
    </div>
  );
}
