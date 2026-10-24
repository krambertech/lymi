import assert from "node:assert/strict";
import test from "node:test";
import {
  approvedAt,
  guardrailChanges,
  guardrailScripts,
  parseDiff,
  renderSummary,
  unexplainedSuppression,
} from "./guardrail-review.mjs";

const AGENTS = [
  "# Lymi",
  "",
  "## Enforced rules",
  "",
  "| Rule | Check |",
  "| --- | --- |",
  "| Tokens only | `pnpm check:styling` |",
  "| Strings extracted | `pnpm i18n:check` |",
  "| Titles follow the shape | `scripts/check-pr-title.mjs` in CI |",
  "",
  "## Concise writing",
  "",
  "Write less.",
  "",
].join("\n");

const BIOME = {
  files: { includes: ["**", "!**/dist"] },
  linter: { enabled: true, rules: { preset: "recommended" } },
  formatter: { lineWidth: 100 },
  overrides: [
    { includes: ["apps/mobile/**"], plugins: ["./biome-plugins/field-error.grit"] },
    {
      includes: ["apps/web/src/client/**"],
      linter: { rules: { style: { useFilenamingConvention: "error" } } },
    },
  ],
};

const FILES = {
  "AGENTS.md": AGENTS,
  "biome.json": JSON.stringify(BIOME, null, 2),
  "package.json": JSON.stringify({
    name: "lymi",
    scripts: {
      check: "biome check . && pnpm check:styling && pnpm --filter @lymi/mobile symbols:check",
      "check:styling": "node scripts/check-styling.mjs",
      "i18n:check": "pnpm i18n:extract && git diff --exit-code",
      "i18n:extract": "pnpm -r --filter @lymi/web i18n:extract",
      test: "pnpm -r test",
    },
  }),
  "apps/web/package.json": JSON.stringify({
    name: "@lymi/web",
    scripts: {
      "i18n:extract": "lingui extract --clean",
      "deploy:check": "wrangler deploy --dry-run",
    },
  }),
  "apps/mobile/package.json": JSON.stringify({
    name: "@lymi/mobile",
    scripts: { "symbols:check": "node scripts/symbols.mjs --check" },
  }),
};

function tree(files) {
  return {
    read: (path) => files[path],
    list: () => Object.keys(files),
  };
}

function guardrails(changes, edits = {}) {
  return guardrailChanges({
    changes: changes.map((change) =>
      typeof change === "string" ? { path: change, added: [] } : change,
    ),
    base: tree(FILES),
    head: tree({ ...FILES, ...edits }),
  });
}

function added(path, ...lines) {
  return { path, added: lines.map((text, index) => ({ line: index + 1, text })) };
}

test("parseDiff keeps each file's added lines with their new line numbers", () => {
  const diff = [
    "diff --git a/apps/web/a.ts b/apps/web/a.ts",
    "index 1..2 100644",
    "--- a/apps/web/a.ts",
    "+++ b/apps/web/a.ts",
    "@@ -3,0 +4,2 @@ function a() {",
    "+  // biome-ignore lint/style/noNonNullAssertion",
    "+  return b!;",
    "@@ -9 +11 @@",
    "-old",
    "+new",
    "diff --git a/scripts/gone.mjs b/scripts/gone.mjs",
    "deleted file mode 100644",
    "--- a/scripts/gone.mjs",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-gone",
    "diff --git a/icon.png b/icon.png",
    "Binary files a/icon.png and b/icon.png differ",
  ].join("\n");

  assert.deepEqual(parseDiff(diff), [
    {
      path: "apps/web/a.ts",
      added: [
        { line: 4, text: "  // biome-ignore lint/style/noNonNullAssertion" },
        { line: 5, text: "  return b!;" },
        { line: 11, text: "new" },
      ],
    },
    { path: "scripts/gone.mjs", added: [] },
    { path: "icon.png", added: [] },
  ]);
});

test("a suppression needs a reason in its tool's own syntax", () => {
  const unexplained = [
    "// biome-ignore lint/suspicious/noExplicitAny",
    "// biome-ignore lint/suspicious/noExplicitAny:",
    "// biome-ignore lint/suspicious/noExplicitAny: todo",
    "{/* biome-ignore lint/a11y/useAltText: <explanation> */}",
    "/* biome-ignore-all lint/style/useImportType */",
    "// @ts-expect-error",
    "  // @ts-ignore",
    "// @ts-nocheck",
    "/* eslint-disable */",
    "foo(); // eslint-disable-line",
    "// eslint-disable-next-line no-console",
    "// oxlint-disable-next-line no-console",
  ];
  for (const line of unexplained) {
    assert.ok(unexplainedSuppression(line), line);
  }

  const explained = [
    "// biome-ignore lint/suspicious/noArrayIndexKey: rows never reorder",
    "{/* biome-ignore lint/a11y/useAltText: the image is decorative */}",
    "// biome-ignore-start lint/style/noRestrictedImports: the one wrapper",
    "// biome-ignore-end lint/style/noRestrictedImports",
    "// @ts-expect-error the fixture omits a required field on purpose",
    "// @ts-expect-error: Hermes lacks the type",
    "// eslint-disable-next-line no-console -- the CLI prints its result",
    'const note = "biome-ignore is a Biome comment";',
    "const total = items.length; // eslint is not used here",
  ];
  for (const line of explained) {
    assert.equal(unexplainedSuppression(line), undefined, line);
  }
});

