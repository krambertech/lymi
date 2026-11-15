import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

/** Written for a learner taking their cards somewhere else, not for a developer. */
export function Export() {
  return (
    <div className="doc-prose">
      <Lead>
        Take one deck or your whole library out of Lymi, with its pictures, due dates and review
        history. An Anki package opens in Anki and Mochi. A Lymi file keeps Lymi’s card fields,
        media and review history for importing later. Sections and series are not recreated by the
        importer yet.
      </Lead>

      <H2>Export in three steps</H2>
      <Steps>
        <div>
          <StepTitle>Choose what to export</StepTitle>
          <p>
            For one deck, open the deck, open its <strong>…</strong> menu and choose{" "}
            <strong>Export</strong>. For every deck at once, open <strong>Settings</strong> from the
            menu under your name and choose <strong>Export library</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Choose a format</StepTitle>
          <p>
            Pick <strong>Anki package</strong> for Anki, AnkiDroid, AnkiMobile or Mochi, or{" "}
            <strong>Lymi file</strong> to import into Lymi later. A single deck can also go to a{" "}
            <strong>Spreadsheet</strong>. Then press <strong>Export</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Download the file</StepTitle>
          <p>
            Anki packages and Lymi files are written on the server. A spreadsheet is made on your
            device and downloads directly. A deck usually takes a few seconds; a large library with
            many pictures takes longer, and you can close the app while it works. When the file is
            ready, press <strong>Download</strong>. The file also waits in <strong>Activity</strong>{" "}
            for a day.
          </p>
        </div>
      </Steps>

      <p>
        In the phone app, open <strong>Export library</strong> in <strong>You</strong>, or{" "}
        <strong>Export deck</strong> from a deck’s menu. Tap a format to start, then choose{" "}
        <strong>Save or share</strong> when it is ready.
      </p>

      <H2>What each format holds</H2>
      <Defs
        items={[
          {
            term: "Anki package (.apkg)",
            def: "One note per card with its term, meaning, pronunciation, example, notes and tags. A card asked both ways has two Anki cards. Each card keeps its due date, its memory state and every review you graded, and its picture, recordings and any pronunciation Lymi generated come along as media.",
          },
          {
            term: "Lymi file (.zip)",
            def: "Card fields and learning progress: every field and where it came from, tags, review modes, pictures with their descriptions, due dates and the full review history. The importer restores the cards into decks, but does not recreate sections or series.",
          },
          {
            term: "Spreadsheet (.csv)",
            def: "One deck's terms, meanings, pronunciation, examples, notes, state and next due date, for a spreadsheet. No pictures and no review history.",
          },
        ]}
      />

      <H2>Open an Anki package</H2>
      <H3>In Anki</H3>
      <p>
        In Anki on a computer, choose <strong>File</strong>, then <strong>Import</strong>, and
        choose the <code>.apkg</code> file. Tick <strong>Import any learning progress</strong> so
        each card keeps its due date and history. Your decks appear with the names they have in
        Lymi, using the note types <strong>Lymi</strong>, <strong>Lymi (meaning first)</strong> and{" "}
        <strong>Lymi (both ways)</strong>. On a phone, open the file with AnkiDroid or AnkiMobile.
      </p>
      <H3>In Mochi</H3>
      <p>
        Use Mochi’s Anki import and choose the <code>.apkg</code> file. Mochi brings the cards and
        their review history across and turns the card formatting into Markdown, so a card may look
        a little different there.
      </p>
      <H3>Other apps</H3>
      <p>
        RemNote, Noji and other apps that import Anki packages read the same file. How much of the
        history they keep is up to each app.
      </p>

      <H2>Import a Lymi file</H2>
      <p>
        Choose <strong>Lymi</strong> under Import and select the original <code>.zip</code> file.
        The <a href="/docs/import-from-lymi">Lymi import guide</a> explains the preview, what comes
        back and the limits.
      </p>

      <H2>Shared decks</H2>
      <p>
        Only decks you own can be exported. A library export leaves out decks shared with you. Your
        own decks include your due dates and review history, never another learner’s.
      </p>

      <H2>If something goes wrong</H2>
      <H3>The library is too large for one file</H3>
      <p>Export one deck at a time. Each deck is its own file.</p>
      <H3>The download link stopped working</H3>
      <p>A file is deleted a day after it is written. Export again to get a new one.</p>

      <Note title="Only you can download your file">
        The file downloads only with your own session, or with an API key of yours. It is deleted
        from Lymi’s storage a day after it is written. The API offers the same export with a read
        key: see the API reference.
      </Note>

      <NextLinks
        items={[
          {
            to: "/docs/import-from-anki",
            title: "Import from Anki",
            blurb: "Bring your Anki decks into Lymi with their pictures, tags and history.",
          },
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "Start an export, poll it and download the file from a script.",
          },
        ]}
      />
    </div>
  );
}
