import assert from "node:assert/strict";
import test from "node:test";
import {
  BUDGET,
  check,
  featureRows,
  memoryTree,
  pnpmScripts,
  productRoutes,
} from "./check-agent-docs.mjs";

const VERIFY = ".agents/skills/verify";
const ROUTES = "apps/web/src/client/routes";

const route = (id, body = "component: Page,") =>
  `export const Route = createFileRoute("${id}")({\n  ${body}\n});\n`;

/** A small repo that passes, for each test to break one way. */
function repo(overrides = {}, options = {}) {
  const files = {
    "AGENTS.md": [
      "# Guide",
      "",
      "Read [the README](README.md) and [the verify skill](.agents/skills/verify/SKILL.md).",
      "",
      "Run `pnpm verify:changed` and `node scripts/check-styling.mjs` before pushing; `deploy:site` is the user's.",
      "",
      "```bash",
      "pnpm --filter @lymi/web auth:schema",
      "```",
    ].join("\n"),
    "README.md": "# Lymi",
    "package.json": JSON.stringify({ scripts: { "verify:changed": "x", "deploy:site": "x" } }),
    "apps/web/package.json": JSON.stringify({ name: "@lymi/web", scripts: { "auth:schema": "x" } }),
    "scripts/check-styling.mjs": "",
    "scripts/check-design-docs.mjs": "",
    [`${VERIFY}/SKILL.md`]: [
      "# Verify",
      "",
      "Recipes live in `features/<feature>.mjs`; [`local-dev`](../local-dev/SKILL.md) sets the state.",
      "",
      "| Feature | Entry |",
      "| --- | --- |",
      "| Review | [review.md](features/review.md) |",
      "| Library | [library.md](features/library.md) |",
      "",
    ].join("\n"),
    [`${VERIFY}/features/review.md`]: "# Review\n\n## Reach\n\n`/review?deck=<id>`.\n",
    [`${VERIFY}/features/review.mjs`]: 'export const start = "/today";\n',
    [`${VERIFY}/features/library.md`]: "# Library\n\n## Reach\n\nOr `/library/<deck id>`.\n",
    [`${VERIFY}/features/library.mjs`]: 'export const start = "/library";\n',
    ".agents/skills/local-dev/SKILL.md": "# Local dev\n\nThen use the verify skill.\n",
    [`${ROUTES}/__root.tsx`]: "export const Route = createRootRoute({});\n",
    [`${ROUTES}/index.tsx`]: route("/", 'beforeLoad: () => { throw redirect({ to: "/today" }); },'),
    [`${ROUTES}/today.tsx`]: route("/today"),
    [`${ROUTES}/review.tsx`]: route("/review"),
    [`${ROUTES}/library.tsx`]: route("/library"),
    [`${ROUTES}/library.$deckId.tsx`]: route("/library/$deckId"),
    [`${ROUTES}/library.$deckId.browser.test.tsx`]: route("/library/$deckId/test"),
    ...overrides,
  };
  for (const [file, contents] of Object.entries(files)) if (contents === null) delete files[file];
  return memoryTree(files, options);
}

const run = (overrides, options) => check(repo(overrides), { unmapped: {}, ...options });

test("passes on a repo whose docs point at real things", () => {
  assert.deepEqual(run(), []);
});

test("a renamed script fails at the doc and line that name it", () => {
  const scripts = { "verify:diff": "x", "deploy:site": "x" };
  assert.deepEqual(run({ "package.json": JSON.stringify({ scripts }) }), [
    "AGENTS.md:5: pnpm verify:changed: the root package.json has no such script; name the script it was renamed to",
  ]);
});

