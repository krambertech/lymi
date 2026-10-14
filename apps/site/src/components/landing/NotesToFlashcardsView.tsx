import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { openLymiUrl } from "../../lib/origins";
import { Added, AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import { ConnectSteps } from "./ConnectSteps";
import type { SampleCard } from "./cards";
import { FeatureSection } from "./FeatureSection";
import { NOTES_TO_FLASHCARDS_QUESTIONS } from "./faq";
import { GuideSteps } from "./GuideSteps";
import { Hero } from "./Hero";
import type { HandCard } from "./hand-cards";
import { Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { RightMoment } from "./RightMoment";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { type UseCase, UseCases } from "./UseCases";

export const NOTES_TO_FLASHCARDS_TITLE = msg`Turn notes and PDFs into flashcards · Lymi`;
export const NOTES_TO_FLASHCARDS_BLURB = msg`Send class notes, a PDF or a photo of your notebook to your AI assistant, and it adds the key terms to Lymi as flashcards with spaced repetition. Free.`;

/** Terms a page of school or university notes really holds, in their usual definitions. No clip plays. */
const HAND: HandCard[] = [
  {
    id: "osmosis",
    source: msg`Biology`,
    term: "osmosis",
    meaning: msg`Water moving through a membrane toward the side with more dissolved substance`,
    audio: null,
  },
  {
    id: "opportunity-cost",
    source: msg`Economics`,
    term: "opportunity cost",
    meaning: msg`What you give up by choosing one option over the next best one`,
    audio: null,
  },
  {
    id: "habeas-corpus",
    source: msg`Law`,
    term: "habeas corpus",
    meaning: msg`The right to have a court decide whether someone is lawfully detained`,
    audio: null,
  },
  {
    id: "mitochondria",
    source: msg`Biology`,
    term: "mitochondrion",
    meaning: msg`The part of a cell that releases energy from food`,
    note: msg`Plural: mitochondria.`,
    audio: null,
  },
  {
    id: "treaty-of-westphalia",
    source: msg`History`,
    term: "Peace of Westphalia",
    meaning: msg`The 1648 treaties that ended the Thirty Years’ War`,
    audio: null,
  },
];

const OSMOSIS: SampleCard = {
  label: msg`Biology · new`,
  term: "osmosis",
  meaning: msg`Water moving through a membrane toward the side with more dissolved substance`,
};

const REVIEW: SampleCard[] = [
  {
    label: msg`Biology`,
    term: "diffusion",
    meaning: msg`Particles spreading from where there are more of them to where there are fewer`,
  },
  {
    label: msg`Economics`,
    term: "opportunity cost",
    meaning: msg`What you give up by choosing one option over the next best one`,
  },
  {
    label: msg`History`,
    term: "Peace of Westphalia",
    meaning: msg`The 1648 treaties that ended the Thirty Years’ War`,
  },
  {
    label: msg`Law`,
    term: "habeas corpus",
    meaning: msg`The right to have a court decide whether someone is lawfully detained`,
  },
];

/** For the student with a folder of notes and slides and a test coming. */
export function NotesToFlashcardsView() {
  const openAppUrl = openLymiUrl();
  const sources: UseCase[] = [
    {
      id: "handwritten",
      title: <Trans>Handwritten notes</Trans>,
      body: <Trans>A photo of a notebook page, a whiteboard or a printed handout.</Trans>,
      card: OSMOSIS,
    },
    {
      id: "pdf",
      title: <Trans>PDFs and slides</Trans>,
      body: <Trans>Lecture slides, a reading or a chapter, exported as a PDF.</Trans>,
      card: {
        label: msg`Economics`,
        term: "opportunity cost",
        meaning: msg`What you give up by choosing one option over the next best one`,
      },
    },
    {
      id: "typed",
      title: <Trans>Typed notes</Trans>,
      body: <Trans>Notes from Notion, Google Docs or a notes app, pasted as text.</Trans>,
      card: {
        label: msg`History`,
        term: "Peace of Westphalia",
        meaning: msg`The 1648 treaties that ended the Thirty Years’ War`,
      },
    },
  ];

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="notesToFlashcards" />
        <Hero
          title={<Trans>Turn your notes into flashcards.</Trans>}
          lede={
            <Trans>
              Send a PDF, a photo of your notebook or a page of typed notes to your AI assistant.
              The key terms land in Lymi as cards, and each one comes back right before you’d forget
              it.
            </Trans>
          }
          cards={HAND}
        />
      </header>

      <main>
        <UseCases title={<Trans>Whatever your notes are in.</Trans>} items={sources} />

        <GuideSteps
          id="guide"
          title={<Trans>From notes to cards, step by step.</Trans>}
          steps={[
            {
              id: "connect",
              title: <Trans>Connect your assistant once</Trans>,
              body: (
                <Trans>
                  Add Lymi to Claude, ChatGPT, Gemini, Cursor or Grok. The steps are further down
                  this page.
                </Trans>
              ),
            },
            {
              id: "send",
              title: <Trans>Send it your notes</Trans>,
              body: (
                <Trans>
                  Attach the PDF or the photo, or paste the text, in a chat with your assistant.
                </Trans>
              ),
            },
            {
              id: "ask",
              title: <Trans>Say what you want as cards</Trans>,
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
                  A definition taken from your notes stays as written, and anything the assistant
                  wrote is marked AI. Terms you already have are skipped. Edit or archive any card.
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
              Lymi doesn’t read PDFs or photos itself: your assistant reads the file and adds the
              cards. Without an assistant, you can add each term in Lymi with New card, and AI fills
              in the meaning. A diagram can go on a card as its picture.
            </Trans>
          }
        />

        <FeatureSection
          tinted
          title={<Trans>One lecture, one message.</Trans>}
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
                  <Trans>
                    Here are the slides from today’s lecture on cells. Add the key terms.
                  </Trans>
                ),
              },
              {
                from: "them",
                body: (
                  <Added card={OSMOSIS}>
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
                body: <Trans>Three you’ve missed twice: osmosis, active transport and ATP.</Trans>,
              },
            ]}
          />
        </FeatureSection>

        <FeatureSection
          demoFirst
          title={<Trans>Recall first. Reveal second.</Trans>}
          body={
            <Trans>
              Try to recall the definition before Lymi shows it, then grade how well you remembered.
              Hard cards return sooner; easy ones wait.
            </Trans>
          }
        >
          <ReviewDemo cards={REVIEW} />
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