test("an added suppression without a reason names its file and line", () => {
  assert.deepEqual(
    guardrails([
      added(
        "apps/web/src/client/a.tsx",
        "const a = 1;",
        "// biome-ignore lint/suspicious/noExplicitAny",
      ),
    ]),
    ["`biome-ignore` without a reason at `apps/web/src/client/a.tsx:2`"],
  );
});

test("suppressions in prose and generated files are not counted", () => {
  assert.deepEqual(
    guardrails([
      added("docs/testing.md", "Write `// @ts-expect-error` only with a reason."),
      added("apps/site/worker-configuration.d.ts", "/* eslint-disable */"),
      added("apps/web/src/client/routeTree.gen.ts", "// @ts-nocheck"),
    ]),
    [],
  );
});

test("a pull request that touches no guardrail is unaffected", () => {
  assert.deepEqual(
    guardrails(
      [
        added("apps/web/src/client/a.tsx", "export const a = 1;"),
        "biome.json",
        "package.json",
        "AGENTS.md",
      ],
      {
        "biome.json": JSON.stringify({ ...BIOME, formatter: { lineWidth: 120 } }),
        "package.json": FILES["package.json"].replace("pnpm -r test", "pnpm -r test --bail"),
        "AGENTS.md": AGENTS.replace("Write less.", "Write less, and say it once."),
      },
    ),
    [],
  );
});

test("lint plugins and their entries, exclusions and rules in biome.json are guardrails", () => {
  assert.deepEqual(guardrails(["biome-plugins/field-error.grit"]), [
    "Lint plugin `biome-plugins/field-error.grit`",
  ]);

  const loosened = structuredClone(BIOME);
  loosened.overrides[0].includes.push("!apps/mobile/src/legacy/**");
  assert.deepEqual(guardrails(["biome.json"], { "biome.json": JSON.stringify(loosened) }), [
    "Lint plugins or the files they cover in `biome.json`",
  ]);

  const unplugged = structuredClone(BIOME);
  unplugged.overrides[0].plugins = [];
  assert.deepEqual(guardrails(["biome.json"], { "biome.json": JSON.stringify(unplugged) }), [
    "Lint plugins or the files they cover in `biome.json`",
  ]);

  const relaxed = structuredClone(BIOME);
  relaxed.overrides[1].linter.rules.style.useFilenamingConvention = "off";
  assert.deepEqual(guardrails(["biome.json"], { "biome.json": JSON.stringify(relaxed) }), [
    "Lint rules or the files they cover in `biome.json`",
  ]);

  const unignored = structuredClone(BIOME);
  unignored.files.includes.push("!apps/web/src/legacy");
  assert.deepEqual(guardrails(["biome.json"], { "biome.json": JSON.stringify(unignored) }), [
    "Files excluded from lint in `biome.json`",
  ]);

  const plugged = structuredClone(BIOME);
  plugged.overrides.push({ includes: ["apps/web/**"], plugins: ["./biome-plugins/new.grit"] });
  assert.deepEqual(
    guardrails(["biome.json", "biome-plugins/new.grit"], { "biome.json": JSON.stringify(plugged) }),
    [
      "Lint plugin `biome-plugins/new.grit`",
      "Lint plugins or the files they cover in `biome.json`",
    ],
  );

  assert.deepEqual(guardrails(["biome.json"], { "biome.json": "{ not json" }), [
    "`biome.json`, which no longer parses or exists on one side",
  ]);
});

test("guardrailScripts follows pnpm calls across packages to the files they run", () => {
  const { scripts, files } = guardrailScripts(tree(FILES));

  assert.deepEqual([...scripts.keys()].sort(), [
    "apps/mobile/package.json symbols:check",
    "apps/web/package.json i18n:extract",
    "package.json check",
    "package.json check:styling",
    "package.json i18n:check",
    "package.json i18n:extract",
  ]);
  assert.deepEqual(Object.fromEntries(files), {
    "scripts/check-pr-title.mjs": "named in the enforced-rules table",
    "scripts/check-styling.mjs": "run by `check:styling`",
    "apps/mobile/scripts/symbols.mjs": "run by `symbols:check`",
  });
});

