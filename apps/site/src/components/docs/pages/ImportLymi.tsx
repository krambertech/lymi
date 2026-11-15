import { H2, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

export function ImportLymi() {
  return (
    <div className="doc-prose">
      <Lead>
        A Lymi file brings cards and review history from a Lymi export into your account. Keep the
        exported .zip file together; do not unzip it before importing.
      </Lead>
      <H2>Import in three steps</H2>
      <Steps>
        <div>
          <StepTitle>Export a Lymi file</StepTitle>
          <p>
            In the source account, choose <strong>Export</strong> from a deck’s menu or{" "}
            <strong>Export library</strong> in Settings. Choose <strong>Lymi file</strong> and
            download it when ready. In the phone app, use <strong>Save or share</strong> to save it
            to Files.
          </p>
        </div>
        <div>
          <StepTitle>Open the file in the destination account</StepTitle>
          <p>
            Sign in to the account that should receive the cards. Open{" "}
            <strong>Settings → Import → Lymi</strong> on the web, or{" "}
            <strong>You → Import → Lymi</strong> in the phone app, and choose the <code>.zip</code>{" "}
            file.
          </p>
        </div>
        <div>
          <StepTitle>Check and import</StepTitle>
          <p>
            Check the decks, language and card preview, then start the import. Keep the app open
            while the file uploads. Once it is reading or importing, you can close it and return
            from Activity.
          </p>
        </div>
      </Steps>
      <H2>What comes across</H2>
      <p>
        Cards keep their fields and field sources, tags, review modes, pictures and descriptions,
        recordings, due dates and review history. Archived cards arrive archived. Past reviews
        appear in Insights without adding to your daily goal or streak.
      </p>
      <H2>What does not come across</H2>
      <p>
        Sections and series are recorded in the export but are not recreated by the importer yet.
        The cards arrive in their decks without those groups. Account settings, connected apps and
        deck memberships are not transferred. An export includes only decks the source account owns.
      </p>
      <H2>Existing cards and repeated imports</H2>
      <p>
        A matching active card already in your library is skipped. When you import the same source
        again, Lymi recognizes cards it previously imported, adds new ones and fills only empty
        fields on existing ones. Your edits stay. Later reviews from the source account do not keep
        syncing.
      </p>
      <Note title="Undo from Activity">
        <strong>Archive import</strong> archives cards the import added and decks it created that
        are left empty. It does not reverse changes to cards you already had.
      </Note>
      <H2>If something goes wrong</H2>
      <p>
        Choose the original Lymi <code>.zip</code> export, not a folder or a spreadsheet. Files can
        be up to 1 GB, with up to 64 MB of cards and review history. Export one deck at a time if a
        library is too large.
      </p>
      <NextLinks
        items={[
          {
            to: "/docs/export",
            title: "Export your decks",
            blurb: "Choose a format and download a deck or library.",
          },
          {
            to: "/docs/import",
            title: "Import cards",
            blurb: "Preview, duplicate handling and undo.",
          },
        ]}
      />
    </div>
  );
}