test("a renamed workspace script and a bare script name both fail", () => {
  const found = run({
    "package.json": JSON.stringify({ scripts: { "verify:changed": "x" } }),
    "apps/web/package.json": JSON.stringify({ name: "@lymi/web", scripts: {} }),
  });
  assert.deepEqual(found, [
    "AGENTS.md:5: deploy:site is not a script in any package.json: name the script it was renamed to",
    "AGENTS.md:8: pnpm --filter @lymi/web auth:schema: @lymi/web's package.json has no such script; name the script it was renamed to",
  ]);
});

test("a renamed file fails for both a code path and a link", () => {
  const found = run({ "scripts/check-styling.mjs": null, "README.md": null });
  assert.deepEqual(found, [
    "AGENTS.md:3: link to README.md, which does not exist: point it at the file's new path",
    "AGENTS.md:5: scripts/check-styling.mjs does not exist: update the doc to the file's new path",
  ]);
});

test("a skill's relative link and a named skill must exist", () => {
  const found = run({
    ".agents/skills/local-dev/SKILL.md": "# Local dev\n\nThen use the verifier skill.\n",
    [`${VERIFY}/SKILL.md`]: `${repo().read(`${VERIFY}/SKILL.md`).replace("local-dev/", "localdev/")}`,
  });
  assert.deepEqual(found, [
    ".agents/skills/local-dev/SKILL.md:3: the verifier skill is not in .agents/skills: name an existing skill, or add it to EXTERNAL_SKILLS in scripts/check-agent-docs.mjs with where it comes from",
    ".agents/skills/verify/SKILL.md:3: link to ../localdev/SKILL.md, which does not exist: point it at the file's new path",
  ]);
});

test("placeholders check their folder, globs need a match, git-ignored files pass", () => {
  const doc = [
    "Each recipe is `features/<feature>.mjs`; tests are `scripts/*.test.mjs`.",
    "Keep `apps/web/.dev.vars` out of git, and copy these into a new `apps/web/src/x.css`.",
  ].join("\n");
  assert.deepEqual(
    check(repo({ "AGENTS.md": doc }, { ignored: ["apps/web/.dev.vars"] }), { unmapped: {} }),
    ["AGENTS.md:1: scripts/*.test.mjs does not exist: update the doc to the file's new path"],
  );
});

test("external links, anchors and fenced code in other languages are out of scope", () => {
  const doc = [
    "See [the docs](https://example.com/missing.md) and [below](#gates).",
    "",
    "```js",
    'import x from "scripts/gone.mjs";',
    "```",
  ].join("\n");
  assert.deepEqual(run({ "AGENTS.md": doc }), []);
});

test("a feature row without its recipe fails at the row", () => {
  assert.deepEqual(run({ [`${VERIFY}/features/library.mjs`]: null }).slice(0, 1), [
    ".agents/skills/verify/SKILL.md:8: Library has no recipe features/library.mjs: write the recipe beside its entry",
  ]);
});

test("a feature listed twice fails at its second row", () => {
  const skill = repo()
    .read(`${VERIFY}/SKILL.md`)
    .replace("| Library |", "| Review again | [review.md](features/review.md) |\n| Library |");
  assert.deepEqual(run({ [`${VERIFY}/SKILL.md`]: skill }), [
    ".agents/skills/verify/SKILL.md:8: features/review.md has a second row: keep one",
  ]);
});

test("an entry missing from the table, or a recipe without an entry, fails", () => {
  const found = run({
    [`${VERIFY}/features/archive.md`]: "# Archive\n",
    [`${VERIFY}/features/archive.mjs`]: "",
    [`${VERIFY}/features/orphan.mjs`]: "",
  });
  assert.deepEqual(found, [
    ".agents/skills/verify/features/archive.md: not in the feature table in .agents/skills/verify/SKILL.md: add a row for it",
    ".agents/skills/verify/features/orphan.mjs: a recipe with no entry: write .agents/skills/verify/features/orphan.md",
  ]);
});

