import "@fontsource/caveat/500.css";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore, WorksWith } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { FreeBadge } from "./FreeBadge";
import { TUTOR_LESSONS_QUESTIONS } from "./faq";
import { Hero } from "./Hero";
import { HintField } from "./JapaneseAi";
import { LandingLayout } from "./LandingLayout";
import { BENTO_HUES, Examples, LanguageBento, Meanings, Tile } from "./LanguageBento";
import { DetailsSection, ReturnSection, TogetherSection } from "./LanguageSections";
import { LEARNING_LANGUAGES, type LearningLanguage } from "./language-cards";
import { type Material, MaterialToCards, Pick } from "./MaterialToCards";
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";
import { OldDecksTile } from "./StudyTiles";

export const TUTOR_LESSONS_TITLE = msg`Turn your tutor lessons into flashcards · Lymi`;
export const TUTOR_LESSONS_BLURB = msg`After a lesson on italki, Preply or with a private tutor, paste the chat or snap your notes. Lymi turns the new words into flashcards you review between lessons. Your AI assistant can add them too. Free.`;

const byId = (id: LearningLanguage["id"]) =>
  LEARNING_LANGUAGES.find((l) => l.id === id) as LearningLanguage;
const SPANISH = byId("es");

const ADDED: SampleCard = {
  label: msg`Español · new`,
  term: "echar de menos",
  language: "es",
  meaning: msg`To miss someone or something`,
};

function Bubble({ from, children }: { from: "tutor" | "you"; children: ReactNode }) {
  return from === "tutor" ? (
    <p
      lang="es"
      className="max-w-[88%] rounded-2xl rounded-ss-sm bg-plate-nested px-3.5 py-2 text-sm text-ink"
    >
      {children}
    </p>
  ) : (
    <p
      lang="es"
      className="max-w-[80%] self-end rounded-2xl rounded-se-sm bg-amber-soft px-3.5 py-2 text-sm text-ink"
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
        <p className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
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
        <p className="text-xs text-ink-muted">
          <Trans>Transcript · Spanish lesson</Trans>
        </p>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-ink-muted tabular-nums">14:02</dt>
          <dd lang="es" className="text-ink">
            <span className="font-medium">Marta</span> Si no tienes tiempo: «
            <Pick on={lit(0)}>tengo prisa</Pick>».
          </dd>
          <dt className="text-ink-muted tabular-nums">14:03</dt>
          <dd className="text-ink-secondary">
            <span className="font-medium text-ink">
              <Trans>You</Trans>
            </span>{" "}
            <span lang="es">¿Y si necesito algo?</span>
          </dd>
          <dt className="text-ink-muted tabular-nums">14:03</dt>
          <dd lang="es" className="text-ink">
            <span className="font-medium">Marta</span> Entonces: «Me{" "}
            <Pick on={lit(1)}>hace falta</Pick> un café».
          </dd>
          <dt className="text-ink-muted tabular-nums">14:05</dt>
          <dd lang="es" className="text-ink">
            <span className="font-medium">Marta</span> «<Pick on={lit(2)}>Al final</Pick> llegué
            tarde».
          </dd>
          <dt className="text-ink-muted tabular-nums">14:06</dt>
          <dd lang="es" className="text-ink">
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
        <p lang="es" className="text-2xl text-ink-muted">
          Clase 12 · martes
        </p>
        <ul className="mt-4 flex flex-col gap-3 text-2xl leading-tight text-ink @2xl:text-[1.625rem]">
          <li>
            <Pick on={lit(0)}>
              <span lang="es">me da igual</span>
            </Pick>{" "}
            <span className="text-ink-secondary">
              = <Trans>I don’t mind</Trans>
            </span>
          </li>
          <li>
            <Pick on={lit(1)}>
              <span lang="es">tener ganas de</span>
            </Pick>{" "}
            <span className="text-ink-secondary">
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
      <p className="mb-1 flex items-center gap-2 text-xs text-ink-muted">
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
      <Bubble from="tutor">{mark(3, "Ojalá")} nos veamos el viernes.</Bubble>
    </div>
  );
}

/** Two cards from the deck a tutor shares. */
const TUTOR_DECK = [
  { term: "madrugar", meaning: msg`To get up early` },
  { term: "ojalá", meaning: msg`Hopefully` },
];

const EXAMPLES = [
  {
    text: "Mañana madrugo para ir al trabajo.",
    translation: msg`Tomorrow I’m getting up early for work.`,
  },
  { text: "Ojalá nos veamos el viernes.", translation: msg`I hope we see each other on Friday.` },
];

