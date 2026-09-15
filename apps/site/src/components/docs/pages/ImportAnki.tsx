import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

/** Written for a learner who has never exported anything, not for a developer. */
export function ImportAnki() {
  return (
    <div className="doc-prose">
      <Lead>
        Bring your Anki decks into Lymi with their cards, tags, pictures and review history. Your
        cards keep the due dates they had in Anki, so nothing you already learned starts over. Anki
        itself is not changed.
      </Lead>

      <H2>Import in four steps</H2>
      <Steps>
        <div>
          <StepTitle>Export from Anki</StepTitle>
          <p>
            On a computer, open Anki and choose <strong>File</strong>, then <strong>Export</strong>.
            Set the format to <strong>Anki Deck Package (.apkg)</strong>. In{" "}
            <strong>Include</strong> choose <strong>All Decks</strong> or one deck.
          </p>
          <p>
            Tick <strong>Include Scheduling Information</strong> and <strong>Include Media</strong>.
            Without scheduling information your review history stays behind and every card starts as
            new. <strong>Support older Anki versions</strong> can be on or off. Press{" "}
            <strong>Export</strong> and save the file where you can find it.
          </p>
        </div>
        <div>
          <StepTitle>Open the import in Lymi</StepTitle>
          <p>
            In Lymi, press the round <strong>+</strong> button and choose{" "}
            <strong>Import from Anki</strong>. Choose the file, or drop it on the page. Keep Lymi
            open while the file uploads; a large file on a slow connection can take a few minutes.
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
              <strong>The language of each deck.</strong> Anki does not store a language, so Lymi
              guesses from the deck name. Lymi needs the language to find duplicates and to say
              words out loud.
            </li>
            <li>
              <strong>How a card will look.</strong> Lymi shows one of your cards as it will arrive.
              If the word and its meaning are the wrong way round, change which field is which.
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

      <H3>On a phone</H3>
      <p>
        In <strong>AnkiDroid</strong>, open the menu and tap <strong>Export</strong>. In{" "}
        <strong>AnkiMobile</strong> on an iPhone or iPad, open <strong>Settings</strong>, tap{" "}
        <strong>Export</strong> and choose a deck. In both, turn on scheduling information and
        media, then save the file to Files and choose it in Lymi.
      </p>
      <p>
        A deck downloaded from AnkiWeb is an <code>.apkg</code> file too, and imports as it is. It
        has no review history, so its cards arrive as new. A collection backup, a{" "}
        <code>.colpkg</code> file, also works.
      </p>

      <H2>What comes across</H2>
      <Defs
        items={[
          {
            term: "Decks",
            def: "Every deck that holds cards becomes a Lymi deck with the same name. Italian::Lesson 1 becomes Italian / Lesson 1.",
          },
          {
            term: "Basic cards",
            def: "The front becomes the term and the back becomes the meaning. You can change this for each note type before you import.",
          },
          {
            term: "Reversed cards",
            def: "A note asked both ways in Anki becomes one Lymi card asked both ways. Each way keeps its own history.",
          },
          {
            term: "Cloze deletions",
            def: "Each gap becomes its own card. The hidden word is the term, the whole sentence is the example, and the Back Extra field is the meaning.",
          },
          {
            term: "Readings",
            def: "Furigana such as 漢字[かんじ] becomes the term 漢字 with the pronunciation かんじ. A Reading field does the same.",
          },
          {
            term: "Formatting",
            def: "Bold, colours and layout become plain text with line breaks.",
          },
          {
            term: "Tags",
            def: "Tags come across, up to 20 on a card. Anki’s own marked and leech tags do not.",
          },
          {
            term: "Pictures",
            def: "The first picture on a note becomes the card’s picture. Picture review waits until you describe it.",
          },
          {
            term: "Review history",
            def: "Every past review comes across on its original day and shows in Insights. Each card keeps the due date it had in Anki.",
          },
          {
            term: "Suspended cards",
            def: "They arrive archived, the way a card you archive in Lymi is kept out of reviews.",
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
          <strong>Extra pictures.</strong> A card has one picture in Lymi, so only the first comes
          across.
        </li>
        <li>
          <strong>Card styles and templates</strong>, deck options and presets.
        </li>
        <li>
          <strong>Image occlusion notes.</strong> Lymi cannot ask them, and the preview counts them.
        </li>
        <li>
          <strong>Very long text.</strong> A meaning longer than 1,000 characters moves to the
          card’s notes. The preview counts every card with text that was cut or moved.
        </li>
      </ul>

      <H2>Your streak and today’s goal</H2>
      <p>
        Reviews you did in Anki count as history, not as reviews done in Lymi. They light up the
        days you studied in Insights, but they never count toward today’s goal and never change your
        streak, even if you reviewed in Anki this morning.
      </p>

      <H2>Words you already have</H2>
      <p>
        If a word is already in Lymi in the same language, the import skips it and keeps your card.
        The preview lists the words it will skip and the decks they are in.
      </p>

      <H2>Importing the same file again</H2>
      <p>
        Import the same collection again and Lymi recognises the cards it already brought across. It
        adds no copies. It adds cards that are new in Anki, and fills a field on a card only if that
        field is empty in Lymi, so your edits stay. Reviews you did in Anki after the first import
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
        Lymi imports files up to 1 GB, with up to 64 MB of cards and review history. Pictures and
        audio make a file large, so export again without <strong>Include Media</strong>, or export
        one deck at a time by choosing it in <strong>Include</strong>.
      </p>
      <H3>Lymi can’t read the file</H3>
      <p>
        Export again from Anki as <strong>Anki Deck Package (.apkg)</strong> and choose that file. A
        text export or a spreadsheet cannot be imported yet.
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
