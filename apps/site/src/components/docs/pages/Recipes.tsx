import { Code, CodeTabs } from "../Code";
import { H2, Lead, NextLinks, Note } from "../Prose";

export function Recipes() {
  return (
    <div className="doc-prose">
      <Lead>
        Four things people actually do with the API, written out in full. Each one assumes{" "}
        <code>LYMI_URL</code> and <code>LYMI_KEY</code> are set, as in the{" "}
        <a href="/docs/quickstart">Quickstart</a>.
      </Lead>

      <H2>Import a lesson</H2>
      <p>
        A lesson is twenty to forty cards. Send them in one batch and read the outcomes: the ones
        you already had come back as <code>skipped</code>, so you learn what was new without a
        second call.
      </p>
      <CodeTabs
        label="Language"
        samples={[
          {
            name: "Node",
            lang: "js",
            code: `import { readFileSync } from "node:fs";

const deckId = "0mtoyiymqa34h1xeaqo";

// One "term,meaning" per line.
const cards = readFileSync("lesson.csv", "utf8")
  .split("\\n")
  .filter(Boolean)
  .map((line) => {
    const [term, meaning] = line.split(",");
    return { deckId, term: term.trim(), meaning: meaning?.trim() };
  });

const res = await fetch(\`\${process.env.LYMI_URL}/api/cards/batch\`, {
  method: "POST",
  headers: {
    "x-api-key": process.env.LYMI_KEY,
    "content-type": "application/json",
  },
  body: JSON.stringify({ cards }),
});

const { results } = await res.json();
const added = results.filter((r) => r.status === "added");
console.log(\`Added \${added.length}, skipped \${results.length - added.length}\`);

for (const r of results) {
  if (r.status === "skipped") console.log(\`  already in \${r.deckName}: \${r.term}\`);
}`,
          },
          {
            name: "Python",
            lang: "py",
            code: `import csv, os, httpx

deck_id = "0mtoyiymqa34h1xeaqo"

with open("lesson.csv") as f:
    cards = [
        {"deckId": deck_id, "term": row[0].strip(), "meaning": row[1].strip()}
        for row in csv.reader(f)
        if row
    ]

r = httpx.post(
    f"{os.environ['LYMI_URL']}/api/cards/batch",
    headers={"x-api-key": os.environ["LYMI_KEY"]},
    json={"cards": cards},
)
results = r.json()["results"]
added = [x for x in results if x["status"] == "added"]
print(f"Added {len(added)}, skipped {len(results) - len(added)}")

for x in results:
    if x["status"] == "skipped":
        print(f"  already in {x['deckName']}: {x['term']}")`,
          },
        ]}
      />
      <Note title="200 cards a call">
        A batch takes up to 200 cards, across any decks. For a longer list, send it in chunks of
        200. There is no cursor and no partial success: a batch either validates and runs, or
        returns <code>400</code> and changes nothing.
      </Note>

      <H2>Re-run a script without making a mess</H2>
      <p>
        You do not need to check whether a card exists before adding it. The duplicate rule does
        that for you, in the same call, against every deck you have. Run the same import twice and
        the second run adds nothing and reports every term as skipped.
      </p>
      <p>
        Two things follow. Keep your source list as the source of truth, and let Lymi decide what is
        new. And if you do want to change an existing card, use{" "}
        <code>PATCH /api/cards/&#123;id&#125;</code> with the id the skip gave you, rather than
        adding it again.
      </p>
      <Code
        lang="js"
        label="Update instead of re-adding"
        code={`for (const r of results) {
  if (r.status !== "skipped" || r.existing.meaning) continue;
  await fetch(\`\${process.env.LYMI_URL}/api/cards/\${r.existing.id}\`, {
    method: "PATCH",
    headers: {
      "x-api-key": process.env.LYMI_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ meaning: meaningFor(r.term) }),
  });
}`}
      />

      <H2>See what is due right now</H2>
      <p>
        <code>GET /api/decks</code> already carries the counts, so a status line needs one request
        and no maths.
      </p>
      <Code
        lang="bash"
        label="Terminal"
        code={`curl -s "$LYMI_URL/api/decks" -H "x-api-key: $LYMI_KEY" \\
  | jq -r '.[] | select(.due > 0) | "\\(.due)\\t\\(.name)"'`}
      />
      <p>
        For the cards themselves rather than the counts, ask the queue. It comes back oldest due
        first, and <code>total</code> tells you how many there are beyond the page you asked for.
      </p>
      <Code
        lang="bash"
        label="Terminal"
        code={`curl -s "$LYMI_URL/api/review/queue?limit=5" -H "x-api-key: $LYMI_KEY" \\
  | jq -r '"\\(.total) due", (.items[] | "  \\(.card.term) — \\(.card.meaning // "no meaning yet")")'`}
      />

      <H2>Back a deck up</H2>
      <p>
        Cards come back with their scheduling state, so a dump is enough to rebuild the deck
        elsewhere or to keep a copy outside Lymi.
      </p>
      <Code
        lang="bash"
        label="Terminal"
        code={`DECK=0mtoyiymqa34h1xeaqo

curl -s "$LYMI_URL/api/decks/$DECK/cards" -H "x-api-key: $LYMI_KEY" \\
  > "italian-$(date +%Y-%m-%d).json"`}
      />
      <p>
        Want it as a spreadsheet instead? The deck menu in the app exports a CSV. This route is for
        the full shape, including <code>fsrs</code> and every timestamp.
      </p>

      <NextLinks
        items={[
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "Every route these recipes call, in full.",
          },
          {
            to: "/docs/mcp",
            title: "Connect an assistant",
            blurb: "Skip the script: let Claude or ChatGPT do it in the conversation.",
          },
        ]}
      />
    </div>
  );
}
