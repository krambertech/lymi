import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

/** Written for a learner who has never exported anything, not for a developer. */
export function ImportMochi() {
  return (
    <div className="doc-prose">
      <Lead>
        Bring your Mochi decks into Lymi with their cards, tags, pictures and review history. Your
        cards keep the due dates they had in Mochi, so nothing you already learned starts over.
        Mochi itself is not changed.
      </Lead>

      <H2>Import in four steps</H2>
      <Steps>
        <div>
          <StepTitle>Export from Mochi</StepTitle>
          <p>
            In Mochi, open the deck you want to bring, open its <strong>…</strong> menu and choose{" "}
            <strong>Export deck</strong>. To bring every deck at once, open{" "}
            <strong>Settings</strong> and choose <strong>Export everything</strong> instead.
          </p>
          <p>
            Save the <code>.mochi</code> file where you can find it. Use this format: Mochi’s
            Markdown and CSV exports leave out review history and tags, and Lymi cannot import them.
          </p>
        </div>
        <div>
          <StepTitle>Open the import in Lymi</StepTitle>
          <p>
            In Lymi, open <strong>Settings</strong> from the menu under your name, and under{" "}
            <strong>Import</strong> choose <strong>Mochi</strong>. Choose the file, or drop it on
            the page. Keep Lymi open while the file uploads.
          </p>
        </div>
        <div>
          <StepTitle>Check what comes across</StepTitle>
          <p>
            Lymi reads the file and shows what it found: how many cards, decks, pictures and past
            reviews, and which words you already have. Check two things.
          </p>
          <ul>
            <li>
              <strong>The language of each deck.</strong> Mochi does not store a language, so Lymi
              guesses from the deck name. Lymi needs the language to find duplicates and to say
              words out loud.
            </li>
            <li>
              <strong>How a card will look.</strong> Lymi shows one card of each kind as it will
              arrive. If the word and its meaning are the wrong way round, change which field is
              which.
            </li>
          </ul>
        </div>
        <div>
          <StepTitle>Import</StepTitle>
          <p>
            Press <strong>Import</strong>. Lymi writes the cards on its server, so you can close the
            app. When it finishes, your decks are in Library and the import is listed in{" "}
            <strong>Activity</strong>.
          </p>
        </div>
      </Steps>

      <H2>What comes across</H2>
      <Defs
        items={[
          {
            term: "Decks",
            def: "Every deck that holds cards becomes a Lymi deck named by its place in Mochi: Verbs inside Spanish becomes Spanish / Verbs. A deck that only holds other decks is not made.",
          },
          {
            term: "Cards without a template",
            def: "Mochi splits a card into sides at a --- line. The first side becomes the term and everything after it becomes the meaning. A card with no --- line comes across with a term only, and the preview counts those.",
          },
          {
            term: "Cards with a template",
            def: "Each field is matched by its name, and the field on the first side is usually the term. You can change what each field becomes before you import.",
          },
          {
            term: "Reversed cards",
            def: "A card with Review reverse turned on becomes one Lymi card asked both ways. Each way keeps its own history.",
          },
          {
            term: "Readings",
            def: "Furigana such as 漢字(かんじ) becomes the term 漢字 with the pronunciation かんじ.",
          },
          {
            term: "Formatting",
            def: "Markdown, such as bold text, headings and links, becomes plain text with line breaks.",
          },
          {
            term: "Tags",
            def: "Tags come across, up to 20 on a card.",
          },
          {
            term: "Pictures",
            def: "The first picture attached to a card becomes the card’s picture. Picture review waits until you describe it.",
          },
          {
            term: "Review history",
            def: "Every past review comes across on its original day and shows in Insights. Remembered counts as Good and Forgot as Again. Each card keeps the due date it had in Mochi.",
          },
          {
            term: "Archived cards",
            def: "They arrive archived. Cards and decks in Mochi’s trash are not imported.",
          },
        ]}
      />

      <H2>What stays behind</H2>
      <ul>
        <li>
          <strong>Audio.</strong> Lymi makes its own pronunciation for words in a language. The
          preview counts the sounds that are left out.
        </li>
        <li>
          <strong>What Mochi generated.</strong> Speech, image search results and AI text that Mochi
          made for template fields are not part of your cards in Lymi. Lymi can enrich a card
          itself.
        </li>
        <li>
          <strong>Extra pictures.</strong> A card has one picture in Lymi, so only the first comes
          across.
        </li>
        <li>
          <strong>Templates, styles and deck settings.</strong> Cloze gaps come across as plain
          text, and links to other cards keep only their text.
        </li>
        <li>
          <strong>Very long text.</strong> A meaning longer than 1,000 characters moves to the
          card’s notes. The preview counts every card with text that was cut or moved.
        </li>
      </ul>

      <H2>Your streak and today’s goal</H2>
      <p>
        Reviews you did in Mochi count as history, not as reviews done in Lymi. They light up the
        days you studied in Insights, but they never count toward today’s goal and never change your
        streak, even if you reviewed in Mochi this morning.
      </p>

      <H2>Words you already have</H2>
      <p>
        If a word is already in Lymi in the same language, the import skips it and keeps your card.
        The preview lists the words it will skip and the decks they are in.
      </p>

      <H2>Importing the same file again</H2>
      <p>
        Import the same deck again and Lymi recognises the cards it already brought across. It adds
        no copies. It adds cards that are new in Mochi, and fills a field on a card only if that
        field is empty in Lymi, so your edits stay. Reviews you did in Mochi after the first import
        do not come across, so review each deck in one app.
      </p>

      <H2>Undo an import</H2>
      <p>
        Open <strong>Activity</strong>, choose the import and press <strong>Archive import</strong>.
        Every card the import added is archived, and so is every deck it made that has no other
        cards. <strong>Restore</strong> brings back exactly those. Nothing is deleted.
      </p>

      <H2>If something goes wrong</H2>
      <H3>The file is too large</H3>
      <p>
        Lymi imports files up to 1 GB, with up to 20 MB of cards and review history. If Export
        everything is too large, export one deck at a time.
      </p>
      <H3>Lymi can’t read the file</H3>
      <p>
        Export again from Mochi and choose the <code>.mochi</code> file. A Markdown or CSV export
        cannot be imported.
      </p>
      <H3>The upload stopped</H3>
      <p>
        Try again on a steadier connection and keep Lymi open until the upload finishes. After that
        you can close it.
      </p>

      <Note title="Your file is deleted when the import ends">
        Lymi keeps the uploaded file only while it imports. It is deleted when the import finishes,
        fails or is cancelled, and after three days if you never confirm it.
      </Note>

      <NextLinks
        items={[
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "How a card is shaped, and what counts as a duplicate.",
          },
          {
            to: "/docs/scheduling",
            title: "How reviews are scheduled",
            blurb: "When an imported card comes back, and how the next card is chosen.",
          },
        ]}
      />
    </div>
  );
}
