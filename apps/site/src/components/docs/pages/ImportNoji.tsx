import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

/** Written for a learner who has never exported anything, not for a developer. */
export function ImportNoji() {
  return (
    <div className="doc-prose">
      <Lead>
        Bring your Noji decks into Lymi with their sub-decks, pictures and learning progress. Cards
        you already know keep the due dates they had in Noji, so nothing you learned starts over.
        Noji itself is not changed.
      </Lead>

      <H2>Import in four steps</H2>
      <Steps>
        <div>
          <StepTitle>Export from Noji</StepTitle>
          <p>
            In Noji, open the deck you want to bring, open its <strong>Settings</strong> and choose{" "}
            <strong>Export deck</strong>. Choose the <strong>OFC</strong> format, turn on the option
            to include your learning progress, and enter your email address. Its sub-decks come with
            it.
          </p>
          <p>
            Noji emails you a link to the <code>.ofc</code> file. Download it within 24 hours, after
            which Noji deletes it. Noji only exports decks you made yourself, not decks you added
            from someone else or copied. Its CSV export leaves out pictures and progress, so use
            OFC.
          </p>
        </div>
        <div>
          <StepTitle>Open the import in Lymi</StepTitle>
          <p>
            In Lymi, open <strong>Settings</strong> from the menu under your name, and under{" "}
            <strong>Import</strong> choose <strong>Noji</strong>. Choose the file, or drop it on the
            page. Keep Lymi open while the file uploads.
          </p>
        </div>
        <div>
          <StepTitle>Check what comes across</StepTitle>
          <p>
            Lymi reads the file and shows what it found: how many cards and decks, how many you
            already know, and which words you already have. Check two things.
          </p>
          <ul>
            <li>
              <strong>The language of each deck.</strong> Noji’s file does not say a language, so
              Lymi guesses from the deck name and its cards. Lymi needs the language to find
              duplicates and to say words out loud.
            </li>
            <li>
              <strong>How a card will look.</strong> The front of a Noji card becomes the term and
              the back becomes the meaning. If they are the wrong way round, swap them.
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
            def: "Every deck that holds cards becomes a Lymi deck named by its place in Noji: Verbs inside Spanish becomes Spanish / Verbs. A deck that only holds other decks is not made.",
          },
          {
            term: "Cards",
            def: "The front becomes the term and the back becomes the meaning. You can swap them before you import.",
          },
          {
            term: "Cloze cards",
            def: "Each gap becomes its own card: the hidden word is the term and the full sentence is the example.",
          },
          {
            term: "Formatting",
            def: "Bold text, lists and line breaks become plain text with line breaks.",
          },
          {
            term: "Pictures",
            def: "The first picture on a card becomes the card’s picture. Picture review waits until you describe it.",
          },
          {
            term: "Learning progress",
            def: "A card you have learned keeps its due date and comes in as Known. A card still in its first learning steps starts as new.",
          },
          {
            term: "Frozen cards",
            def: "They arrive archived.",
          },
        ]}
      />

      <H2>What stays behind</H2>
      <ul>
        <li>
          <strong>Past reviews.</strong> Noji’s file says where each card stands today, not when you
          reviewed it, so Insights shows no history from Noji.
        </li>
        <li>
          <strong>Image occlusion.</strong> Lymi cannot ask these cards. The preview counts them.
        </li>
        <li>
          <strong>Audio.</strong> Lymi makes its own pronunciation for words in a language.
        </li>
        <li>
          <strong>Extra pictures.</strong> A card has one picture in Lymi, so only the first comes
          across.
        </li>
        <li>
          <strong>Styles and deck settings.</strong> Colours, fonts and Noji’s study settings stay
          in Noji.
        </li>
        <li>
          <strong>Very long text.</strong> A meaning longer than a card holds moves to its notes.
          The preview counts every card with text that was cut or moved.
        </li>
      </ul>

      <H2>Your streak and today’s goal</H2>
      <p>
        An import adds no reviews, so it never counts toward today’s goal and never changes your
        streak, even if you reviewed in Noji this morning.
      </p>

      <H2>Words you already have</H2>
      <p>
        If a word is already in Lymi in the same language, the import skips it and keeps your card.
        The preview lists the words it will skip and the decks they are in.
      </p>

      <H2>Importing the same file again</H2>
      <p>
        Import the same deck again and Lymi recognises the cards it already brought across. It adds
        no copies. It adds cards that are new in Noji, and fills a field on a card only if that
        field is empty in Lymi, so your edits stay. Progress you made in Noji after the first import
        does not come across, so review each deck in one app.
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
        Lymi imports files up to 1 GB, with up to 20 MB of card text. If a deck with many sub-decks
        is too large, export one sub-deck at a time.
      </p>
      <H3>Lymi can’t read the file</H3>
      <p>
        Export the deck again from Noji in OFC format and choose the <code>.ofc</code> file. A CSV
        export cannot be imported.
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
