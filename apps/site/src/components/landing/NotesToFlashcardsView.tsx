import "@fontsource/caveat/500.css";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { Added, AssistantChat, Attachment } from "./AssistantChat";
import { AssistantMarksWithMore, WorksWith } from "./AssistantMarks";
import { CardsHero } from "./CardsHero";
import type { SampleCard } from "./cards";
import { FeatureSection, Wide } from "./FeatureSection";
import { FreeBadge } from "./FreeBadge";
import { NOTES_TO_FLASHCARDS_QUESTIONS } from "./faq";
import { HeroLiftOff, type HeroWord } from "./HeroScenes";
import { LandingLayout } from "./LandingLayout";
import { BENTO_HUES, LanguageBento, Tile } from "./LanguageBento";
import { DetailsSection, ReturnSection, TogetherSection } from "./LanguageSections";
import { type Material, MaterialToCards } from "./MaterialToCards";
import { Pick } from "./Pick";
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";
import { DiagramTile, OldDecksTile, PdfTile, TagReview } from "./StudyTiles";

export const NOTES_TO_FLASHCARDS_TITLE = msg`Turn notes and PDFs into flashcards · Lymi`;
export const NOTES_TO_FLASHCARDS_BLURB = msg`Snap your class notes or drop in a PDF, and Lymi turns the key terms into flashcards with spaced repetition. Your AI assistant can add them too. Free.`;

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
          <p className="text-xs text-ink-muted">
            <Trans>Lecture 4 · Cell transport</Trans>
          </p>
          <ul className="mt-4 flex flex-col gap-2.5 text-sm text-pretty text-ink @2xl:text-md">
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
        <figcaption className="mt-3 text-center text-xs text-ink-muted tabular-nums">
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
        <p className="text-2xl text-ink-muted">
          <Trans>Econ · week 3</Trans>
        </p>
        <ul className="mt-4 flex flex-col gap-3 text-2xl leading-tight text-ink @2xl:text-[1.625rem]">
          <li>
            <Trans>
              <Pick on={lit(0)}>opportunity cost</Pick>{" "}
              <span className="text-ink-secondary">= what you give up</span>
            </Trans>
          </li>
          <li>
            <Trans>
              <Pick on={lit(1)}>marginal cost</Pick>{" "}
              <span className="text-ink-secondary">= cost of 1 more</span>
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
        <p className="text-xs text-ink-muted">
          <Trans>History notes</Trans>
        </p>
        <p className="mt-3 text-xl font-medium tracking-[-0.02em] text-ink">
          <Trans>The Thirty Years’ War</Trans>
        </p>
        <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-sm text-pretty text-ink-secondary @2xl:text-md">
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
      <p className="text-2xl text-ink-muted">
        <Trans>Exam revision</Trans>
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-2xl leading-tight text-ink">
        {HAND.map((card, i) => (
          <li key={card.id}>{mark(i, i18n._(card.term))}</li>
        ))}
      </ul>
    </div>
  );
}

/** Two cards in the study group's shared deck. */
const STUDY_GROUP_CARDS = [
  { term: msg`osmosis`, meaning: msg`Water moving across a membrane` },
  { term: msg`mitosis`, meaning: msg`A cell dividing in two` },
];

/** For the student with a folder of notes and slides and a test coming. */
export function NotesToFlashcardsView() {
  const { t, i18n } = useLingui();
  const osmosis = { ...OSMOSIS, term: i18n._(OSMOSIS.term) };
  const words: HeroWord[] = HAND.map((card) => ({
    id: card.id,
    term: i18n._(card.term),
    label: i18n._(card.source),
    meaning: i18n._(card.meaning),
  }));

  return (
    <LandingLayout
      page="notesToFlashcards"
      hero={
        <CardsHero
          badge={<FreeBadge />}
          title={<Trans>Turn your notes into flashcards.</Trans>}
          lede={
            <Trans>
              Snap a page of notes or drop in a PDF. Lymi picks out the key terms and makes the
              cards, ready to review.
            </Trans>
          }
          secondary={{ href: "#material", label: <Trans>See how it works</Trans> }}
          after={<WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />}
          visual={
            <HeroLiftOff
              words={words}
              chip="notes-hand text-2xl leading-tight"
              material={(mark) => <RevisionNotes mark={mark} />}
            />
          }
        />
      }
    >
      <Wide
        id="material"
        title={<Trans>Slides, photos or typed notes.</Trans>}
        body={
          <Trans>
            Drop them into Smart add. Lymi picks out the terms, keeps the definitions from your
            notes and skips the ones already in your deck. No assistant needed.
          </Trans>
        }
      >
        <div className="mt-12">
          <MaterialToCards materials={MATERIALS} />
        </div>
      </Wide>

      <FeatureSection
        tinted
        title={<Trans>Or send it from your AI assistant.</Trans>}
        body={
          <Trans>
            Your assistant reads the file, picks out the terms and adds them in one go. Later it can
            tell you which ones you keep missing.
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
                    Added 14 cards to Biology, with the slides’ definitions. I skipped “diffusion”,
                    which you already have.
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

      <ReturnSection
        lang={i18n.locale}
        term={() => t`ATP`}
        title={<Trans>Review less, remember longer.</Trans>}
        body={
          <Trans>
            Each time you remember a card, Lymi waits longer before showing it again. Forget it, and
            it comes back soon. A few minutes a day before the test beats a night of cramming.
          </Trans>
        }
      />

      <TogetherSection
        name={msg`Biology study group`}
        language={i18n.locale}
        cards={STUDY_GROUP_CARDS.map((card) => ({ ...card, term: i18n._(card.term) }))}
        body={
          <Trans>
            Make one deck for your study group and share its link. Everyone gets each new card as
            it’s added, and keeps their own schedule.
          </Trans>
        }
      />

      <DetailsSection title={<Trans>Built for studying.</Trans>}>
        <LanguageBento layout="wide">
          <Tile
            wide
            hue={BENTO_HUES[0]}
            title={<Trans>Go over one lecture before the test</Trans>}
            body={<Trans>Tag cards by lecture, pick one tag and review just those cards.</Trans>}
          >
            <TagReview
              tags={[
                [t`Lecture 4`, 18],
                [t`Lecture 5`, 23],
                [t`Lecture 6`, 14],
              ]}
            />
          </Tile>
          <PdfTile files={[t`cell-transport.pdf`, t`lecture-5-slides.pdf`]} />
          <DiagramTile />
          <OldDecksTile />
        </LanguageBento>
      </DetailsSection>

      <Questions title={<Trans>Common questions.</Trans>} items={NOTES_TO_FLASHCARDS_QUESTIONS} />

      <SignUpSection title={<Trans>Start with today’s notes.</Trans>} />
    </LandingLayout>
  );
}