/** One word's meaning in each language Lymi writes meanings in; data, so never translated. */
const MEANINGS = [
  { language: "English", lang: "en", meaning: "To get up early" },
  { language: "Українська", lang: "uk", meaning: "Рано вставати" },
  { language: "Русский", lang: "ru", meaning: "Рано вставать" },
];

/** For the learner who books lessons with a tutor and loses the words between them. */
export function TutorLessonsView() {
  return (
    <LandingLayout
      page="tutorLessons"
      hero={
        <Hero
          badge={<FreeBadge />}
          title={<Trans>Keep every word from your tutor lessons.</Trans>}
          lede={
            <Trans>
              Paste the lesson chat or snap your notes. Lymi turns the new words into cards with a
              native voice, ready to review before the next lesson.
            </Trans>
          }
          secondary={{ href: "#material", label: <Trans>See how it works</Trans> }}
          after={<WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />}
          cards={HERO_CARDS}
          behind={(front) => (
            <LessonChat mark={(i, text) => <Pick on={front === HERO_IDS[i]}>{text}</Pick>} />
          )}
        />
      }
    >
      <section
        id="material"
        aria-labelledby="material-title"
        className="scroll-mt-8 px-5 py-16 @2xl:px-10 @4xl:py-20"
      >
        <div className="mx-auto max-w-[1040px]">
          <div id="material-title">
            <SectionTitle>
              <Trans>Turn your lesson into cards.</Trans>
            </SectionTitle>
          </div>
          <p className="mt-5 max-w-[52ch] text-md text-pretty text-ink-secondary">
            <Trans>
              Paste the chat or a transcript, or add a photo, in Smart add. Lymi picks out the new
              words, keeps the meanings from the lesson and skips the ones already in your deck.
            </Trans>
          </p>
          <div className="mt-12">
            <MaterialToCards materials={MATERIALS} />
          </div>
        </div>
      </section>

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

      <ReturnSection
        lang="es"
        term={() => "madrugar"}
        title={<Trans>Review a few minutes a day.</Trans>}
        body={
          <Trans>
            Each time you remember a word, Lymi waits longer before showing it again. Forget it, and
            it comes back soon. You arrive at the next lesson still knowing the last one.
          </Trans>
        }
      />

      <TogetherSection
        name={msg`Spanish with my tutor`}
        language="es"
        cards={TUTOR_DECK}
        body={
          <Trans>
            Your tutor can make the deck and send you its join link. Every card they add after a
            lesson reaches you, and you keep your own schedule.
          </Trans>
        }
      />

      <DetailsSection title={<Trans>Built for language lessons.</Trans>}>
        <LanguageBento layout="wide">
          <Tile
            wide
            hue={BENTO_HUES[0]}
            title={<Trans>Examples you can hear</Trans>}
            body={
              <Trans>
                Every example comes with a translation, and a native voice reads the whole sentence.
              </Trans>
            }
          >
            <Examples lang="es" examples={EXAMPLES} />
          </Tile>
          <Tile
            hue={BENTO_HUES[1]}
            title={<Trans>Meanings in your language</Trans>}
            body={
              <Trans>
                AI writes meanings in English, Ukrainian or Russian, and Lymi itself is in all
                three.
              </Trans>
            }
          >
            <Meanings lang="es" term="madrugar" meanings={MEANINGS} />
          </Tile>
          <Tile
            hue={BENTO_HUES[2]}
            title={<Trans>A hint for the word that won’t stick</Trans>}
            body={
              <Trans>
                Press Draft and AI suggests a hint for a word you keep forgetting. Peek at it in
                review before you turn the card.
              </Trans>
            }
          >
            <div className="grid gap-2">
              <p
                lang="es"
                className="rounded-md bg-plate px-4 py-3 text-xl font-medium text-ink edge"
              >
                embarazada
              </p>
              <HintField pressed drafted>
                <Trans>
                  Sounds like “embarrassed” but means pregnant: the mix-up is the embarrassing part.
                </Trans>
              </HintField>
            </div>
          </Tile>
          <OldDecksTile />
        </LanguageBento>
      </DetailsSection>

      <Questions title={<Trans>Common questions.</Trans>} items={TUTOR_LESSONS_QUESTIONS} />

      <SignUpSection title={<Trans>Keep the words from your next lesson.</Trans>} />
    </LandingLayout>
  );
}
