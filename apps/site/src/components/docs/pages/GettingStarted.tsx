import { H2, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

export function GettingStarted() {
  return (
    <div className="doc-prose">
      <Lead>
        Start with a ready-made deck, bring cards from another app, or make your own. The same
        account keeps your cards and review progress across devices.
      </Lead>
      <H2>Choose where to start</H2>
      <NextLinks
        items={[
          {
            to: "/docs/decks",
            title: "Use a ready-made or shared deck",
            blurb: "Find a deck in Explore or open a join link from its owner.",
          },
          {
            to: "/docs/import",
            title: "Bring cards from another app",
            blurb: "Import from Anki, Mochi, Noji, Pleco, Quizlet or a Lymi file.",
          },
          {
            to: "/docs/mcp",
            title: "Connect an assistant",
            blurb: "Ask an assistant to turn your material into cards.",
          },
        ]}
      />
      <H2>Make your own cards</H2>
      <Steps>
        <div>
          <StepTitle>Create a deck</StepTitle>
          <p>
            Open <strong>Library</strong> and choose <strong>New deck</strong>. Give it a name. For
            a language deck, set the language so Lymi can add readings and pronunciation.
          </p>
        </div>
        <div>
          <StepTitle>Add a card</StepTitle>
          <p>
            Open the deck and choose <strong>Add card</strong>. The term is what you want to
            remember; the meaning is what you want to recall about it. You can also keep an example,
            notes and a picture.
          </p>
        </div>
        <div>
          <StepTitle>Check what the AI filled</StepTitle>
          <p>
            If AI services are allowed, Lymi can enrich missing fields according to the deck’s
            settings. A badge marks each field Lymi’s AI wrote. Edit anything that does not fit;
            text you wrote stays yours.
          </p>
        </div>
      </Steps>
      <p>
        For several cards at once, open <strong>Smart add</strong> and paste text or choose a PDF or
        photo. Check the cards it finds and choose which to add. Smart add needs AI services enabled
        in Settings.
      </p>
      <H2>Review from Today</H2>
      <p>
        Open <strong>Today</strong> and start a review. Try to recall the answer before revealing
        it, then choose <strong>Forgot</strong>, <strong>Hard</strong>, <strong>Good</strong> or{" "}
        <strong>Easy</strong>. Lymi uses your grade to decide when that card comes back.
      </p>
      <p>
        Your daily goal counts recall attempts, including Forgot and a card seen again. You can keep
        reviewing after meeting it. Finishing everything available also satisfies the day when there
        are fewer attempts than your goal.
      </p>
      <H2>Find what changed</H2>
      <p>
        <strong>Library</strong> holds your decks. <strong>Activity</strong> shows imports, exports
        and changes made by connected apps or Lymi’s AI. <strong>Insights</strong> shows your review
        history. Open <strong>Settings</strong> from your learner menu to change the app language,
        AI services, reminders and connected apps. In the phone app, these settings live in{" "}
        <strong>You</strong>.
      </p>
      <Note title="You control your cards">
        Archive a card or deck to hide it from review. Find it in <strong>Archived</strong> to
        restore it with its schedule. Deleting your account is a separate, permanent action.
      </Note>
      <NextLinks
        items={[
          {
            to: "/docs/mobile",
            title: "Lymi on your phone",
            blurb: "Add the web app to your home screen.",
          },
          {
            to: "/docs/scheduling",
            title: "Review scheduling",
            blurb: "How Lymi decides when a card returns and what comes next.",
          },
        ]}
      />
    </div>
  );
}