test("a new route without an entry or a reason fails, and a reason clears it", () => {
  const added = { [`${ROUTES}/insights.tsx`]: route("/insights") };
  assert.match(
    run(added)[0],
    /^apps\/web\/src\/client\/routes\/insights\.tsx: \/insights has no verify entry/,
  );
  assert.deepEqual(run(added, { unmapped: { "/insights": "no entry yet" } }), []);
});

test("an entry naming the route, or a recipe going there, covers it", () => {
  const added = { [`${ROUTES}/settings_.delete-account.tsx`]: route("/settings_/delete-account") };
  assert.deepEqual(
    run({
      ...added,
      [`${VERIFY}/features/review.mjs`]:
        'export const start = "/today";\nawait page.goto("/settings/delete-account");\n',
    }),
    [],
  );
  assert.deepEqual(
    run({
      [`${ROUTES}/library.$deckId.settings.tsx`]: route("/library/$deckId/settings"),
      [`${VERIFY}/features/library.md`]: "`/library/<deck id>` or `/library/<deck id>/settings`.\n",
    }),
    [],
  );
});

test("a reason for a route that is covered or gone fails, so the list stays small", () => {
  assert.deepEqual(run({}, { unmapped: { "/review": "x", "/gone": "y" } }), [
    "scripts/check-agent-docs.mjs: /review has a verify entry now: drop it from UNMAPPED_ROUTES",
    "scripts/check-agent-docs.mjs: UNMAPPED_ROUTES lists /gone, which no route draws: drop it",
  ]);
});

test("reads route paths from createFileRoute ids, skipping tests and the root", () => {
  const routes = productRoutes(repo({ [`${ROUTES}/import.index.tsx`]: route("/import/") }));
  assert.deepEqual(
    routes.map(({ path, draws }) => [path, draws]),
    [
      ["/", false],
      ["/today", true],
      ["/review", true],
      ["/library", true],
      ["/library/$deckId", true],
      ["/import", true],
    ],
  );
});

test("AGENTS.md over its budget fails", () => {
  const long = `${repo().read("AGENTS.md")}\n\n${"x".repeat(BUDGET.root)}`;
  assert.deepEqual(run({ "AGENTS.md": long }), [
    `AGENTS.md: ${Buffer.byteLength(long)} bytes, over its ${BUDGET.root}-byte budget: move a rule that applies to one area into that area's AGENTS.md, or cut a sentence`,
  ]);
});

test("a nested guide is checked like the root and must be listed there", () => {
  const nested = {
    "apps/mobile/AGENTS.md": "# Phone\n\nRun `pnpm --filter @lymi/mobile symbols`.\n",
  };
  assert.deepEqual(run(nested), [
    "apps/mobile/AGENTS.md:3: pnpm --filter @lymi/mobile: no workspace has that name",
    "AGENTS.md: does not list apps/mobile/AGENTS.md: link it from the root guide",
  ]);
  const listed = `${repo().read("AGENTS.md")}\n\nThe phone has [its own guide](apps/mobile/AGENTS.md).`;
  assert.deepEqual(
    run({
      ...nested,
      "AGENTS.md": listed,
      "apps/mobile/package.json": JSON.stringify({
        name: "@lymi/mobile",
        scripts: { symbols: "x" },
      }),
    }),
    [],
  );
});

test("parses pnpm invocations into workspace and script", () => {
  assert.deepEqual(pnpmScripts("pnpm local db:fresh && pnpm --filter=@lymi/core run simulate"), [
    { filter: "", script: "local" },
    { filter: "@lymi/core", script: "simulate" },
  ]);
  assert.deepEqual(pnpmScripts("pnpm -r test; pnpm --filter @lymi/web exec vitest"), [
    { filter: "@lymi/web", script: "exec" },
  ]);
});

test("reads the feature table's rows with their lines", () => {
  const rows = featureRows(repo().read(`${VERIFY}/SKILL.md`));
  assert.deepEqual(rows, [
    { number: 7, title: "Review", entry: "features/review.md" },
    { number: 8, title: "Library", entry: "features/library.md" },
  ]);
});
