import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Added, AssistantChat } from "./AssistantChat";
import { AssistantMarksWithMore, WorksWith } from "./AssistantMarks";
import type { SampleCard } from "./cards";
import { FeatureSection } from "./FeatureSection";
import { FreeBadge } from "./FreeBadge";
import { CERTIFICATIONS_QUESTIONS } from "./faq";
import { Hero } from "./Hero";
import type { HandCard } from "./hand-cards";
import { LandingLayout } from "./LandingLayout";
import { BENTO_HUES, LanguageBento, Tile } from "./LanguageBento";
import { DetailsSection, ReturnSection } from "./LanguageSections";
import { Questions } from "./Questions";
import { SignUpSection } from "./SignUpSection";
import { OfflineTile, OldDecksTile, PdfTile, TagReview } from "./StudyTiles";
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

/** For the professional booked on an exam: the guide becomes a deck, and review fits the commute. */
export function CertificationsView() {
  const { t } = useLingui();
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
    <LandingLayout
      page="certifications"
      hero={
        <Hero
          badge={<FreeBadge />}
          title={<Trans>Flashcards for your certification exam.</Trans>}
          lede={
            <Trans>
              Drop in your study guide and Lymi turns each chapter’s key terms into cards. Review a
              few minutes a day, and keep reviewing after the exam.
            </Trans>
          }
          secondary={{ href: "#guide", label: <Trans>See how it works</Trans> }}
          after={<WorksWith names={["Claude", "ChatGPT", "Grok", "Gemini"]} />}
          cards={HAND}
        />
      }
    >
      <UseCases title={<Trans>For the exam you’re studying for.</Trans>} items={fields} />

      <FeatureSection
        id="guide"
        title={<Trans>Turn a study guide into cards.</Trans>}
        body={
          <Trans>
            Drop a chapter into Smart add, or send it to Claude, ChatGPT, Gemini or Grok and ask for
            the key terms. Each card keeps the guide’s definition.
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

      <ReturnSection
        lang="en"
        term={() => "SAML"}
        title={<Trans>Ten minutes between meetings.</Trans>}
        body={
          <Trans>
            Each time you remember a term, Lymi waits longer before showing it again. Forget it, and
            it comes back soon. A few cards between meetings is enough.
          </Trans>
        }
      />

      <DetailsSection title={<Trans>Built for exam prep.</Trans>}>
        <LanguageBento layout="wide">
          <Tile
            wide
            hue={BENTO_HUES[0]}
            title={<Trans>One chapter at a time</Trans>}
            body={<Trans>Tag cards by chapter, pick one tag and review just those cards.</Trans>}
          >
            <TagReview
              tags={[
                [t`Chapter 3`, 24],
                [t`Chapter 4`, 18],
                [t`Chapter 5`, 31],
              ]}
            />
          </Tile>
          <PdfTile files={[t`security-plus-chapter-4.pdf`, t`practice-exam-notes.pdf`]} />
          <OfflineTile />
          <OldDecksTile />
        </LanguageBento>
      </DetailsSection>

      <Questions title={<Trans>Common questions.</Trans>} items={CERTIFICATIONS_QUESTIONS} />

      <SignUpSection title={<Trans>Start with chapter one.</Trans>} />
    </LandingLayout>
  );
}
