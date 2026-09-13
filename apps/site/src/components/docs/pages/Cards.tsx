import { Table, Td, Th } from "../../Table";
import { Code } from "../Code";
import { Defs, H2, H3, Lead, NextLinks, Note } from "../Prose";

const FIELDS: { name: string; type: string; note: string }[] = [
  { name: "deckId", type: "string", note: "Required. Which deck the card lands in." },
  { name: "term", type: "string", note: "Required. What the card asks about, as you met it." },
  { name: "meaning", type: "string", note: "What it means, in your own language." },
  { name: "pronunciation", type: "string", note: "IPA or a plain respelling." },
  { name: "example", type: "string", note: "One sentence using the term." },
  { name: "notes", type: "string", note: "Anything else worth keeping." },
  { name: "language", type: "string | null", note: "BCP 47 tag. Defaults to the deck's." },
  { name: "tags", type: "string[]", note: "Up to 20. Free text." },
  { name: "source", type: "string", note: "Where it came from: a lesson, a book, a film." },
  {
    name: "directions",
    type: '"recognition" | "production" | "both" | null',
    note: "Overrides the deck for this card.",
  },
  {
    name: "meaningSource",
    type: '"lesson" | "ai" | "manual"',
    note: "Who wrote the meaning. Set ai when a model did.",
  },
  {
    name: "exampleSource",
    type: '"lesson" | "ai" | "manual"',
    note: "Who wrote the example.",
  },
];

