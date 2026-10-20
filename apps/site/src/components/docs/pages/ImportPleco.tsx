import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

/** Written for a learner who has never exported anything, not for a developer. */
export function ImportPleco() {
  return (
    <div className="doc-prose">
      <Lead>
        Bring your Pleco flashcards into Lymi with their pinyin, definitions and categories. You
        choose whether you learn simplified or traditional characters, and the other form stays on
        the card. Pleco itself is not changed.
      </Lead>

      <H2>Import in four steps</H2>
      <Steps>
        <div>
          <StepTitle>Export from Pleco</StepTitle>
          <p>
            In Pleco’s menu, under <strong>Flashcards</strong>, choose{" "}
            <strong>Import / Export</strong>, then <strong>Export Cards</strong>. Set these options:
          </p>
          <ul>
            <li>
              <strong>File format:</strong> Text File. Lymi does not read Pleco’s XML file.
            </li>
            <li>
              <strong>Text encoding:</strong> UTF-8.
            </li>
            <li>
              <strong>Character set:</strong> Both, so each card keeps its simplified and
              traditional forms.
            </li>
            <li>
              <strong>Include data:</strong> Categories, Card definitions and Dictionary
              definitions.
            </li>
          </ul>
          <p>
            Press <strong>Export now</strong> and save the <code>.txt</code> file where you can open
            it from the browser you use Lymi in.
          </p>
        </div>
        <div>
          <StepTitle>Open the import in Lymi</StepTitle>
          <p>
            In Lymi, open <strong>Settings</strong> from the menu under your name, and under{" "}
            <strong>Import</strong> choose <strong>Pleco</strong>. Choose the file, or drop it on
            the page.
          </p>
        </div>
        <div>
          <StepTitle>Check what comes across</StepTitle>
          <p>
            Lymi reads the file and shows what it found: how many cards, which categories become
            tags, and which words you already have. Check how a card will look. The simplified form
            is the term and the traditional form is a line in its notes. To learn traditional
            characters, press <strong>Change fields</strong> and make Traditional the term.
          </p>
        </div>
        <div>
          <StepTitle>Import</StepTitle>
          <p>
            Press <strong>Import</strong>. Lymi writes the cards on its server, so you can close the
            app. When it finishes, the deck is in Library and the import is listed in{" "}
            <strong>Activity</strong>.
          </p>
        </div>
      </Steps>

      <H2>What comes across</H2>
      <Defs
        items={[
          {
            term: "Deck",
            def: "Every card goes into one new Chinese deck called Pleco flashcards. You can rename it afterwards.",
          },
          {
            term: "Characters",
            def: "The form you choose is the term. The other form is a line in the card’s notes, unless both are written the same, as 你好 is.",
          },
          {
            term: "Pinyin",
            def: "It becomes the card’s Reading. Pleco writes tone numbers, as in ni3hao3, and Lymi stores them as tone marks, nǐhǎo. The // Pleco puts inside a word you can split, as in kai1//xue2, is left out.",
          },
          {
            term: "Definitions",
            def: "Your own definition or the dictionary’s becomes the meaning. A link to another word keeps the word it shows, and Pleco’s bold and colour become plain text.",
          },
          {
            term: "Categories",
            def: "Each category becomes a tag. A category inside another keeps its path, as in HSK 1/Verbs. A card you filed in several categories comes in once, with every tag.",
          },
        ]}
      />

      <H2>What stays behind</H2>
      <ul>
        <li>
          <strong>Scores and review history.</strong> Pleco’s text file holds neither, so every card
          starts as new and Insights shows no history from Pleco.
        </li>
        <li>
          <strong>Audio.</strong> Lymi makes its own pronunciation from the characters.
        </li>
        <li>
          <strong>Dictionary entries.</strong> A card keeps the definition Pleco exported, not a
          link back to the dictionary.
        </li>
        <li>
          <strong>Very long text.</strong> A definition longer than a card holds moves to its notes.
          The preview counts every card with text that was cut or moved.
        </li>
      </ul>

      <H2>Your streak and today’s goal</H2>
      <p>
        An import adds no reviews, so it never counts toward today’s goal and never changes your
        streak.
      </p>

      <H2>Words you already have</H2>
      <p>
        If a word is already in your Chinese decks with the same pinyin, the import skips it and
        keeps your card. A word with two readings, such as 行 háng and 行 xíng, stays two cards. The
        preview lists the words it will skip and the decks they are in.
      </p>

      <H2>Importing the same file again</H2>
      <p>
        Export again and import the new file, and Lymi recognises the cards it already brought
        across by their characters and pinyin. It adds no copies. It adds cards that are new in
        Pleco, and fills a field on a card only if that field is empty in Lymi, so your edits stay.
      </p>

      <H2>Undo an import</H2>
      <p>
        Open <strong>Activity</strong>, choose the import and press <strong>Archive import</strong>.
        Every card the import added is archived, and so is the deck if it has no other cards.{" "}
        <strong>Restore</strong> brings back exactly those. Nothing is deleted.
      </p>

      <H2>If something goes wrong</H2>
      <H3>The file is too large</H3>
      <p>
        Lymi imports Pleco files up to 24 MB. Dictionary definitions make a file much larger, so
        export one category at a time, or export again without Dictionary definitions.
      </p>
      <H3>Lymi can’t read the file</H3>
      <p>
        Export again from Pleco as a Text File in UTF-8 and choose the <code>.txt</code> file. An
        XML file cannot be imported.
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
