import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { openLymiUrl } from "../../lib/origins";
import { Added, AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { FeatureSection } from "./FeatureSection";
import { CERTIFICATIONS_QUESTIONS } from "./faq";
import { Hero } from "./Hero";
import type { HandCard } from "./hand-cards";
import { Questions } from "./Questions";
import { ReviewDemo } from "./ReviewDemo";
import { RightMoment } from "./RightMoment";
import { SignUpSection } from "./SignUpSection";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { type UseCase, UseCases } from "./UseCases";

export const CERTIFICATIONS_TITLE = msg`Lymi for certification prep · Flashcards with spaced repetition`;
export const CERTIFICATIONS_BLURB = msg`Flashcards for cloud, security, finance and project management certifications. Turn your study guide into cards with your AI assistant and review a few minutes a day. Free.`;

/** Terms the common certifications ask about, in their usual definitions. No clip plays. */
const HAND: HandCard[] = [
  {
    id: "least-privilege",
    source: msg`Security`,
    term: "least privilege",
    meaning: msg`Give each account only the access its task needs`,
    audio: null,
  },
  {
    id: "rpo",
    source: msg`Cloud`,
    term: "RPO",
    meaning: msg`Recovery point objective: how much data, measured in time, you can afford to lose`,
    note: msg`Its partner, RTO, is how long you can afford to be down.`,
    audio: null,
  },
  {
    id: "critical-path",
    source: msg`Project management`,
    term: "critical path",
    meaning: msg`The longest chain of dependent tasks; it sets the earliest finish date`,
    audio: null,
  },
  {
    id: "accrual",
    source: msg`Accounting`,
    term: "accrual",
    meaning: msg`Revenue or cost recorded when it is earned or incurred, not when cash moves`,
    audio: null,
  },
  {
    id: "subnet-mask",
    source: msg`Networking`,
    term: "subnet mask",
    meaning: msg`Which part of an IP address names the network`,
    audio: null,
  },
];

const LEAST_PRIVILEGE: SampleCard = {
  label: msg`Security+ · new`,
  term: "least privilege",
  meaning: msg`Give each account only the access its task needs`,
};

const REVIEW: SampleCard[] = [
  {
    label: msg`Cloud`,
    term: "RTO",
    meaning: msg`Recovery time objective: how long a service can be down`,
  },
  {
    label: msg`Security`,
    term: "SAML",
    meaning: msg`A standard for signing in once and passing that identity to other services`,
  },
  {
    label: msg`Finance`,
    term: "duration",
    meaning: msg`How much a bond’s price moves when interest rates change`,
  },
  {
    label: msg`Project management`,
    term: "float",
    meaning: msg`How long a task can slip without delaying the project`,
  },
];

/** For the professional booked on an exam: the guide becomes a deck, and review fits the commute. */
export function CertificationsView() {
  const openAppUrl = openLymiUrl();
  const fields: UseCase[] = [
    {
      id: "cloud",
      title: <Trans>Cloud</Trans>,
      body: (
        <Trans>
          AWS, Azure and Google Cloud: services, limits and the trade-offs between them.
        </Trans>
      ),
      card: {
        label: msg`Cloud`,
        term: "RPO",
        meaning: msg`Recovery point objective: how much data, measured in time, you can afford to lose`,
      },
    },
    {
      id: "security",
      title: <Trans>Security</Trans>,
      body: <Trans>Security+, CISSP and the acronyms that come with them.</Trans>,
      card: LEAST_PRIVILEGE,
    },
    {
      id: "finance",
      title: <Trans>Finance and accounting</Trans>,
      body: <Trans>CFA, ACCA and CPA terms, formulas and standards.</Trans>,
      card: {
        label: msg`Accounting`,
        term: "accrual",
        meaning: msg`Revenue or cost recorded when it is earned or incurred, not when cash moves`,
      },
    },
    {
      id: "projects",
      title: <Trans>Project management</Trans>,
      body: <Trans>PMP and PRINCE2: processes, roles and the vocabulary.</Trans>,
      card: {
        label: msg`Project management`,
        term: "critical path",
        meaning: msg`The longest chain of dependent tasks; it sets the earliest finish date`,
      },
    },
  ];

  return (
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="certifications" />
        <Hero
          title={<Trans>Study for the certification. Keep what it taught you.</Trans>}
          lede={
            <Trans>
              Turn your study guide into cards and review a few minutes a day. Lymi brings each term
              back right before you’d forget it, from the first chapter to exam day and after.
            </Trans>
          }
          cards={HAND}
        />
      </header>

      <main>
        <UseCases title={<Trans>For the exam you’re booked on.</Trans>} items={fields} />

        <FeatureSection
          title={<Trans>Turn a study guide into cards.</Trans>}
          body={
            <Trans>
              Send a chapter to Claude, ChatGPT or Gemini and ask for the key terms. Each one lands
              in your deck with the guide’s definition, ready for tonight’s review.
            </Trans>
          }
          after={<AssistantMarksWithMore />}
        >
          <AssistantChat
            conversation={[
              {
                from: "you",
                body: <Trans>Here’s chapter 4 of my Security+ guide. Add the key terms.</Trans>,
              },
              {
                from: "them",
                body: (
                  <Added card={LEAST_PRIVILEGE}>
                    <Trans>Added 18 cards to Security+, each with the guide’s definition.</Trans>
                  </Added>
                ),
              },
              { from: "you", body: <Trans>Which ones do I keep getting wrong?</Trans> },
              {
                from: "them",
                body: <Trans>Three: SAML, CVSS, and the difference between RTO and RPO.</Trans>,
              },
            ]}
          />
        </FeatureSection>

        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Ten minutes between meetings.</Trans>}
          body={
            <Trans>
              One card at a time, graded in a tap, on your phone or your laptop, even offline. The
              terms you know wait longer, and the ones you miss come back sooner.
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

        <Questions
          title={<Trans>Questions before you start.</Trans>}
          items={CERTIFICATIONS_QUESTIONS}
        />

        <SignUpSection title={<Trans>Start with chapter one.</Trans>} />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="certifications" />
    </div>
  );
}