test("a check script, a script it calls, or a file it runs is a guardrail", () => {
  const manifest = JSON.parse(FILES["package.json"]);
  manifest.scripts["check:styling"] = "true";
  assert.deepEqual(guardrails(["package.json"], { "package.json": JSON.stringify(manifest) }), [
    "Check script `check:styling` in `package.json`",
  ]);

  const web = JSON.parse(FILES["apps/web/package.json"]);
  web.scripts["i18n:extract"] = "true";
  assert.deepEqual(
    guardrails(["apps/web/package.json"], { "apps/web/package.json": JSON.stringify(web) }),
    ["Check script `i18n:extract` in `apps/web/package.json`"],
  );

  const added = JSON.parse(FILES["package.json"]);
  added.scripts["check:agent-docs"] = "node scripts/check-agent-docs.mjs";
  assert.deepEqual(
    guardrails(["package.json", "scripts/check-agent-docs.mjs"], {
      "package.json": JSON.stringify(added),
    }),
    [
      "Check script `check:agent-docs` in `package.json`",
      "`scripts/check-agent-docs.mjs`, run by `check:agent-docs`",
    ],
  );

  assert.deepEqual(guardrails(["apps/mobile/scripts/symbols.mjs", "scripts/check-pr-title.mjs"]), [
    "`apps/mobile/scripts/symbols.mjs`, run by `symbols:check`",
    "`scripts/check-pr-title.mjs`, named in the enforced-rules table",
  ]);
});

test("a script outside the checks is not a guardrail", () => {
  const web = JSON.parse(FILES["apps/web/package.json"]);
  web.scripts["deploy:check"] = "true";
  assert.deepEqual(
    guardrails(["apps/web/package.json"], { "apps/web/package.json": JSON.stringify(web) }),
    [],
  );
});

test("removing a check script is a guardrail change", () => {
  const manifest = JSON.parse(FILES["package.json"]);
  delete manifest.scripts["check:styling"];
  manifest.scripts.check = "biome check .";
  assert.deepEqual(
    guardrails(["package.json", "scripts/check-styling.mjs"], {
      "package.json": JSON.stringify(manifest),
    }),
    [
      "Check script `check` in `package.json`",
      "Check script `check:styling` in `package.json`",
      "Check script `symbols:check` in `apps/mobile/package.json`",
      "`scripts/check-styling.mjs`, run by `check:styling`",
    ],
  );
});

test("the enforced-rules table and this gate's own files are guardrails", () => {
  assert.deepEqual(
    guardrails(["AGENTS.md"], {
      "AGENTS.md": AGENTS.replace("| Tokens only | `pnpm check:styling` |\n", ""),
    }),
    ["The enforced-rules table in `AGENTS.md`"],
  );

  assert.deepEqual(
    guardrails([
      added(".github/workflows/guardrail-review.yml", "# @ts-nocheck"),
      "scripts/guardrail-review.mjs",
    ]),
    [
      "This gate's own `.github/workflows/guardrail-review.yml`",
      "This gate's own `scripts/guardrail-review.mjs`",
    ],
  );
});

const HEAD = "a".repeat(40);
const OLD = "b".repeat(40);

function review(login, state, commit_id = HEAD, body = "") {
  return { user: { login }, state, commit_id, body };
}

test("approvedAt takes only the reviewer's approval of the head commit", () => {
  const options = { reviewer: "krambertech", headSha: HEAD };

  assert.equal(approvedAt([], options), false);
  assert.equal(approvedAt([review("krambertech", "APPROVED")], options), true);
  assert.equal(approvedAt([review("Krambertech", "APPROVED")], options), true);
  assert.equal(approvedAt([review("someone-else", "APPROVED")], options), false);
  assert.equal(approvedAt([review("krambertech", "APPROVED", OLD)], options), false);
  assert.equal(approvedAt([review("krambertech", "DISMISSED")], options), false);
  assert.equal(
    approvedAt(
      [review("krambertech", "APPROVED"), review("krambertech", "CHANGES_REQUESTED")],
      options,
    ),
    false,
  );
});

test("on a pull request from the reviewer's own account, a review with the command approves", () => {
  const options = { reviewer: "krambertech", headSha: HEAD };

  assert.equal(
    approvedAt(
      [review("krambertech", "COMMENTED", HEAD, "Read the plugin.\n/approve-guardrails")],
      options,
    ),
    true,
  );
  assert.equal(
    approvedAt(
      [review("krambertech", "COMMENTED", HEAD, "Not yet: /approve-guardrails later")],
      options,
    ),
    false,
  );
  assert.equal(
    approvedAt([review("krambertech", "COMMENTED", OLD, "/approve-guardrails")], options),
    false,
  );
  assert.equal(
    approvedAt([review("an-agent", "COMMENTED", HEAD, "/approve-guardrails")], options),
    false,
  );
});

test("renderSummary names each guardrail and what clears it", () => {
  const waiting = renderSummary({
    guardrails: ["Lint plugin `biome-plugins/field-error.grit`"],
    approved: false,
    reviewer: "krambertech",
    headSha: HEAD,
  });
  assert.match(waiting, /- Lint plugin `biome-plugins\/field-error.grit`/);
  assert.match(waiting, /Waiting for @krambertech to approve head `aaaaaaa`/);
  assert.match(waiting, /`\/approve-guardrails`/);

  const approved = renderSummary({
    guardrails: ["Lint plugin `biome-plugins/field-error.grit`"],
    approved: true,
    reviewer: "krambertech",
    headSha: HEAD,
  });
  assert.match(approved, /@krambertech approved head `aaaaaaa`/);

  assert.match(
    renderSummary({ guardrails: [], approved: false, reviewer: "krambertech", headSha: HEAD }),
    /changes no guardrail/,
  );
});
