import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { productUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { ApiConnections } from "./ApiConnections";
import { ClassHero } from "./ClassHero";
import { FeatureSection } from "./FeatureSection";
import { JoinLinkDemo } from "./JoinLinkDemo";
import { JoinSection } from "./JoinSection";
import { LibraryDemo } from "./LibraryDemo";
import { Questions } from "./Questions";
import { RightMoment } from "./RightMoment";
import { SeriesDemo } from "./SeriesDemo";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";
import { type UseCase, UseCases } from "./UseCases";

export const TEACHERS_TITLE = msg`Lymi for teachers · One deck for your whole class`;
export const TEACHERS_BLURB = msg`Build a course in sections, share it with one link, and add what you taught after every lesson. Each student reviews on their own schedule.`;

/** The page for tutors and small classes: build the course, share it, keep adding to it. */
export function TeachersView() {
  const openAppUrl = new URL("/", productUrl()).toString();
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
      body: <Trans>Anatomy, drugs and the terms students meet on the ward.</Trans>,
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
    <div className="@container min-h-dvh overflow-x-clip bg-canvas text-text">
      <header>
        <SiteNav openAppUrl={openAppUrl} current="teachers" />
        <ClassHero />
      </header>

      <main>
        <UseCases title={<Trans>Teach anything worth remembering.</Trans>} items={subjects} />

        <FeatureSection
          id="course"
          demoFirst
          title={<Trans>Build the course in order.</Trans>}
          body={
            <Trans>
              Split a deck into sections, one per unit. Students start with the first, and the next
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
              Post the join link in your class chat. Everyone who joins gets each card as you add
              it, and keeps their own schedule. Turn the link off once the class is full.
            </Trans>
          }
        >
          <JoinLinkDemo />
        </FeatureSection>

        <RightMoment
          title={<Trans>Repetition that works.</Trans>}
          body={
            <Trans>
              Memory fades. Recalling something at the right time strengthens it and lets the next
              gap grow. Lymi uses each student’s grades to decide when every card comes back.
            </Trans>
          }
        />

        <FeatureSection
          demoFirst
          tinted
          title={<Trans>Fill decks from the tools you already use.</Trans>}
          body={
            <Trans>
              Send a lesson plan to Claude or ChatGPT and it adds the cards for you. Lymi also has a
              public API, so you can bring in a list from a spreadsheet, add cards from your course
              platform, or show what’s due on your class site.
            </Trans>
          }
          after={
            <div className="flex flex-wrap gap-2">
              <a href="/docs" className={buttonClass("secondary")}>
                <Trans>See how it works</Trans>
              </a>
              <a href="/docs/api" className={buttonClass("ghost")}>
                <Trans>API reference</Trans>
              </a>
            </div>
          }
        >
          <ApiConnections />
        </FeatureSection>

        <FeatureSection
          title={<Trans>Start with a ready-made course.</Trans>}
          body={
            <Trans>
              Pick a course from the deck library, add it to your class and adapt it as you go.
              Share your own when it’s ready.
            </Trans>
          }
        >
          <LibraryDemo />
        </FeatureSection>

        <Questions
          title={<Trans>Questions from teachers.</Trans>}
          items={[
            {
              id: "edit",
              question: <Trans>Can students change the deck?</Trans>,
              answer: (
                <Trans>
                  No. Only you add and edit cards. Students review them, and each keeps their own
                  schedule and history.
                </Trans>
              ),
            },
            {
              id: "progress",
              question: <Trans>Can I see how each student is doing?</Trans>,
              answer: (
                <Trans>
                  No. Each student’s reviews stay private to them. Lymi is a place to practise, not
                  to be graded.
                </Trans>
              ),
            },
            {
              id: "subjects",
              question: <Trans>Is it only for languages?</Trans>,
              answer: (
                <Trans>
                  No. A card can hold anything worth remembering: a term, a date, a formula, a
                  chord. Language cards can also be said aloud.
                </Trans>
              ),
            },
            {
              id: "size",
              question: <Trans>Is it for schools?</Trans>,
              answer: (
                <Trans>
                  It’s made for tutors and small classes. There are no rosters, assignments or
                  grades.
                </Trans>
              ),
            },
          ]}
        />

        <JoinSection
          title={<Trans>Bring Lymi to your next class.</Trans>}
          source="teachers"
          note={
            <Trans>
              Sections and the deck library are rolling out during the beta. We’ll tell you when
              your account has them.
            </Trans>
          }
        />
      </main>

      <SiteFooter openAppUrl={openAppUrl} page="teachers" />
    </div>
  );
}
