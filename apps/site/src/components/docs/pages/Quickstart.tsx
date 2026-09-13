import { productUrl } from "../../../lib/origins";
import { Code, CodeTabs } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

export function Quickstart() {
  return (
    <div className="doc-prose">
      <Lead>
        By the end of this page you will have a key, a deck id, and a card that you added from the
        command line and can see in the app.
      </Lead>

      <Steps>
        <div>
          <StepTitle>Make a key</StepTitle>
          <p>
            Open <a href={productUrl("/settings")}>Settings</a> in Lymi, find{" "}
            <strong>API keys</strong>, name the key after the thing that will use it, and choose{" "}
            <strong>Read and write</strong>.
          </p>
          <p>
            The key is shown once, right after you make it. Copy it now; the server keeps only a
            hash. Every key starts with <code>lymi_</code>.
          </p>
          <Code
            label="Terminal"
            lang="bash"
            code={`export LYMI_KEY=lymi_your_key_here
export LYMI_URL=${ORIGIN}`}
          />
        </div>

        <div>
          <StepTitle>Check that it works</StepTitle>
          <p>Ask the API who the key belongs to.</p>
          <CodeTabs
            label="Language"
            samples={[
              {
                name: "curl",
                lang: "bash",
                code: `curl "$LYMI_URL/api/me" -H "x-api-key: $LYMI_KEY"`,
              },
              {
                name: "JavaScript",
                lang: "js",
                code: `const res = await fetch(\`\${process.env.LYMI_URL}/api/me\`, {
  headers: { "x-api-key": process.env.LYMI_KEY },
});
console.log(await res.json());`,
              },
              {
                name: "Python",
                lang: "py",
                code: `import os, httpx

r = httpx.get(
    f"{os.environ['LYMI_URL']}/api/me",
    headers={"x-api-key": os.environ["LYMI_KEY"]},
)
print(r.json())`,
              },
            ]}
          />
          <p>You get the learner the key belongs to:</p>
          <Code
            label="Response"
            lang="json"
            code={`{
  "id": "0mtoyiymrpxx21q8gp6",
  "name": "Kateryna",
  "email": "you@example.com",
  "image": null
}`}
          />
          <p>
            A <code>401</code> here means the key is wrong or revoked. Nothing else can cause it.
          </p>
        </div>

        <div>
          <StepTitle>Find a deck to add to</StepTitle>
          <p>
            Every card belongs to a deck, so you need a deck id first. This lists the decks you
            have, with how many cards are in each and how many are due right now.
          </p>
          <Code
            label="Terminal"
            lang="bash"
            code={`curl "$LYMI_URL/api/decks" -H "x-api-key: $LYMI_KEY"`}
          />
          <Code
            label="Response"
            lang="json"
            code={`[
  {
    "id": "0mtoyiymqa34h1xeaqo",
    "name": "Italian",
    "description": null,
    "defaultLanguage": "it",
    "directions": "both",
    "position": 0,
    "total": 214,
    "due": 12
  }
]`}
          />
          <p>
            No decks yet? Make one with <code>POST /api/decks</code>. A name is the only field it
            needs.
          </p>
        </div>

        <div>
          <StepTitle>Add a card</StepTitle>
          <p>
            The deck id and the term are required. Everything else is optional, and anything you
            leave out stays empty until you fill it in the app.
          </p>
          <CodeTabs
            label="Language"
            samples={[
              {
                name: "curl",
                lang: "bash",
                code: `curl "$LYMI_URL/api/cards" \\
  -H "x-api-key: $LYMI_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "deckId": "0mtoyiymqa34h1xeaqo",
    "term": "la nebbia",
    "meaning": "fog",
    "example": "La nebbia copre la valle ogni mattina.",
    "language": "it",
    "tags": ["weather"]
  }'`,
              },
              {
                name: "JavaScript",
                lang: "js",
                code: `const res = await fetch(\`\${process.env.LYMI_URL}/api/cards\`, {
  method: "POST",
  headers: {
    "x-api-key": process.env.LYMI_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    deckId: "0mtoyiymqa34h1xeaqo",
    term: "la nebbia",
    meaning: "fog",
    language: "it",
    tags: ["weather"],
  }),
});
const outcome = await res.json();
console.log(outcome.status); // "added" or "skipped"`,
              },
              {
                name: "Python",
                lang: "py",
                code: `import os, httpx

r = httpx.post(
    f"{os.environ['LYMI_URL']}/api/cards",
    headers={"x-api-key": os.environ["LYMI_KEY"]},
    json={
        "deckId": "0mtoyiymqa34h1xeaqo",
        "term": "la nebbia",
        "meaning": "fog",
        "language": "it",
        "tags": ["weather"],
    },
)
print(r.json()["status"])  # "added" or "skipped"`,
              },
            ]}
          />
          <Note title="content-type matters">
            Send <code>content-type: application/json</code> on every request with a body. curl
            defaults to form encoding, and Lymi answers a form-encoded body with a <code>400</code>{" "}
            rather than treating it as an empty object.
          </Note>
        </div>

        <div>
          <StepTitle>Read the outcome</StepTitle>
          <p>
            You get <code>201</code> with <code>status: "added"</code> and the whole card. If that
            term is already in one of your decks you get <code>200</code> with{" "}
            <code>status: "skipped"</code> and the card that already holds it. Adding the same term
            twice is never an error.
          </p>
          <Code
            label="Response · 201"
            lang="json"
            code={`{
  "status": "added",
  "card": {
    "id": "0mtoyiymrvqpdz02hlv",
    "deckId": "0mtoyiymqa34h1xeaqo",
    "term": "la nebbia",
    "normalizedTerm": "la nebbia",
    "meaning": "fog",
    "language": "it",
    "tags": ["weather"],
    "createdBy": "api",
    "archivedAt": null,
    "createdAt": "2026-09-06T08:14:22.000Z"
  }
}`}
          />
        </div>

        <div>
          <StepTitle>Open Lymi</StepTitle>
          <p>
            The card is in the deck already, marked New, and it joins the queue at your next review.
            Nothing is held for approval.
          </p>
        </div>
      </Steps>

      <H2>Adding a whole lesson</H2>
      <p>
        One lesson is twenty to forty cards. Send them together rather than one call per card:{" "}
        <code>POST /api/cards/batch</code> takes up to 200 cards, across any decks, and returns one
        outcome per card in the order you sent them.
      </p>
      <Code
        label="Terminal"
        lang="bash"
        code={`curl "$LYMI_URL/api/cards/batch" \\
  -H "x-api-key: $LYMI_KEY" \\
  -H "content-type: application/json" \\
  -d '{"cards": [
    { "deckId": "0mtoyiymqa34h1xeaqo", "term": "la nebbia", "meaning": "fog" },
    { "deckId": "0mtoyiymqa34h1xeaqo", "term": "il tramonto", "meaning": "sunset" }
  ]}'`}
      />

      <H2>Where to go next</H2>
      <NextLinks
        items={[
          {
            to: "/docs/authentication",
            title: "Authentication",
            blurb: "Scopes, rate limits, and what every error code means.",
          },
          {
            to: "/docs/recipes",
            title: "Recipes",
            blurb: "Import a lesson and back a deck up.",
          },
        ]}
      />
    </div>
  );
}
