import { productUrl } from "../../../lib/origins";
import { Table, Td, Th } from "../../Table";
import { Code } from "../Code";
import { Defs, H2, H3, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

const FIELDS: { field: string; marker: string; becomes: string }[] = [
  { field: "Term", marker: "{expression}", becomes: "The term" },
  { field: "Reading", marker: "{reading}", becomes: "The pronunciation" },
  { field: "Meaning", marker: "{glossary}", becomes: "The meaning" },
  { field: "Sentence", marker: "{sentence}", becomes: "The example" },
  { field: "URL", marker: "{url}", becomes: "The source" },
  { field: "Audio", marker: "{audio}", becomes: "The card’s recording" },
];

/** Written for a learner who reads in their browser, not for a developer. */
export function Yomitan() {
  return (
    <div className="doc-prose">
      <Lead>
        Yomitan is a free pop-up dictionary for Chrome, Edge and Firefox. Hold Shift over a word on
        any page and it shows the dictionary entry. Connect it to Lymi and one press of + turns the
        word into a card, with its reading, its meaning, the sentence you read it in and the page it
        came from.
      </Lead>
      <p>
        Lymi answers the AnkiConnect protocol, the one Yomitan uses to add notes to Anki, so Yomitan
        itself needs no change. Lymi is not made by or connected with Yomitan or Anki.
      </p>

      <H2>Set up in five steps</H2>
      <Steps>
        <div>
          <StepTitle>Install Yomitan and a dictionary</StepTitle>
          <p>
            Add Yomitan from your browser’s extension store. Its welcome page offers recommended
            dictionaries for the language you read: JMdict for Japanese, or a Wiktionary dictionary
            for most other languages. Import one before you go on.
          </p>
        </div>
        <div>
          <StepTitle>Copy the address and a key from Lymi</StepTitle>
          <p>
            In Lymi, open <strong>Settings</strong> from the menu under your name and choose{" "}
            <strong>Yomitan</strong>. Copy the AnkiConnect server address:
          </p>
          <Code
            lang="text"
            label="AnkiConnect server address"
            code={productUrl("/api/anki-connect")}
          />
          <p>
            Then press <strong>Make a key for Yomitan</strong> and copy the key. Lymi shows it once.
          </p>
        </div>
        <div>
          <StepTitle>Paste both into Yomitan</StepTitle>
          <p>
            Open Yomitan’s settings and turn on <strong>Advanced</strong> at the bottom of the menu.
            Under <strong>Anki</strong>, turn on <strong>Enable Anki integration</strong>, paste the
            address into <strong>AnkiConnect server address</strong> and the key into{" "}
            <strong>API key</strong>. The connection status changes to Connected.
          </p>
        </div>
        <div>
          <StepTitle>Choose a deck and the note type</StepTitle>
          <p>
            Open <strong>Configure Anki card format</strong>. Choose one of your Lymi decks as the
            deck and <strong>Lymi card</strong> as the note type. Yomitan fills every field for you;
            leave them as they are.
          </p>
        </div>
        <div>
          <StepTitle>Add a word</StepTitle>
          <p>
            On any page, hold Shift over a word and press + in the pop-up. The card is in your deck
            at once, and <strong>Activity</strong> lists it under the key’s name, Yomitan.
          </p>
        </div>
      </Steps>

      <H2>What each field becomes</H2>
      <Table>
        <thead>
          <tr>
            <Th>Field</Th>
            <Th>Yomitan fills it with</Th>
            <Th>On the card</Th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map((row) => (
            <tr key={row.field}>
              <Td>{row.field}</Td>
              <Td className="font-mono text-sm">{row.marker}</Td>
              <Td>{row.becomes}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Defs
        items={[
          {
            term: "Meaning",
            def: "One line for each sense, numbered when there are several. Labels such as (n, vs), tables of other spellings, grammar and etymology notes and links to other words are left out. A meaning longer than a card holds is cut after its last whole line.",
          },
          {
            term: "Reading",
            def: "The reading becomes the pronunciation, such as さんぽ for 散歩 or addormentàrsi for addormentarsi. A reading that is the same as the term is left out.",
          },
          {
            term: "Sentence and page",
            def: "The sentence becomes the example and the page’s address becomes the source, so you can go back to where you read the word.",
          },
          {
            term: "Audio",
            def: "When Yomitan finds the word’s audio, it becomes the card’s recording. MP3, M4A, AAC and WAV up to 2 MB are kept.",
          },
          {
            term: "Tags",
            def: "The tags you set in Yomitan’s Anki settings are kept. Yomitan’s own tag, yomitan, is left out, because Activity already says where the card came from.",
          },
          {
            term: "Empty fields",
            def: "A field the dictionary left empty is filled the way your deck fills new cards, under Enrichment in the deck’s settings. Text Yomitan sent is yours and stays as it is.",
          },
        ]}
      />

      <H2>One deck for each language</H2>
      <p>
        Yomitan sends every word to the deck in its card format. Lymi refuses a word written in
        another script than its deck’s language, such as an Italian word for a Japanese deck, and
        Yomitan shows why. Lymi cannot tell languages that share a script apart, so an Italian word
        sent to a Spanish deck is added there.
      </p>
      <p>
        If you read in several languages, make one Yomitan profile for each under{" "}
        <strong>Profile</strong> in Yomitan’s settings, and choose that language’s deck in each.
      </p>

      <H2>Words you already have</H2>
      <p>
        When the pop-up opens, Yomitan asks Lymi whether each word is already a card, and marks it
        if it is. Pressing + on such a word adds nothing and keeps your card. A Japanese word with
        another reading, such as 上手 read うわて beside 上手 read じょうず, is a new card.
      </p>

      <H2>What stays behind</H2>
      <ul>
        <li>
          <strong>Pictures.</strong> Screenshots, clipboard images and dictionary pictures are not
          kept. Add a picture to the card in Lymi.
        </li>
        <li>
          <strong>View note.</strong> Lymi has no window to open, so Yomitan’s View note button does
          nothing. Find the card in Library or Activity.
        </li>
        <li>
          <strong>Overwriting a note.</strong> Lymi does not change a card from Yomitan. Leave
          Yomitan’s duplicate setting on adding a new note, and edit the card in Lymi.
        </li>
        <li>
          <strong>Fields you add.</strong> Lymi reads the six fields above. Anything else you map in
          Yomitan is left out.
        </li>
      </ul>

      <H2>If something goes wrong</H2>
      <H3>Lymi didn’t accept this key</H3>
      <p>
        The key was revoked or copied with a character missing. Make a new key in Lymi and paste it
        into Yomitan again.
      </p>
      <H3>This Lymi key can only read</H3>
      <p>
        The key has read access. Press <strong>Make a key for Yomitan</strong> in Lymi, which always
        makes a key that can add cards.
      </p>
      <H3>Lymi has no deck called …</H3>
      <p>
        The deck was renamed or archived after you chose it. Choose a deck again in Yomitan’s card
        format.
      </p>
      <H3>The word isn’t the deck’s language</H3>
      <p>Choose the deck for the language you are reading, or switch to its Yomitan profile.</p>
      <H3>Too many requests</H3>
      <p>A key makes up to 600 requests a minute. Wait a minute and try again.</p>

      <Note title="What Yomitan sends to Lymi">
        Each time the pop-up opens, Yomitan sends the word to check for a duplicate, and Lymi keeps
        nothing from that check. When you press +, it sends the fields above and the word’s audio.
        Revoke the key under <strong>API keys</strong> in Settings to disconnect Yomitan; the cards
        it added stay.
      </Note>

      <NextLinks
        items={[
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "How a card is shaped, and what counts as a duplicate.",
          },
          {
            to: "/docs/languages",
            title: "Languages",
            blurb: "How each language writes a pronunciation and an example.",
          },
        ]}
      />
    </div>
  );
}
