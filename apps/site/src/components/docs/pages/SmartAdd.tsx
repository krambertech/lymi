import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

/**
 * Written for a learner after a lesson, not for a developer. Every name and number here comes from
 * apps/web/src/client/components/smart-add.tsx, apps/web/src/server/routes/lessons.ts and
 * LESSON_READS_PER_DAY in packages/core; change this page when they change.
 */
export function SmartAdd() {
  return (
    <div className="doc-prose">
      <Lead>
        Smart add turns a lesson into cards. Give it photos of your notebook or a handout, a PDF, or
        the text of your notes or a lesson chat. Lymi lists the terms it finds, sets aside the ones
        you already have, and you tick the ones to add. You don’t need an AI assistant for this.
      </Lead>

      <Note title="Smart add is in beta">
        It reads up to 5 lessons a day. A lesson it couldn’t read doesn’t count, and the count
        starts again at midnight. It works on the web and in the phone app.
      </Note>

      <H2>Before you start</H2>
      <ul>
        <li>
          Make a deck for the language you’re learning. Smart add adds cards to one of your decks.
        </li>
        <li>
          Turn on AI services. On the web, open <strong>Settings</strong> and turn on{" "}
          <strong>Use AI services</strong>. The phone app asks the first time you use Smart add.
        </li>
      </ul>

      <H2>Add a lesson</H2>
      <Steps>
        <div>
          <StepTitle>Open Smart add</StepTitle>
          <p>
            On the web, press <strong>+</strong> on Today or on a deck and choose{" "}
            <strong>Smart add</strong>. In the phone app, choose <strong>Smart add</strong> from the{" "}
            <strong>+</strong> menu in Library or in a deck. Open it from a deck and the cards go to
            that deck.
          </p>
        </div>
        <div>
          <StepTitle>Add the lesson</StepTitle>
          <p>You can mix these in one lesson:</p>
          <ul>
            <li>
              <strong>File</strong> for a PDF. On a computer you can also drop it on the window.
            </li>
            <li>
              <strong>Photos</strong> for pictures of pages, a whiteboard or your notebook.
            </li>
            <li>
              <strong>Text</strong> for pasted notes, a lesson chat or a transcript. Press{" "}
              <strong>Add text</strong> when you’re done.
            </li>
            <li>
              <strong>Camera</strong> on a phone, one page at a time.
            </li>
          </ul>
          <p>
            Use <strong>Add more</strong> for the next page. When everything is in, press{" "}
            <strong>Find terms</strong>. Terms appear while Lymi reads.
          </p>
        </div>
        <div>
          <StepTitle>Answer a question, if Lymi asks one</StepTitle>
          <p>
            Most lessons go straight to the list. Sometimes Lymi asks a short question first, such
            as whether to keep only the words you marked. The usual answer is already chosen. To
            answer in your own words, type under <strong>Something else</strong>. Then press{" "}
            <strong>Show terms</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Tick the terms you want</StepTitle>
          <p>
            Check the deck under <strong>Add to</strong>. If you opened Smart add from Today or
            Library, Lymi picks the deck that fits the lesson, and you can change it. Some terms
            carry a note:
          </p>
          <Defs
            items={[
              { term: "Handwritten", def: "Lymi read it from handwriting. Check the spelling." },
              {
                term: "May belong on another card",
                def: "Lymi left it unticked because it may not need a card of its own.",
              },
              {
                term: "Another form of",
                def: "A form of a word you already have, with the deck it is in.",
              },
            ]}
          />
          <p>
            Terms you already have are listed under <strong>Already in your decks</strong>. Lymi
            doesn’t add them again.
          </p>
        </div>
        <div>
          <StepTitle>Add the cards</StepTitle>
          <p>
            Press <strong>Add</strong>. The button counts the cards you ticked. Lymi then writes
            each card’s example and pronunciation.
          </p>
        </div>
      </Steps>

      <H2>What Lymi keeps from the lesson</H2>
      <p>
        Lymi copies each word as the lesson writes it, with every accent and letter. A handwritten
        correction replaces the printed word it corrects. Lymi looks first for the words the lesson
        marks, such as bold, highlighted, underlined, circled or glossed words, then for the words
        it lists or explains. It skips headings, page numbers and exercise instructions. When the
        lesson gives a translation, the card uses it.
      </p>

      <H2>Limits</H2>
      <ul>
        <li>Up to 10 files in one lesson, of which up to 3 can be PDFs, 20 MB of PDFs in all.</li>
        <li>Up to 100,000 characters of pasted text. Lymi leaves out anything after that.</li>
        <li>Up to 5 lessons a day while Smart add is in beta.</li>
      </ul>

      <H2>What it doesn’t do</H2>
      <ul>
        <li>
          It doesn’t connect to italki, Preply or any other site. Copy the lesson chat or notes, or
          take a photo.
        </li>
        <li>It doesn’t read audio or video. Paste a transcript instead.</li>
      </ul>

      <H2>Privacy</H2>
      <p>
        Lymi sends the photos, PDFs or text you add to Anthropic to read, with what it needs from
        your decks to spot duplicates. Lymi keeps the cards you choose, not the lesson files. See
        the <a href="/privacy">privacy policy</a>.
      </p>

      <H2>If something goes wrong</H2>
      <H3>No new terms found</H3>
      <p>
        If every term is already in your decks, Lymi shows where they are and adds nothing. If it
        found nothing at all, try a clearer photo or paste the lesson text.
      </p>
      <H3>AI services are off for your account</H3>
      <p>
        Turn on <strong>Use AI services</strong> in Settings, then open Smart add again.
      </p>
      <H3>You’ve used today’s lessons</H3>
      <p>
        Lymi says when you can read the next lesson. Until then you can add cards yourself, or start
        with a ready deck from <a href="/explore">Explore</a>.
      </p>

      <NextLinks
        items={[
          {
            to: "/docs/getting-started",
            title: "Getting started",
            blurb: "Add cards by hand and review what is due.",
          },
          {
            to: "/docs/import-from-quizlet",
            title: "Import from Quizlet",
            blurb: "Bring a list of terms and definitions across as text.",
          },
          {
            to: "/docs/mcp",
            title: "Connect an assistant",
            blurb: "Let ChatGPT or Claude add cards from a chat.",
          },
        ]}
      />
    </div>
  );
}
