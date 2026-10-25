import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { ConnectSteps } from "./ConnectSteps";
import type { SampleCard } from "./cards";
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { TUTOR_LESSONS_QUESTIONS } from "./faq";
import { GuideSteps } from "./GuideSteps";
import { Hero } from "./Hero";
import { LandingLayout } from "./LandingLayout";
import { LEARNING_LANGUAGES, type LearningLanguage } from "./language-cards";
import { type Material, MaterialToCards, Pick } from "./MaterialToCards";
import { Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { SignUpSection } from "./SignUpSection";

export const TUTOR_LESSONS_TITLE = msg`Turn your tutor lessons into flashcards · Lymi`;
export const TUTOR_LESSONS_BLURB = msg`After a lesson on italki, Preply or with a private tutor, send the chat, notes or a photo of your notebook to your AI assistant. It adds the new words to Lymi, which brings each one back before you forget. Free.`;

const byId = (id: LearningLanguage["id"]) =>
  LEARNING_LANGUAGES.find((l) => l.id === id) as LearningLanguage;
const SPANISH = byId("es");

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

function Bubble({ from, children }: { from: "tutor" | "you"; children: ReactNode }) {
  return from === "tutor" ? (
    <p
      lang="es"
      className="max-w-[88%] rounded-2xl rounded-ss-sm bg-plate-2 px-3.5 py-2 text-sm text-text"
    >
      {children}
    </p>
  ) : (
    <p
      lang="es"
      className="max-w-[80%] self-end rounded-2xl rounded-se-sm bg-amber-soft px-3.5 py-2 text-sm text-text"
    >
      {children}
    </p>
  );
}

/** What a Spanish lesson leaves behind: the tutor's chat, and the learner's own notebook page. */
const MATERIALS: Material[] = [
  {
    id: "chat",
    name: msg`The lesson chat`,
    deck: msg`Spanish`,
    lang: "es",
    cards: [
      { term: "echar de menos", meaning: msg`To miss someone or something` },
      { term: "aprovechar", meaning: msg`To make the most of something` },
      { term: "soler", meaning: msg`To usually do something` },
      { term: "ojalá", meaning: msg`I hope so; if only`, duplicate: true },
    ],
    render: (lit) => (
      <div className="flex w-full max-w-[400px] -rotate-1 flex-col gap-2 rounded-2xl bg-plate p-4 edge">
        <p className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span
            aria-hidden="true"
            className="grid size-6 place-items-center rounded-full bg-amber-soft text-2xs font-medium text-amber-text"
          >
            M
          </span>
          <Trans>Marta · Spanish lesson</Trans>
        </p>
        <Bubble from="tutor">
          Se dice «<Pick on={lit(0)}>echar de menos</Pick>», no «perder».
        </Bubble>
        <Bubble from="you">Echo de menos a mi familia.</Bubble>
        <Bubble from="tutor">
          ¡Eso es! Y el finde, <Pick on={lit(1)}>aprovecha</Pick> el sol.
        </Bubble>
        <Bubble from="tutor">
          <Pick on={lit(2)}>Suelo</Pick> + infinitivo: «Suelo desayunar a las ocho».
        </Bubble>
        <Bubble from="tutor">
          Para el viernes, repasa <Pick on={lit(3)}>ojalá</Pick>.
        </Bubble>
      </div>
    ),
  },
  {
    id: "transcript",
    name: msg`A lesson transcript`,
    deck: msg`Spanish`,
    lang: "es",
    cards: [
      { term: "tener prisa", meaning: msg`To be in a hurry` },
      { term: "hacer falta", meaning: msg`To be needed` },
      { term: "al final", meaning: msg`In the end` },
      { term: "madrugar", meaning: msg`To get up early`, duplicate: true },
    ],
    render: (lit) => (
      <div className="w-full max-w-[420px] rotate-1 rounded-md bg-plate px-5 pt-4 pb-5 edge">
        <p className="text-xs text-muted">
          <Trans>Transcript · Spanish lesson</Trans>
        </p>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-muted tabular-nums">14:02</dt>
          <dd lang="es" className="text-text">
            <span className="font-medium">Marta</span> Si no tienes tiempo: «
            <Pick on={lit(0)}>tengo prisa</Pick>».
          </dd>
          <dt className="text-muted tabular-nums">14:03</dt>
          <dd className="text-text-2">
            <span className="font-medium text-text">
              <Trans>You</Trans>
            </span>{" "}
            <span lang="es">¿Y si necesito algo?</span>
          </dd>
          <dt className="text-muted tabular-nums">14:03</dt>
          <dd lang="es" className="text-text">
            <span className="font-medium">Marta</span> Entonces: «Me{" "}
            <Pick on={lit(1)}>hace falta</Pick> un café».
          </dd>
          <dt className="text-muted tabular-nums">14:05</dt>
          <dd lang="es" className="text-text">
            <span className="font-medium">Marta</span> «<Pick on={lit(2)}>Al final</Pick> llegué
            tarde».
          </dd>
          <dt className="text-muted tabular-nums">14:06</dt>
          <dd lang="es" className="text-text">
            <span className="font-medium">Marta</span> Mañana tienes que{" "}
            <Pick on={lit(3)}>madrugar</Pick>.
          </dd>
        </dl>
      </div>
    ),
  },
  {
    id: "notebook",
    name: msg`A photo of your notebook`,
    deck: msg`Spanish`,
    lang: "es",
    cards: [
      { term: "me da igual", meaning: msg`I don’t mind` },
      { term: "tener ganas de", meaning: msg`To feel like doing something` },
      { term: "quedar con alguien", meaning: msg`To meet up with someone` },
      { term: "madrugar", meaning: msg`To get up early`, duplicate: true },
    ],
    render: (lit) => (
      <div className="notes-hand w-full max-w-[400px] rotate-[1.2deg] rounded-md bg-plate px-7 pt-6 pb-8 edge">
        <p lang="es" className="text-2xl text-muted">
          Clase 12 · martes
        </p>
        <ul className="mt-4 flex flex-col gap-3 text-2xl leading-tight text-text @2xl:text-[1.625rem]">
          <li>
            <Pick on={lit(0)}>
              <span lang="es">me da igual</span>
            </Pick>{" "}
            <span className="text-text-2">
              = <Trans>I don’t mind</Trans>
            </span>
          </li>
          <li>
            <Pick on={lit(1)}>
              <span lang="es">tener ganas de</span>
            </Pick>{" "}
            <span className="text-text-2">
              = <Trans>to feel like</Trans>
            </span>
          </li>
          <li lang="es">
            <Pick on={lit(2)}>quedar con alguien</Pick>
          </li>
          <li lang="es">
            <Pick on={lit(3)}>madrugar</Pick>
          </li>
        </ul>
      </div>
    ),
  },
];

/** The hero's words in the order Marta says them. */
const HERO_IDS = ["madrugar", "embarazada", "me-pones-un-cafe", "ojala"];
const HERO_CARDS = HERO_IDS.map(
  (id) => SPANISH.hand.find((card) => card.id === id) as LearningLanguage["hand"][number],
);

/** The lesson the hand of cards came from: the top card's term is lit where Marta said it. */

function LessonChat({ mark }: { mark: (i: number, text: ReactNode) => ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-plate p-4 pb-16 edge">
      <p className="mb-1 flex items-center gap-2 text-xs text-muted">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-full bg-amber-soft text-2xs font-medium text-amber-text"
        >
          M
        </span>
        <Trans>Marta · Spanish lesson</Trans>
      </p>
      <Bubble from="tutor">Mañana tienes que {mark(0, "madrugar")}.</Bubble>
      <Bubble from="you">Uf, estoy muy embarazada…</Bubble>
      <Bubble from="tutor">¡Cuidado! {mark(1, "Embarazada")} no es «embarrassed».</Bubble>
      <Bubble from="tutor">En el bar: «{mark(2, "¿Me pones un café?")}»</Bubble>
      <Bubble from="tutor">{mark(3, "Ojalá")} nos vemos el viernes.</Bubble>
    </div>
  );
}

/** For the learner who books lessons with a tutor and loses the words between them. */
export function TutorLessonsView() {
  return (
    <LandingLayout
      page="tutorLessons"
      hero={
        <Hero
          title={<Trans>Keep every word from your tutor lessons.</Trans>}
          lede={
            <Trans>
              Send the lesson chat, a transcript or a photo of your notebook to your AI assistant.
              Lymi keeps every new word and brings it back right before you’d forget it.
            </Trans>
          }
          cards={HERO_CARDS}
          behind={(front) => (
            <LessonChat mark={(i, text) => <Pick on={front === HERO_IDS[i]}>{text}</Pick>} />
          )}
        />
      }
    >
      <section
        aria-labelledby="material-title"
        className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
      >
        <div className="mx-auto max-w-[1040px]">
          <div id="material-title">
            <SectionTitle>
              <Trans>Turn your lesson into cards.</Trans>
            </SectionTitle>
          </div>
          <p className="mt-5 max-w-[52ch] text-md text-pretty text-text-2">
            <Trans>
              Your assistant picks out the new words, keeps the meanings from the lesson and skips
              the ones already in your deck.
            </Trans>
          </p>
          <div className="mt-12">
            <MaterialToCards materials={MATERIALS} />
          </div>
        </div>
      </section>

      <GuideSteps
        id="guide"
        title={<Trans>How it works</Trans>}
        lede={
          <Trans>
            It works the same for a lesson on italki, on Preply or with a tutor you meet in person.
          </Trans>
        }
        steps={[
          {
            id: "connect",
            title: <Trans>Connect your AI assistant</Trans>,
            body: (
              <Trans>
                Add Lymi to Claude, Grok or another assistant.{" "}
                <a
                  href="#connect"
                  className="text-text underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-current"
                >
                  It takes three steps
                </a>
                . No assistant?{" "}
                <a
                  href="#guide-without"
                  className="text-text underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-current"
                >
                  Start another way
                </a>
                .
              </Trans>
            ),
          },
          {
            id: "collect",
            title: <Trans>Copy the chat or take a photo</Trans>,
            body: (
              <Trans>
                Copy the lesson chat or transcript, export your shared notes, or take a photo of
                your notebook or your tutor’s whiteboard.
              </Trans>
            ),
          },
          {
            id: "send",
            title: <Trans>Send it to your assistant</Trans>,
            body: (
              <Trans>
                Paste the text or attach the photo and ask: “Add the new words to my Spanish deck in
                Lymi.” Say which deck, or ask it to make one.
              </Trans>
            ),
          },
          {
            id: "check",
            title: <Trans>Check the cards in Lymi</Trans>,
            body: (
              <Trans>
                The new cards are in your deck, and words you already have are skipped. Fix or
                archive any card.
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
            Lymi doesn’t connect to tutoring sites. Smart add is in beta and reads up to 5 lessons a
            day.
          </Trans>
        }
        withoutAssistant
      />

      <FeatureSection
        tinted
        title={<Trans>Ask what to review.</Trans>}
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
                <>
                  <Attachment name="lesson-with-marta.txt" kind={<Trans>Text · 2 pages</Trans>} />
                  <Trans>
                    Here’s the chat from today’s lesson with Marta. Add the new phrases.
                  </Trans>
                </>
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
                  The three you missed most this week: “ojalá”, “madrugar” and “tener ganas de”.
                </Trans>
              ),
            },
          ]}
        />
      </FeatureSection>

      <FeatureSection
        demoFirst
        title={<Trans>Review a few minutes a day.</Trans>}
        body={
          <Trans>
            One card at a time, graded in a tap, even offline. Words you know wait longer, and the
            ones you miss come back sooner.
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
    </LandingLayout>
  );
}
