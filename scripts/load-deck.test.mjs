import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseArgs, problemsIn, repeatedTerms } from "./load-deck.mjs";

test("parses the file, the product origin and the publish flag", () => {
  assert.deepEqual(parseArgs(["deck.json", "--url", "http://localhost:5241", "--publish"]), {
    file: "deck.json",
    url: "http://localhost:5241",
    publish: true,
  });
});

test("finds terms that appear twice, whatever their case", () => {
  const file = { sections: [{ cards: [{ term: "Tere!" }] }, { cards: [{ term: "tere!" }] }] };
  assert.deepEqual(repeatedTerms(file), ["tere!"]);
});

test("reports a missing name, an empty section and a card without a term", () => {
  const file = {
    deck: { name: "Deck" },
    publication: { slug: "deck" },
    sections: [{ cards: [] }, { name: "Two", cards: [{ meaning: "no term" }] }],
  };
  assert.deepEqual(problemsIn(file), [
    "section 1 has no name",
    "section 1 has no cards",
    "a card in Two has no term",
  ]);
});

test("the Everyday Estonian deck file has no problems", () => {
  const file = JSON.parse(
    readFileSync(new URL("../content/decks/everyday-estonian.json", import.meta.url)),
  );
  assert.deepEqual(problemsIn(file), []);
});
