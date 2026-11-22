import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ClassHero } from "./ClassHero";
import { TEACHERS_QUESTIONS } from "./faq";
import { FeatureSection } from "./FeatureSection";
import { JoinLinkDemo } from "./JoinLinkDemo";
import { LandingLayout } from "./LandingLayout";
import { BENTO_HUES, CheckList, LanguageBento, Tile } from "./LanguageBento";
import { DetailsSection, ReturnSection } from "./LanguageSections";
import { LibraryDemo } from "./LibraryDemo";
import { Questions } from "./Questions";
import { SeriesDemo } from "./SeriesDemo";
import { SignUpSection } from "./SignUpSection";
import { DeckStyle } from "./StudyTiles";
import { type UseCase, UseCases } from "./UseCases";

export const TEACHERS_TITLE = msg`Lymi for teachers · One deck for your whole class`;
export const TEACHERS_BLURB = msg`Build a course in sections, share it with one link, and add what you taught after every lesson. Each learner reviews on their own schedule.`;

/** A shared deck's People: who joined, and an invitation still waiting. */
function People() {
  return (
    <div aria-hidden="true" className="grid gap-2">
      <p className="flex items-center justify-between gap-3 rounded-md bg-plate px-4 py-3 text-md edge">
        <span className="truncate text-ink-muted">anna@example.com</span>
        <span className="shrink-0 rounded-md bg-amber px-3 py-1 text-sm font-medium text-amber-ink">
          <Trans>Invite</Trans>
        </span>
      </p>
      <ul className="grid gap-2">
        {[
          ["Mari", <Trans key="j">Joined</Trans>],
          ["Jaan", <Trans key="i">Invited</Trans>],
        ].map(([name, state]) => (
          <li
            key={String(name)}
            className="flex items-center justify-between gap-3 rounded-md bg-plate px-4 py-3 text-md edge"
          >
            <span className="text-ink">{name}</span>
            <span className="text-ink-muted">{state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The page for tutors and small classes: build the course, share it, keep adding to it. */
export function TeachersView() {
  const subjects: UseCase[] = [
    {
      id: "languages",
      title: <Trans>A language class</Trans>,
      body: <Trans>The words and phrases from each unit of the course.</Trans>,
      card: {
        label: msg`Eesti · verb`,
        term: "kohtuma",
        language: "et",
        meaning: msg`To meet`,
      },
    },
    {
      id: "medicine",
      title: <Trans>Medicine and nursing</Trans>,
      body: <Trans>Anatomy, drugs and the terms learners meet on the ward.</Trans>,
      card: {
        label: msg`Anatomy`,
        term: "brachial plexus",
        meaning: msg`The network of nerves that runs from the neck into the arm`,
      },
    },
    {
      id: "music",
      title: <Trans>Music lessons</Trans>,
      body: <Trans>Chords, scales and the theory behind the pieces you play.</Trans>,
      card: {
        label: msg`Music theory`,
        term: "dominant seventh",
        meaning: msg`A major chord with a minor seventh, built on the fifth note of the key`,
      },
    },
    {
      id: "exams",
      title: <Trans>Exam preparation</Trans>,
      body: <Trans>Dates, definitions and formulas to know on the day.</Trans>,
      card: {
        label: msg`History`,
        term: "Treaty of Tartu, 1920",
        meaning: msg`Soviet Russia recognised Estonia’s independence`,
      },
    },
  ];

  return (
    <LandingLayout page="teachers" hero={<ClassHero />}>
      <UseCases title={<Trans>For any subject you teach.</Trans>} items={subjects} />

      <FeatureSection
        id="course"
        demoFirst
        title={<Trans>Build the course in order.</Trans>}
        body={
          <Trans>
            Split a deck into sections, one per unit. Learners start with the first, and the next
            opens once they know most of it, so nobody meets unit six on day one. Anyone ahead can
            start the next section early.
          </Trans>
        }
      >
        <SeriesDemo />
      </FeatureSection>

      <FeatureSection
        tinted
        title={<Trans>Share one link.</Trans>}
        body={
          <Trans>
            Post the join link in your class chat. Everyone who joins gets each card as you add it,
            and keeps their own schedule. Turn the link off once the class is full.
          </Trans>
        }
      >
        <JoinLinkDemo />
      </FeatureSection>

      <ReturnSection
        lang="et"
        term={() => "tere"}
        title={<Trans>Every learner on their own schedule.</Trans>}
        body={
          <Trans>
            Each time a learner remembers a card, Lymi waits a little longer before showing it
            again. Every learner’s grades set their own schedule, so the class keeps what you
            taught.
          </Trans>
        }
      />

      <DetailsSection
        title={<Trans>Built for teaching.</Trans>}
        body={<Trans>What helps once the class is under way.</Trans>}
      >
        <LanguageBento layout="wide">
          <Tile
            wide
            hue={BENTO_HUES[0]}
            title={<Trans>Start from a ready-made deck</Trans>}
            body={
              <Trans>
                Pick a free deck from the library and send your class its link. Each learner adds it
                in one tap.
              </Trans>
            }
          >
            <LibraryDemo />
          </Tile>
          <Tile
            hue={BENTO_HUES[1]}
            title={<Trans>Invite by email, see who’s in</Trans>}
            body={
              <Trans>
                Invite learners by email as well as by link, and see who has joined the deck.
              </Trans>
            }
          >
            <People />
          </Tile>
          <Tile
            hue={BENTO_HUES[2]}
            title={<Trans>AI follows your deck’s style</Trans>}
            body={
              <Trans>
                Tell a deck how to write, and AI matches it and the cards you wrote yourself.
              </Trans>
            }
          >
            <DeckStyle
              instructions={<Trans>Instructions: A1 learners. Short, everyday examples.</Trans>}
              term="kohtuma"
              lang="et"
              meaning={<Trans>To meet</Trans>}
            />
          </Tile>
          <Tile
            hue={BENTO_HUES[3]}
            title={<Trans>Fill it from your tools</Trans>}
            body={
              <Trans>
                Send a lesson plan to your AI assistant, or use Lymi’s public API from your own
                tools.
              </Trans>
            }
          >
            <CheckList
              items={[
                <Trans key="s">A word list from a spreadsheet</Trans>,
                <Trans key="p">Cards from your course platform</Trans>,
                <Trans key="d">What’s due, on your class site</Trans>,
              ]}
            />
            <a
              href="/docs/api"
              className="mt-4 inline-flex text-md font-medium text-ink underline decoration-edge-strong underline-offset-4 hoverable:hover:decoration-current"
            >
              <Trans>API reference</Trans>
            </a>
          </Tile>
        </LanguageBento>
      </DetailsSection>

      <Questions title={<Trans>Questions from teachers.</Trans>} items={TEACHERS_QUESTIONS} />

      <SignUpSection title={<Trans>Bring Lymi to your next class.</Trans>} />
    </LandingLayout>
  );
}
