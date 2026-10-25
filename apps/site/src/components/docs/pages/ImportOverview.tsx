import { H2, Lead, NextLinks, Note } from "../Prose";

export function ImportOverview() {
  return (
    <div className="doc-prose">
      <Lead>
        Bring cards from another app into Lymi. Each import has a preview so you can check the
        decks, language and card fields before adding anything.
      </Lead>
      <H2>Choose your source</H2>
      <NextLinks
        items={[
          {
            to: "/docs/import-from-anki",
            title: "Anki",
            blurb: "An .apkg or .colpkg file with pictures, recordings and review history.",
          },
          {
            to: "/docs/import-from-mochi",
            title: "Mochi",
            blurb: "A .mochi file with cards, pictures and review history.",
          },
          {
            to: "/docs/import-from-noji",
            title: "Noji",
            blurb: "An .ofc file with sub-decks, pictures and learning progress.",
          },
          {
            to: "/docs/import-from-pleco",
            title: "Pleco",
            blurb: "A UTF-8 text export with characters, pinyin, definitions and categories.",
          },
          {
            to: "/docs/import-from-quizlet",
            title: "Quizlet or a text list",
            blurb: "Paste terms and definitions, or choose a delimited text file.",
          },
          {
            to: "/docs/import-from-lymi",
            title: "Lymi",
            blurb: "A Lymi .zip file exported from your account or another account.",
          },
        ]}
      />
      <H2>Open an import</H2>
      <p>
        On the web, open <strong>Settings → Import</strong> and choose the app the file came from.
        In the phone app, open <strong>You → Import</strong>. Keep Lymi open while the file uploads;
        after that, reading and importing continue on the server.
      </p>
      <H2>Check the preview</H2>
      <p>
        Choose the decks you want when there are several. Check any language Lymi asks you to place,
        then check how each kind of card will look. Use <strong>Change fields</strong> if the term,
        meaning or another field is in the wrong place. Read the final counts and warnings before
        starting the import.
      </p>
      <p>
        Cards you already have are skipped according to Lymi’s term, language and reading rules.
        Importing a source again recognizes cards from the earlier import and keeps your edits. It
        does not keep review progress synchronized between apps.
      </p>
      <H2>Find or undo an import</H2>
      <p>
        Open <strong>Activity</strong> to return to an import and inspect its cards.{" "}
        <strong>Archive import</strong> archives the cards it added and any decks it created that
        are left empty. Restore brings those back; it does not undo edits to cards that already
        existed.
      </p>
      <Note title="Imported history is separate from today’s goal">
        When a format includes past reviews, they appear in Insights. They do not count toward your
        daily goal or streak. Your uploaded file is deleted when the import finishes, fails or is
        cancelled, or after three days if you never confirm it.
      </Note>
      <H2>Keep bringing in new cards</H2>
      <p>
        For words you look up while reading, connect <a href="/docs/yomitan">Yomitan</a>. For new
        highlights from reading apps, connect <a href="/docs/readwise">Readwise</a>. These
        connections keep adding cards without exporting a file each time.
      </p>
      <NextLinks
        items={[
          { to: "/docs/export", title: "Export your decks", blurb: "Take your cards out of Lymi." },
        ]}
      />
    </div>
  );
}