export function Cards() {
  return (
    <div className="doc-prose">
      <Lead>
        A deck holds cards. A card holds one term and everything you know about it. Scheduling is
        per direction, so the same card can be easy to recognise and hard to produce.
      </Lead>

      <H2>Decks</H2>
      <p>
        A deck is a name and two defaults. <code>defaultLanguage</code> prefills the language on
        every card added to it, and <code>directions</code> decides which way its cards are asked.
        Only the name is required.
      </p>
      <Code
        lang="json"
        label="POST /api/decks"
        code={`{
  "name": "Italian",
  "defaultLanguage": "it",
  "directions": "both"
}`}
      />
      <p>
        Listing decks gives you the counts too, so a dashboard needs one call: <code>total</code> is
        the active cards in the deck and <code>due</code> is how many card states are ready to
        review now.
      </p>

      <H2>Cards</H2>
      <p>
        Only <code>deckId</code> and <code>term</code> are required. Send what you have; the rest
        can be filled later, in the app or by a second call.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Field</Th>
            <Th>Type</Th>
            <Th>Notes</Th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map((f) => (
            <tr key={f.name}>
              <Td className="whitespace-nowrap font-mono text-sm text-text">{f.name}</Td>
              <Td className="font-mono text-xs text-muted">{f.type}</Td>
              <Td>{f.note}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Note title="Say when a model wrote it">
        If you generate a meaning or an example with an AI, set <code>meaningSource</code> or{" "}
        <code>exampleSource</code> to <code>"ai"</code>. The app labels those fields wherever they
        appear, so machine-written text is never mistaken for the lesson. Send a meaning with no
        source and it is recorded as <code>manual</code>.
      </Note>

      <H2>The same term twice is not an error</H2>
      <p>
        Adding a term you already have is <strong>skipped and reported</strong>, never rejected. You
        get <code>200</code> instead of <code>201</code>, with the card that already holds the term
        and the deck it lives in. This makes a script safe to re-run.
      </p>
      <Code
        lang="json"
        label="Response · 200"
        code={`{
  "status": "skipped",
  "term": "la nebbia",
  "existing": { "id": "0mtoyiymrvqpdz02hlv", "term": "la nebbia" },
  "deckName": "Italian"
}`}
      />

      <H3>What counts as a duplicate</H3>
      <p>
        Two cards collide when their <strong>normalised term and language both match</strong>,
        anywhere in your decks, not only in the one you are adding to. Normalising trims the term,
        collapses runs of whitespace, folds case and applies Unicode NFC.
      </p>
      <ul>
        <li>
          Accents are kept. In Italian <code>pesca</code> (peach) and <code>pèsca</code> (fishing)
          are two words, and Lymi treats them as two.
        </li>
        <li>
          Articles are kept. <code>la nebbia</code> and <code>nebbia</code> are different terms.
        </li>
        <li>A card with no language only collides with other cards that have no language.</li>
        <li>Archived cards do not collide. Adding a term you archived makes a fresh card.</li>
      </ul>
      <p>
        A batch checks itself as well: send the same term twice in one call and the second one is
        skipped against the first.
      </p>

      <H2>Directions decide how often you see a card</H2>
      <p>Each direction gets its own schedule, so one card can hold two of them.</p>
      <Defs
        items={[
          {
            term: <code>recognition</code>,
            def: "You see the term and recall the meaning. The easier way round.",
          },
          {
            term: <code>production</code>,
            def: "You see the meaning and produce the term. The harder way round.",
          },
          {
            term: <code>both</code>,
            def: "Two schedules for one card, asked independently.",
          },
        ]}
      />
      <p>
        A card without <code>directions</code> follows its deck. Setting the field on a card
        overrides the deck for that card alone. A new deck is <code>recognition</code> unless you
        say otherwise, so pass <code>directions</code> when you create one if you want both ways
        round.
      </p>

      <H2>Reviews are scheduled with FSRS</H2>
      <p>
        Lymi uses FSRS with one learning step of ten minutes. A new card state starts at{" "}
        <code>0</code> and moves through Learning, Review and Relearning as you grade it.{" "}
        <a href="/docs/scheduling">How reviews are scheduled</a> explains the intervals and the
        order cards come up in.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>state</Th>
            <Th>Means</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td className="font-mono text-sm">0</Td>
            <Td>New. Never reviewed.</Td>
          </tr>
          <tr>
            <Td className="font-mono text-sm">1</Td>
            <Td>Learning. Inside its first step.</Td>
          </tr>
          <tr>
            <Td className="font-mono text-sm">2</Td>
            <Td>Review. Graduated, on a real interval.</Td>
          </tr>
          <tr>
            <Td className="font-mono text-sm">3</Td>
            <Td>Relearning. Forgotten and going through the step again.</Td>
          </tr>
        </tbody>
      </Table>
      <p>
        Reading the queue is open to any key. <code>GET /api/review/queue</code> returns today’s
        cards in the order a review would take them if every grade succeeded, and each item carries{" "}
        <code>next</code>: the four dates each grade would schedule. A client can show “Good · 6 d”
        with no extra round trip. Add <code>round=forgotten</code>, <code>round=new</code> or{" "}
        <code>round=slipping</code> for one of Today’s rounds; <code>GET /api/review/rounds</code>{" "}
        counts each.
      </p>
      <Note tone="careful" title="Only you can grade">
        <p>
          <code>POST /api/review/grade</code> needs your own session. An API key or an MCP token
          gets <code>403</code> whatever its scope, because a grade is a claim about your memory and
          nothing else should be making it.
        </p>
      </Note>

      <H2>Nothing is deleted</H2>
      <p>
        Archiving hides a card or a deck; restoring brings it back with its schedule untouched.
        Archiving a deck leaves its cards alone: they stop appearing with the deck, and they come
        back when you restore it.
      </p>
      <Code
        lang="bash"
        label="Terminal"
        code={`curl -X POST "$LYMI_URL/api/cards/0mtoyiymrvqpdz02hlv/archive" -H "x-api-key: $LYMI_KEY"
curl -X POST "$LYMI_URL/api/cards/0mtoyiymrvqpdz02hlv/restore" -H "x-api-key: $LYMI_KEY"`}
      />

      <NextLinks
        items={[
          {
            to: "/docs/scheduling",
            title: "How reviews are scheduled",
            blurb: "When a card is due, and which card comes next.",
          },
          {
            to: "/docs/recipes",
            title: "Recipes",
            blurb: "Put this to work: import a list, back a deck up.",
          },
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "Every field and response, route by route.",
          },
        ]}
      />
    </div>
  );
}
