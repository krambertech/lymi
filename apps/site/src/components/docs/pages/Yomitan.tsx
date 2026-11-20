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
  {
    field: "Sentence audio",
    marker: "(empty)",
    becomes: "The example’s recording, from asbplayer",
  },
  { field: "Picture", marker: "(empty)", becomes: "The card’s picture, from asbplayer" },
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
            Follow <a href="https://yomitan.wiki/getting-started/">Yomitan’s installation guide</a>{" "}
            to add it to your browser. Its welcome page offers recommended dictionaries for the
            language you read: JMdict for Japanese, or a Wiktionary dictionary for most other
            languages. Import one before you go on.
          </p>
        </div>
        <div>
          <StepTitle>Copy the address and a key from Lymi</StepTitle>
          <p>
            In Lymi, open <strong>Settings</strong> from the menu under your name and choose{" "}
            <strong>Yomitan</strong> under <strong>Apps</strong>. In the phone app, open{" "}
            <strong>You → Apps → Yomitan</strong>. Copy the AnkiConnect server address:
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
            deck and <strong>Lymi card</strong> as the note type. Yomitan fills the fields for you;
            leave them as they are, but clear <strong>Sentence audio</strong> and{" "}
            <strong>Picture</strong> if Yomitan put anything in them. asbplayer fills those two.
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

      <H2>Clips and pictures from videos</H2>
      <p>
        <a href="https://docs.asbplayer.dev/">asbplayer</a> is a browser extension for watching
        video with subtitles. With it, a card you add while watching gets the line you heard as its
        example, that line’s audio as the example’s recording, and a picture of the scene.
      </p>
      <p>
        Only you hear that audio and see that picture. Anyone you share the deck with hears Lymi’s
        voice for the example and sees no picture, and a published deck’s page shows neither. A Lymi
        export keeps them, and importing it gives them back to you.
      </p>
      <Steps>
        <div>
          <StepTitle>Connect asbplayer to Lymi</StepTitle>
          <p>
            In asbplayer’s settings, under <strong>Anki</strong>, paste the same address into{" "}
            <strong>AnkiConnect URL</strong> and your Yomitan key into{" "}
            <strong>AnkiConnect API Key</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Choose the deck and the fields</StepTitle>
          <p>
            Choose the deck Yomitan adds to and the note type <strong>Lymi card</strong>. Map
            Sentence to <strong>Sentence</strong>, Audio to <strong>Sentence audio</strong>, Image
            to <strong>Picture</strong> and URL to <strong>URL</strong>.
          </p>
        </div>
        <div>
          <StepTitle>Turn on MP3</StepTitle>
          <p>
            Turn on <strong>Re-encode audio as mp3</strong>. Lymi keeps MP3, M4A, AAC and WAV audio
            up to 2 MB; audio in another format is left out, and the example is read aloud by Lymi
            instead.
          </p>
        </div>
        <div>
          <StepTitle>Add the clip to the word</StepTitle>
          <p>
            Look up the word with Yomitan and press +. Then, in asbplayer, update the last card: set{" "}
            <strong>Mining button default action</strong> to <strong>Update last card</strong>, or
            press Ctrl + Shift + U. The card gets the line, its audio and the picture, and the tag
            asbplayer adds. To add a card from asbplayer alone, export it from asbplayer’s card
            dialog instead.
          </p>
        </div>
      </Steps>
      <p>
        Lymi never records anything itself. It keeps what asbplayer sends, and a new sentence on the
        card drops the audio that said the old one.
      </p>

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
          <strong>Dictionary pictures.</strong> Pictures inside a dictionary entry are not kept. A
          picture sent in the Picture field becomes the card’s picture, which only you see.
        </li>
        <li>
          <strong>View note.</strong> Lymi has no window to open, so Yomitan’s View note button does
          nothing. Find the card in Library or Activity.
        </li>
        <li>
          <strong>Overwriting a note.</strong> When Yomitan or asbplayer updates a card, Lymi
          changes its reading, meaning, sentence and page, and keeps the term. An empty field clears
          nothing.
        </li>
        <li>
          <strong>Fields you add.</strong> Lymi reads the eight fields above. Anything else you map
          is left out.
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
        Choose <strong>Disconnect Yomitan</strong> on its page to revoke the key; the cards it added
        stay.
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
