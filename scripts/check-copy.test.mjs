import assert from "node:assert/strict";
import test from "node:test";
import { isKnown, phraseProblems, readCatalog, skeleton, sloganProblems } from "./check-copy.mjs";

const rules = (text) => phraseProblems("post.md:1", text).map((problem) => problem.rule);

for (const [rule, lines] of Object.entries({
  "scheduling claim": [
    "It comes back just as it starts to fade.",
    "Flashcards that come back right before you’d forget.",
  ],
  promise: [
    "Bring your sets and remember them for good.",
    "The words you learned months ago stay with you, and it makes it stick.",
  ],
  "thing that acts": [
    "The key terms land in Lymi as cards.",
    "New cards land here.",
    "From then on the reading steps aside.",
    "What your assistant writes counts as yours.",
  ],
  "filler claim": ["Teach anything worth remembering.", "Send it anything."],
  hype: ["Unlock your memory.", "A seamless way to learn."],
  contrast: ["It’s not just an app, it’s a habit."],
  "throat-clearing": ["Whether you’re a beginner or a polyglot, start here."],
})) {
  for (const line of lines) {
    test(`${rule}: ${line}`, () => assert.ok(rules(line).includes(rule)));
  }
}

test("plain copy passes", () => {
  for (const line of [
    "The gaps grow as you learn.",
    "It adds the key terms to Lymi.",
    "Flashcards for medical school.",
    "Review every question until you know the answer.",
    "The plane lands at noon.",
    "Export keeps the decks you own.",
  ]) {
    assert.deepEqual(rules(line), [], line);
  }
});

test("one slogan on many pages is found, a question or a pair is not", () => {
  const pages = ["Japanese", "Chinese", "Polish"].map(
    (language) => `The flashcard app that gets ${language}.`,
  );
  assert.equal(sloganProblems(pages)[0].hit, "The flashcard app that gets ….");
  assert.deepEqual(sloganProblems(pages.slice(0, 2)), []);
  assert.equal(skeleton("Can ChatGPT make flashcards?"), null);
});

test("a message over several lines is read whole", () => {
  const catalog = 'msgid ""\nmsgstr ""\n\nmsgid ""\n"One "\n"two."\nmsgstr ""\n';
  assert.deepEqual(readCatalog(catalog), ["One two."]);
});

test("a known line is matched by rule and text", () => {
  const [problem] = phraseProblems("en.po", "Send it anything.");
  assert.ok(isKnown(problem, [{ rule: "filler claim", text: "Send it anything" }]));
  assert.ok(!isKnown(problem, [{ rule: "hype", text: "Send it anything" }]));
});
