import { H2, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

export function ImportQuizlet() {
  return (
    <div className="doc-prose">
      <Lead>
        Paste terms and definitions from a Quizlet set you made, or bring a text list with the same
        structure. Pictures, audio and review progress stay behind, so the cards start as new.
      </Lead>
      <H2>Copy your set</H2>
      <p>
        On <a href="https://quizlet.com">quizlet.com</a>, open your set, open its <strong>…</strong>{" "}
        menu and choose <strong>Export</strong>. Keep <strong>Tab</strong> between the term and
        definition and <strong>New line</strong> between cards. Choose <strong>Copy text</strong>.
      </p>
      <p>
        Quizlet exports sets you created from its website. See{" "}
        <a href="https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets">
          Quizlet’s export guide
        </a>{" "}
        if the option is missing.
      </p>
      <H2>Import into Lymi</H2>
      <Steps>
        <div>
          <StepTitle>Open Quizlet under Import</StepTitle>
          <p>
            Open <strong>Settings → Import → Quizlet</strong> on the web, or{" "}
            <strong>You → Import → Quizlet</strong> in the phone app.
          </p>
        </div>
        <div>
          <StepTitle>Paste the text or choose a file</StepTitle>
          <p>
            Paste into <strong>Your set’s text</strong>, or choose a <code>.txt</code> file. The
            picker also accepts <code>.tsv</code> and <code>.csv</code> text lists. This imports
            pairs of terms and definitions; it is not a full spreadsheet import with every card
            field.
          </p>
        </div>
        <div>
          <StepTitle>Check the separators and preview</StepTitle>
          <p>
            Lymi detects how terms and rows are separated. Check the first cards in the preview.
            Change <strong>Between term and definition</strong> or <strong>Between rows</strong> if
            they are split incorrectly. For cards with line breaks, use a custom row separator such
            as <code>##</code> in both the source export and Lymi.
          </p>
        </div>
        <div>
          <StepTitle>Choose a deck and continue</StepTitle>
          <p>
            Choose a deck you own, or <strong>A new deck</strong> and a set name. Continue through
            the import preview, check the language and card fields, then start the import. It
            appears in Library and Activity when finished.
          </p>
        </div>
      </Steps>
      <H2>What comes across</H2>
      <p>
        The term becomes the card’s term and the definition becomes its meaning. Empty rows and rows
        with only one side are skipped. The preview counts them. Existing cards are checked for
        duplicates before the import writes them.
      </p>
      <H2>If something goes wrong</H2>
      <p>
        If no cards appear, check the separators and make sure each row has a term and a definition.
        One import takes up to 5,000 cards and 5 MB of text; split a larger set into parts.
      </p>
      <Note title="Undo from Activity">
        Open the import in <strong>Activity</strong> and choose <strong>Archive import</strong> to
        archive cards it added. Cards already in your deck stay.
      </Note>
      <NextLinks
        items={[
          {
            to: "/docs/import",
            title: "Import cards",
            blurb: "Other formats, duplicate handling and importing again.",
          },
        ]}
      />
    </div>
  );
}
