import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { openLymiUrl } from "../../lib/origins";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { ConnectSteps } from "./ConnectSteps";
import type { SampleCard } from "./cards";
import { FeatureSection, SectionTitle } from "./FeatureSection";
import { NOTES_TO_FLASHCARDS_QUESTIONS } from "./faq";
import { GuideSteps } from "./GuideSteps";
import { Hero } from "./Hero";
import { HeroLiftOff, type HeroWord } from "./HeroScenes";
import { type Material, MaterialToCards, Pick } from "./MaterialToCards";
import { Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { RightMoment } from "./RightMoment";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export const NOTES_TO_FLASHCARDS_TITLE = msg`Turn notes and PDFs into flashcards · Lymi`;
export const NOTES_TO_FLASHCARDS_BLURB = msg`Send class notes, a PDF or a photo of your notebook to your AI assistant, and it adds the key terms to Lymi as flashcards with spaced repetition. Free.`;

/** A study term is written in the page's language, so every field is a message. */
interface StudyWord {
  id: string;
  source: MessageDescriptor;
  term: MessageDescriptor;
  meaning: MessageDescriptor;
}
type StudySample = Omit<SampleCard, "term"> & { term: MessageDescriptor };

/** Terms a page of school or university notes really holds, in their usual definitions. */
const HAND: StudyWord[] = [
  {
    id: "osmosis",
    source: msg`Biology`,
    term: msg`osmosis`,
    meaning: msg`Water moving through a membrane toward the side with more dissolved substance`,
  },
  {
    id: "opportunity-cost",
    source: msg`Economics`,
    term: msg`opportunity cost`,
    meaning: msg`What you give up by choosing one option over the next best one`,
  },
  {
    id: "habeas-corpus",
    source: msg`Law`,
    term: msg`habeas corpus`,
    meaning: msg`The right to have a court decide whether someone is lawfully detained`,
  },
  {
    id: "mitochondria",
    source: msg`Biology`,
    term: msg`mitochondrion`,
    meaning: msg`The part of a cell that releases energy from food`,
  },
  {
    id: "treaty-of-westphalia",
    source: msg`History`,
    term: msg`Peace of Westphalia`,
    meaning: msg`The 1648 treaties that ended the Thirty Years’ War`,
  },
];

const OSMOSIS: StudySample = {
  label: msg`Biology · new`,
  term: msg`osmosis`,
  meaning: msg`Water moving through a membrane toward the side with more dissolved substance`,
};

const REVIEW: StudySample[] = [
  {
    label: msg`Biology`,
    term: msg`diffusion`,
    meaning: msg`Particles spreading from where there are more of them to where there are fewer`,
  },
  {
    label: msg`Economics`,
    term: msg`opportunity cost`,
    meaning: msg`What you give up by choosing one option over the next best one`,
  },
  {
    label: msg`History`,
    term: msg`Peace of Westphalia`,
    meaning: msg`The 1648 treaties that ended the Thirty Years’ War`,
  },
  {
    label: msg`Law`,
    term: msg`habeas corpus`,
    meaning: msg`The right to have a court decide whether someone is lawfully detained`,
  },
];

/** A lecture's slides, a page of handwritten notes and typed notes, each read into its deck. */
const MATERIALS: Material[] = [
  {
    id: "slides",
    name: msg`Slides or a PDF`,
    deck: msg`Biology`,
    cards: [
      {
        term: msg`diffusion`,
        meaning: msg`Particles spreading from where there are more of them to where there are fewer`,
        duplicate: true,
      },
      {
        term: msg`osmosis`,
        meaning: msg`Water moving through a membrane toward the side with more dissolved substance`,
      },
      {
        term: msg`active transport`,
        meaning: msg`Moving a substance against its concentration gradient, using energy`,
      },
      { term: msg`ATP`, meaning: msg`The molecule a cell uses to store and carry energy` },
    ],
    render: (lit) => (
      <figure className="m-0 w-full max-w-[440px] -rotate-1">
        <div className="rounded-md bg-plate p-6 edge @2xl:p-7">
          <p className="text-xs text-muted">
            <Trans>Lecture 4 · Cell transport</Trans>
          </p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-pretty text-text @2xl:text-md">
            <li>
              <Trans>
                <Pick on={lit(0)}>Diffusion</Pick>: particles move from high to low concentration.
              </Trans>
            </li>
            <li>
              <Trans>
                <Pick on={lit(1)}>Osmosis</Pick>: water crosses a membrane toward more dissolved
                substance.
              </Trans>
            </li>
            <li>
              <Trans>
                <Pick on={lit(2)}>Active transport</Pick> moves substances against the gradient.
              </Trans>
            </li>
            <li>
              <Trans>
                It needs energy from <Pick on={lit(3)}>ATP</Pick>.
              </Trans>
            </li>
          </ul>
        </div>
        <figcaption className="mt-3 text-center text-xs text-muted tabular-nums">
          <Trans>cell-transport.pdf · page 12 of 30</Trans>
        </figcaption>
      </figure>
    ),
  },
  {
    id: "notebook",
    name: msg`A photo of your notebook`,
    deck: msg`Economics`,
    cards: [
      {
        term: msg`opportunity cost`,
        meaning: msg`What you give up by choosing one option over the next best one`,
      },
      { term: msg`marginal cost`, meaning: msg`The cost of making one more unit` },
      {
        term: msg`price elasticity`,
        meaning: msg`How much demand changes when the price changes`,
      },
    ],
    render: (lit) => (
      <div className="notes-hand w-full max-w-[420px] rotate-[1.2deg] rounded-md bg-plate px-7 pt-6 pb-8 edge">
        <p className="text-2xl text-muted">
          <Trans>Econ · week 3</Trans>
        </p>
        <ul className="mt-4 flex flex-col gap-3 text-2xl leading-tight text-text @2xl:text-[1.625rem]">
          <li>
            <Trans>
              <Pick on={lit(0)}>opportunity cost</Pick>{" "}
              <span className="text-text-2">= what you give up</span>
            </Trans>
          </li>
          <li>
            <Trans>
              <Pick on={lit(1)}>marginal cost</Pick>{" "}
              <span className="text-text-2">= cost of 1 more</span>
            </Trans>
          </li>
          <li>
            <Trans>
              <Pick on={lit(2)}>price elasticity</Pick> ?
            </Trans>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "typed",
    name: msg`Typed notes`,
    deck: msg`History`,
    cards: [
      {
        term: msg`Defenestration of Prague`,
        meaning: msg`The 1618 revolt in Prague that started the Thirty Years’ War`,
      },
      {
        term: msg`Peace of Westphalia`,
        meaning: msg`The 1648 treaties that ended the Thirty Years’ War`,
      },
      { term: msg`sovereignty`, meaning: msg`A state’s full authority over its own territory` },
    ],
    render: (lit) => (
      <div className="w-full max-w-[440px] rotate-1 rounded-md bg-plate px-6 pt-5 pb-7 edge">
        <p className="text-xs text-muted">
          <Trans>History notes</Trans>
        </p>
        <p className="mt-3 text-xl font-medium tracking-[-0.02em] text-text">
          <Trans>The Thirty Years’ War</Trans>
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-sm text-pretty text-text-2 @2xl:text-md">
          <li>
            <Trans>
              Began in 1618 with the <Pick on={lit(0)}>Defenestration of Prague</Pick>.
            </Trans>
          </li>
          <li>
            <Trans>
              Ended in 1648 by the <Pick on={lit(1)}>Peace of Westphalia</Pick>.
            </Trans>
          </li>
          <li>
            <Trans>
              Each state now ruled its own land: the start of modern{" "}
              <Pick on={lit(2)}>sovereignty</Pick>.
            </Trans>
          </li>
        </ul>
      </div>
    ),
  },
];

/** The revision page the hand of cards came from, the top card's term lit where it was written. */
function RevisionNotes({ mark }: { mark: (i: number, text: ReactNode) => ReactNode }) {
  const { i18n } = useLingui();
  return (
    // Blank paper at the foot, where the card stack sits over the page.
    <div className="notes-hand rounded-md bg-plate px-6 pt-5 pb-24 edge">
      <p className="text-2xl text-muted">
        <Trans>Exam revision</Trans>
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-2xl leading-tight text-text">
        {HAND.map((card, i) => (
          <li key={card.id}>{mark(i, i18n._(card.term))}</li>
        ))}
      </ul>
    </div>
  );
}

/** For the student with a folder of notes and slides and a test coming. */
export function NotesToFlashcardsView() {
  const { t, i18n } = useLingui();
  const openAppUrl = openLymiUrl();
  const osmosis = { ...OSMOSIS, term: i18n._(OSMOSIS.term) };
  const review = REVIEW.map((card) => ({ ...card, term: i18n._(card.term) }));
  const words: HeroWord[] = HAND.map((card) => ({
    id: card.id,
    term: i18n._(card.term),
    label: i18n._(card.source),
    meaning: i18n._(card.meaning),
  }));

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="notesToFlashcards" />
        <Hero
          title={<Trans>Turn your notes into flashcards.</Trans>}
          lede={
            <Trans>
              Send a PDF, a photo of your notebook or typed notes to your AI assistant. The key
              terms land in Lymi as cards, and each one comes back right before you’d forget it.
            </Trans>
          }
          visual={
            <HeroLiftOff
              words={words}
              chip="notes-hand text-2xl leading-tight"
              material={(mark) => <RevisionNotes mark={mark} />}
            />
          }
        />
      </header>

      <main>
        <section
          aria-labelledby="material-title"
          className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
        >
          <div className="mx-auto max-w-[1040px]">
            <div id="material-title">
              <SectionTitle>
                <Trans>Slides, photos or typed notes.</Trans>
              </SectionTitle>
            </div>
            <p className="mt-5 max-w-[52ch] text-md text-pretty text-text-2">
              <Trans>
                Your assistant picks out the terms, keeps the definitions from your notes and skips
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
              id: "send",
              title: <Trans>Send your notes</Trans>,
              body: (
                <Trans>
                  Attach the PDF or the photo, or paste the text, in a chat with your assistant.
                </Trans>
              ),
            },
            {
              id: "ask",
              title: <Trans>Ask for cards</Trans>,
              body: (
                <Trans>
                  For example: “Add the key terms from this lecture to my Biology deck in Lymi, with
                  the definitions from the notes.” Ask for one section at a time when the file is
                  long.
                </Trans>
              ),
            },
            {
              id: "check",
              title: <Trans>Check the cards in Lymi</Trans>,
              body: (
                <Trans>
                  The new cards are in your deck, and terms you already have are skipped. Fix or
                  archive any card.
                </Trans>
              ),
            },
            {
              id: "review",
              title: <Trans>Review a few minutes a day</Trans>,
              body: (
                <Trans>
                  Open Today on your phone or laptop. Lymi schedules each card with spaced
                  repetition, so you review less and remember longer.
                </Trans>
              ),
            },
          ]}
          note={
            <Trans>
              Lymi doesn’t read PDFs or photos itself: your assistant does the reading. A diagram
              can go on a card as its picture.
            </Trans>
          }
          withoutAssistant
        />

        <FeatureSection
          tinted
          title={<Trans>Send a whole lecture at once.</Trans>}
          body={
            <Trans>
              Your assistant reads the file, picks out the terms and adds them in one go. Later it
              can tell you which ones you keep missing.
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
                    <Attachment name={t`cell-transport.pdf`} kind={<Trans>PDF · 30 pages</Trans>} />
                    <Trans>
                      Here are the slides from today’s lecture on cells. Add the key terms.
                    </Trans>
                  </>
                ),
              },
              {
                from: "them",
                body: (
                  <Added card={osmosis}>
                    <Trans>
                      Added 14 cards to Biology, with the slides’ definitions. I skipped
                      “diffusion”, which you already have.
                    </Trans>
                  </Added>
                ),
              },
              {
                from: "you",
                body: <Trans>Which ones should I go over before Thursday’s test?</Trans>,
              },
              {
                from: "them",
                body: (
                  <Trans>Three you’ve missed twice: diffusion, mitochondrion and ribosome.</Trans>
                ),
              },
            ]}
          />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Test yourself, then check.</Trans>}
          body={
            <Trans>
              Try to recall the definition before Lymi shows it, then grade how well you remembered.
              Hard cards return sooner; easy ones wait.
            </Trans>
          }
        >
          <ReviewDemo cards={review} />
        </FeatureSection>

        <RightMoment
          title={<Trans>Review less, remember longer.</Trans>}
          body={
            <Trans>
              Remember a card, and Lymi waits longer before showing it again. Forget it, and it
              comes back soon.
            </Trans>
          }
        />

        <ConnectSteps />

        <Questions
          title={<Trans>Questions before you start.</Trans>}
          items={NOTES_TO_FLASHCARDS_QUESTIONS}
        />

        <SignUpSection title={<Trans>Start with today’s notes.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="notesToFlashcards" />
    </div>
  );
}
