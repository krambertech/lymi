import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight, RotateCcw, Star } from "lucide-react";
import { Added, AssistantChat } from "./AssistantChat";
import type { SampleCard } from "./cards";
import { FeatureSection } from "./FeatureSection";
import { MEDICINE_QUESTIONS } from "./faq";
import { Hero } from "./Hero";
import type { HandCard } from "./hand-cards";
import { ImportDemo } from "./ImportDemo";
import { LandingLayout } from "./LandingLayout";
import { Questions } from "./Questions";
import { RightMoment } from "./RightMoment";
import { SignUpSection } from "./SignUpSection";
import { type UseCase, UseCases } from "./UseCases";

export const MEDICINE_TITLE = msg`Lymi for medical students · Flashcards with spaced repetition`;
export const MEDICINE_BLURB = msg`Flashcards for anatomy, pharmacology, microbiology and lab values. Bring your Anki decks with their review history, turn lecture notes into cards, and review a few minutes a day. Free.`;

/** Facts every medical course asks for, checked against standard references. No clip plays. */
const HAND: HandCard[] = [
  {
    id: "brachial-plexus",
    source: msg`Anatomy`,
    term: "brachial plexus",
    meaning: msg`The network of nerves that runs from the neck into the arm`,
    note: msg`Roots, trunks, divisions, cords, branches: from C5 to T1.`,
    audio: null,
  },
  {
    id: "metformin",
    source: msg`Pharmacology`,
    term: "metformin",
    meaning: msg`A first-line drug for type 2 diabetes; it lowers the glucose the liver makes`,
    note: msg`Its rare, serious risk is lactic acidosis.`,
    audio: null,
  },
  {
    id: "serum-sodium",
    source: msg`Lab values`,
    term: "serum sodium",
    meaning: msg`135–145 mmol/L in adults`,
    audio: null,
  },
  {
    id: "kussmaul",
    source: msg`Clinical signs`,
    term: "Kussmaul breathing",
    meaning: msg`Deep, laboured breathing in metabolic acidosis, as in diabetic ketoacidosis`,
    audio: null,
  },
  {
    id: "staph-aureus",
    source: msg`Microbiology`,
    term: "Staphylococcus aureus",
    meaning: msg`Gram-positive cocci in clusters; coagulase-positive`,
    audio: null,
  },
];

const METFORMIN: SampleCard = {
  label: msg`Pharmacology · new`,
  term: "metformin",
  meaning: msg`A first-line drug for type 2 diabetes; it lowers the glucose the liver makes`,
};

