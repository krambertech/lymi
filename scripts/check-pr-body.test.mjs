import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkBody } from "./check-pr-body.mjs";

const SCREEN = "apps/web/src/client/components/deck-menu.tsx";
const SERVICE = "packages/core/src/draw.ts";
const DOC = "docs/testing.md";

const body = ({
  summary = "Archive now shows Undo.",
  screenshots = "![After](https://github.com/user-attachments/assets/1)\n\nTry it: open /library on the preview as learner, then archive a card.",
  verification = "- `archive` with verify: PASS.\n- Review: one independent reviewer, one round, nothing open.",
  rest = "",
} = {}) =>
  `## Summary\n\n${summary}\n\n## Screenshots\n\n${screenshots}\n\n## Verification\n\n${verification}\n${rest}`;

const rules = (text, files, title = "fix(web): show undo after archive") =>
  checkBody({ title, body: text, files }).map(({ rule }) => rule);

const words = (count) => Array(count).fill("word").join(" ");

test("passes a short description with an image, a way in and a review", () => {
  assert.deepEqual(rules(body(), [SCREEN, SERVICE]), []);
});

test("fails a Summary that is missing, empty or over 150 words", () => {
  assert.deepEqual(rules("Archive now shows Undo.", [DOC]), ["summary"]);
  assert.deepEqual(rules("## Summary\n\n<!-- The outcome. -->\n", [DOC]), ["summary"]);
  assert.deepEqual(rules(body({ summary: words(150) }), [DOC]), []);
  assert.deepEqual(rules(body({ summary: words(151) }), [DOC]), ["summary"]);
});

test("names the longest sections when the body is over 600 words", () => {
  const [error] = checkBody({ title: "", body: body({ rest: words(600) }), files: [DOC] });
  assert.equal(error.rule, "length");
  assert.match(error.message, /Longest: Verification 6\d\d, Screenshots/);
});

test("counts prose tables, but not images, screenshot tables, guidance or fenced output", () => {
  const uncounted = [
    `| ![${words(300)}](a) | ${words(300)} |`,
    `![${words(300)}](b)`,
    `<!-- ${words(300)} -->`,
    `\`\`\`text\n${words(300)}\n\`\`\``,
  ].join("\n\n");
  assert.deepEqual(rules(body({ rest: uncounted }), [DOC]), []);
  assert.deepEqual(rules(body({ rest: `| ${words(600)} |` }), [DOC]), ["length"]);
});

test("fails an audit skill in the title or the body, and allows this repository's own", () => {
  assert.deepEqual(rules(body({ summary: "Ran `emil-ui-review` on it." }), [DOC]), ["skill"]);
  assert.deepEqual(rules(body(), [DOC], "fix(web): apply Impeccable findings"), ["skill"]);
  assert.deepEqual(
    rules(
      body({ summary: "Drove verify, verify-phone and review-ui; `.impeccable/` is ignored." }),
      [DOC],
    ),
    [],
  );
});

test("asks a UI diff for an image and a way in", () => {
  assert.deepEqual(rules(body({ screenshots: "Looks right." }), [SCREEN]), ["screenshots", "try"]);
  const image = "![After](./after.png)";
  for (const line of ["Try it:", "Try it: <!-- path -->", "Try it: locally"]) {
    assert.deepEqual(rules(body({ screenshots: `${image}\n\n${line}` }), [SCREEN]), ["try"]);
  }
  for (const line of [
    "**Try it:** /today as fresh, after one review",
    "- **Try it**: the deck page on iPhone as learner",
  ]) {
    assert.deepEqual(rules(body({ screenshots: `${image}\n\n${line}` }), [SCREEN]), []);
  }
});

test("takes a stated reason in place of an image, but not a blank one", () => {
  const without = (screenshots) => rules(body({ screenshots }), [SCREEN]);
  assert.deepEqual(without("No visible change: the reducer moved to its own file."), []);
  assert.deepEqual(without("No visible change:"), ["screenshots", "try"]);
});

test("asks for an image only where a learner or visitor sees the file", () => {
  const asks = (path) =>
    rules(body({ screenshots: "" }), [path]).filter((rule) => rule !== "review").length > 0;
  for (const path of [
    "apps/web/src/client/routes/today.tsx",
    "apps/web/src/client/styles.css",
    "apps/site/src/pages/index.astro",
    "apps/mobile/src/app/index.tsx",
  ]) {
    assert.equal(asks(path), true, path);
  }
  for (const path of [
    "apps/web/src/client/components/button.browser.test.tsx",
    "apps/web/src/client/design/parts/frame.tsx",
    "apps/web/src/server/emails/reminder.tsx",
    "apps/mobile/store/screenshots/set.html",
    "apps/site/src/lib/plans.ts",
  ]) {
    assert.equal(asks(path), false, path);
  }
});

test("asks a behavior diff for a Review line inside Verification", () => {
  const unreviewed = body({ verification: "- `pnpm test`: passes." });
  assert.deepEqual(rules(unreviewed, [SERVICE]), ["review"]);
  assert.deepEqual(rules(`${unreviewed}\n## Follow-ups\n\nReview: later\n`, [SERVICE]), ["review"]);
  for (const path of [DOC, "packages/core/src/draw.test.ts", "scripts/ci-plan.mjs"]) {
    assert.deepEqual(rules(unreviewed, [path]), [], path);
  }
});

test("the template asks for what the check reads, and fails until it is filled", () => {
  const template = readFileSync(
    new URL("../.github/pull_request_template.md", import.meta.url),
    "utf8",
  );
  assert.deepEqual(rules(template, [SCREEN, SERVICE]), ["summary", "screenshots", "try", "review"]);
  const filled = template
    .replace("## Summary\n", "## Summary\n\nArchive now shows Undo.\n")
    .replace("## Screenshots\n", "## Screenshots\n\n![After](./after.png)\n")
    .replace("Try it:", "Try it: /library as learner, archive a card.")
    .replace("Review:", "Review: one reviewer, one round, nothing open.");
  assert.deepEqual(rules(filled, [SCREEN, SERVICE]), []);
});

test("reads the description from the environment, fails a person and only warns a bot", () => {
  const run = (author) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("./check-pr-body.mjs", import.meta.url))], {
      input: `${SERVICE}\0`,
      encoding: "utf8",
      env: { PR_TITLE: "fix(core): x", PR_BODY: "", PR_AUTHOR_TYPE: author },
    });
  const person = run("User");
  assert.equal(person.status, 1);
  assert.match(person.stderr, /no “Review: …” line/);
  const bot = run("Bot");
  assert.equal(bot.status, 0);
  assert.match(bot.stderr, /no “Review: …” line/);
});

test("shared design styles are rendered UI", () => {
  for (const file of ["packages/design/tokens.css", "packages/design/tray.css"]) {
    assert.deepEqual(rules(body({ screenshots: "" }), [file]), ["screenshots", "try"], file);
  }
});

test("a label with only formatting after it says nothing", () => {
  for (const empty of [
    "**No visible change:**",
    "**No visible change**:",
    "No visible change: **",
  ]) {
    assert.deepEqual(rules(body({ screenshots: empty }), [SCREEN]), ["screenshots", "try"], empty);
  }
  for (const empty of ["**Review:**", "- **Review**: ", "Review: _"]) {
    assert.deepEqual(rules(body({ verification: empty }), [SERVICE]), ["review"], empty);
  }
  for (const said of ["**No visible change:** types only.", "**No visible change**: types only."]) {
    assert.deepEqual(rules(body({ screenshots: said }), [SCREEN]), [], said);
  }
});
