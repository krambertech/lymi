import assert from "node:assert/strict";
import test from "node:test";
import { mapProblems } from "./check-verify-map.mjs";

const skill = (...names) =>
  [
    "| Feature | Entry |",
    "| --- | --- |",
    ...names.map((name) => `| ${name} | [${name}.md](features/${name}.md) |`),
    "",
    "Driving [sign-in.md](features/sign-in.md) outside the table is not a row.",
  ].join("\n");

test("a map with a row, an entry and a recipe for every feature passes", () => {
  assert.deepEqual(
    mapProblems(skill("add-card", "review"), [
      "add-card.md",
      "add-card.mjs",
      "review.md",
      "review.mjs",
    ]),
    [],
  );
});

test("a feature with both files and no row fails", () => {
  assert.deepEqual(
    mapProblems(skill("add-card"), [
      "add-card.md",
      "add-card.mjs",
      "select-cards.md",
      "select-cards.mjs",
    ]),
    ["select-cards is not in SKILL.md's map: add a row linking features/select-cards.md."],
  );
});

test("a link outside the table is not counted as a row", () => {
  assert.deepEqual(mapProblems(skill(), ["sign-in.md", "sign-in.mjs"]), [
    "sign-in is not in SKILL.md's map: add a row linking features/sign-in.md.",
  ]);
});

test("an entry without its recipe and a recipe without its entry both fail", () => {
  assert.deepEqual(mapProblems(skill("import", "rest-day"), ["import.md", "rest-day.mjs"]), [
    "features/import.md has no recipe: write features/import.mjs.",
    "features/rest-day.mjs has no entry: write features/rest-day.md.",
    "SKILL.md's map links features/rest-day.md, which does not exist.",
  ]);
});

test("a row for a feature that is gone fails", () => {
  assert.deepEqual(mapProblems(skill("review", "furigana"), ["review.md", "review.mjs"]), [
    "SKILL.md's map links features/furigana.md, which does not exist.",
  ]);
});

test("a feature listed twice fails", () => {
  assert.deepEqual(mapProblems(skill("review", "review"), ["review.md", "review.mjs"]), [
    "review has 2 rows in SKILL.md's map: keep one.",
  ]);
});