/** A medical student's semester: anatomy, drugs, bugs and numbers, each its own deck. */
export function MedicineView() {
  const subjects: UseCase[] = [
    {
      id: "anatomy",
      title: <Trans>Anatomy</Trans>,
      body: <Trans>Nerves, vessels, muscles and what each one does.</Trans>,
      card: {
        label: msg`Anatomy`,
        term: "cranial nerve VII",
        meaning: msg`The facial nerve: muscles of facial expression and taste on the front two-thirds of the tongue`,
      },
    },
    {
      id: "pharmacology",
      title: <Trans>Pharmacology</Trans>,
      body: <Trans>Drugs, how they work and what to watch for.</Trans>,
      card: METFORMIN,
    },
    {
      id: "lab-values",
      title: <Trans>Lab values</Trans>,
      body: <Trans>The ranges you’re expected to know cold.</Trans>,
      card: {
        label: msg`Lab values`,
        term: "serum potassium",
        meaning: msg`3.5–5.0 mmol/L in adults`,
      },
    },
    {
      id: "microbiology",
      title: <Trans>Microbiology</Trans>,
      body: <Trans>Organisms, stains and what they cause.</Trans>,
      card: {
        label: msg`Microbiology`,
        term: "Staphylococcus aureus",
        meaning: msg`Gram-positive cocci in clusters; coagulase-positive`,
      },
    },
  ];

  return (
    <LandingLayout
      page="medicine"
      hero={
        <Hero
          title={<Trans>Keep the nerves, the drugs and the numbers.</Trans>}
          lede={
            <Trans>
              Lymi brings each fact back right before you’d forget it, so a few minutes a day
              carries it to your exams and onto the ward. Free, and your Anki decks come with you.
            </Trans>
          }
          cards={HAND}
        />
      }
    >
      <UseCases title={<Trans>Every subject on one schedule.</Trans>} items={subjects} />

      <FeatureSection
        id="anki"
        title={<Trans>Bring your Anki decks.</Trans>}
        body={
          <Trans>
            Import an Anki package with its cards, tags, pictures and review history. Years of
            reviews carry on where they stopped, so nothing you already know starts over.
          </Trans>
        }
        after={<GuideLink href="/docs/import-from-anki" label={<Trans>Moving from Anki</Trans>} />}
      >
        <ImportDemo
          collection={{
            app: "Anki",
            fileName: "Pharmacology.apkg",
            megabytes: 38,
            cards: 3120,
            reviews: 48210,
            decks: 6,
            pictures: 410,
          }}
        />
      </FeatureSection>

      <FeatureSection
        demoFirst
        tinted
        title={<Trans>Turn tonight’s lecture into cards.</Trans>}
        body={
          <Trans>
            Send your lecture notes or slides to Claude, ChatGPT, Gemini or Grok and it adds the
            cards, each with what the lecture said. When Lymi’s AI fills in a meaning, it marks what
            it wrote, so it’s never mistaken for your notes.
          </Trans>
        }
      >
        <AssistantChat
          conversation={[
            {
              from: "you",
              body: (
                <Trans>Here are my notes from today’s pharmacology lecture. Add the drugs.</Trans>
              ),
            },
            {
              from: "them",
              body: (
                <Added card={METFORMIN}>
                  <Trans>
                    Added 14 cards to Pharmacology, each with its mechanism from your notes.
                  </Trans>
                </Added>
              ),
            },
            { from: "you", body: <Trans>What’s due tonight?</Trans> },
            {
              from: "them",
              body: <Trans>32 cards: 20 from pharmacology and 12 from anatomy.</Trans>,
            },
          ]}
        />
      </FeatureSection>

      <RightMoment
        title={<Trans>Review less, remember longer.</Trans>}
        body={
          <Trans>
            Remember a card, and Lymi waits longer before showing it again. Forget it, and it comes
            back soon.
          </Trans>
        }
      />

      <FeatureSection
        title={<Trans>Mark what’s high-yield.</Trans>}
        body={
          <Trans>
            Mark a card important and it comes up four times as often, while its schedule stays the
            same. The cards you keep forgetting gather in Often forgotten, a round of their own.
          </Trans>
        }
      >
        <FocusDemo />
      </FeatureSection>

      <Questions
        title={<Trans>Questions from medical students.</Trans>}
        items={MEDICINE_QUESTIONS}
      />

      <SignUpSection title={<Trans>Start with tonight’s lecture.</Trans>} />
    </LandingLayout>
  );
}

function GuideLink({ href, label }: { href: string; label: React.ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-xs text-md font-medium text-ink"
    >
      {label}
      <ArrowRight
        aria-hidden="true"
        className="size-4 transition-transform duration-200 ease-out rtl:-scale-x-100 hoverable:group-hover:translate-x-0.5"
      />
    </a>
  );
}

const FOCUS = [
  {
    term: "digoxin",
    meaning: msg`Narrow therapeutic range; check levels and potassium`,
    important: true,
  },
  {
    term: "anion gap",
    meaning: msg`Na⁺ − (Cl⁻ + HCO₃⁻); raised in some metabolic acidoses`,
    important: true,
  },
  {
    term: "ulnar nerve",
    meaning: msg`Injured at the elbow; weak grip and numb little finger`,
    important: false,
  },
];

/** A few cards with the important star, and the round that gathers what keeps slipping. */
function FocusDemo() {
  const { t, i18n } = useLingui();
  return (
    <div className="mx-auto w-full max-w-[440px]">
      <ul className="overflow-hidden rounded-xl bg-plate edge">
        {FOCUS.map((card) => (
          <li
            key={card.term}
            className="flex items-start gap-3 border-t border-edge px-5 py-4 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-md font-medium text-ink">{card.term}</p>
              <p className="mt-0.5 text-sm text-pretty text-ink-secondary">
                {i18n._(card.meaning)}
              </p>
            </div>
            <Star
              aria-label={card.important ? t`Important` : t`Not marked important`}
              className={
                card.important
                  ? "mt-0.5 size-5 shrink-0 fill-amber text-amber"
                  : "mt-0.5 size-5 shrink-0 text-ink-faint"
              }
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-plate px-5 py-4 edge">
        <span className="flex items-center gap-2.5 text-md font-medium text-ink">
          <RotateCcw aria-hidden="true" className="size-4 text-ink-secondary" />
          <Trans>Often forgotten</Trans>
        </span>
        <span className="text-sm text-ink-muted tabular-nums">
          <Plural value={6} one="# card" other="# cards" />
        </span>
      </div>
    </div>
  );
}
