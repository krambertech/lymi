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
  linter: { enabled: true, rules: { preset: "recommended", a11y: { noSvgWithoutTitle: "off" } } },
  formatter: { lineWidth: 100 },
  overrides: [
    {
      includes: ["apps/mobile/**", "!apps/mobile/src/ui/**"],
      plugins: ["./biome-plugins/field-error.grit"],
    },
    {
      includes: ["apps/web/src/client/**"],
      linter: { rules: { style: { useFilenamingConvention: "warn" } } },
    },
  ],
};

const MANIFEST = {
  name: "lymi",
  scripts: {
    check: "biome check . && pnpm check:styling && pnpm --filter @lymi/mobile symbols:check",
    "check:styling": "node scripts/check-styling.mjs",
    "i18n:check": "pnpm i18n:extract && git diff --exit-code",
    "i18n:extract": "pnpm -r --filter @lymi/web i18n:extract",
    test: "pnpm -r test",
  },
};

const WEB = {
  name: "@lymi/web",
  scripts: {
    "i18n:extract": "lingui extract --clean",
    "deploy:check": "wrangler deploy --dry-run",
  },
};

const FILES = {
  "AGENTS.md": AGENTS,
  "biome.json": JSON.stringify(BIOME, null, 2),
  "package.json": JSON.stringify(MANIFEST),
  "apps/web/package.json": JSON.stringify(WEB),
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
      typeof change === "string" ? { path: change, status: "modified", added: [] } : change,
    ),
    base: tree(FILES),
    head: tree({ ...FILES, ...edits }),
  });
}

function added(path, ...lines) {
  return {
    path,
    status: "modified",
    added: lines.map((text, index) => ({ line: index + 1, text })),
  };
}

function biome(edit) {
  const config = structuredClone(BIOME);
  edit(config);
  return { "biome.json": JSON.stringify(config) };
}

function scripts(edit, manifest = MANIFEST) {
  const copy = structuredClone(manifest);
  edit(copy.scripts);
  return JSON.stringify(copy);
}

test("parseDiff keeps each file's status and added lines with their new line numbers", () => {
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
    "diff --git a/scripts/new.mjs b/scripts/new.mjs",
    "new file mode 100644",
    "--- /dev/null",
    "+++ b/scripts/new.mjs",
    "@@ -0,0 +1 @@",
    "+new",
    "diff --git a/icon.png b/icon.png",
    "Binary files a/icon.png and b/icon.png differ",
  ].join("\n");

  assert.deepEqual(parseDiff(diff), [
    {
      path: "apps/web/a.ts",
      status: "modified",
      added: [
        { line: 4, text: "  // biome-ignore lint/style/noNonNullAssertion" },
        { line: 5, text: "  return b!;" },
        { line: 11, text: "new" },
      ],
    },
    { path: "scripts/gone.mjs", status: "deleted", added: [] },
    { path: "scripts/new.mjs", status: "added", added: [{ line: 1, text: "new" }] },
    { path: "icon.png", status: "modified", added: [] },
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
    'brand: "#d97757", // check-styling: allow',
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
    'brand: "#d97757", // check-styling: allow: the partner\'s own mark',
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
    ["Adds `biome-ignore` without a reason at `apps/web/src/client/a.tsx:2`"],
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
        ...biome((config) => {
          config.formatter.lineWidth = 120;
        }),
        "package.json": scripts((all) => {
          all.test = "pnpm -r test --bail";
        }),
        "AGENTS.md": AGENTS.replace("Write less.", "Write less, and say it once."),
      },
    ),
    [],
  );
});

test("tightening biome.json passes: removed exclusions, new plugins and rules, stricter levels", () => {
  const tightenings = [
    // A migrated folder leaves a plugin's exclusion list.
    (config) => {
      config.overrides[0].includes = ["apps/mobile/**"];
    },
    (config) => {
      config.files.includes = ["**"];
    },
    (config) => {
      config.overrides.push({ includes: ["apps/web/**"], plugins: ["./biome-plugins/new.grit"] });
    },
    (config) => {
      config.overrides.push({
        includes: ["apps/site/**"],
        linter: { rules: { style: { noRestrictedImports: "error" } } },
      });
    },
    (config) => {
      config.overrides[1].linter.rules.style.useFilenamingConvention = "error";
    },
    // Deleting an "off" turns the rule back on.
    (config) => {
      delete config.linter.rules.a11y;
    },
    (config) => {
      config.overrides[0].includes.push("apps/web/**");
    },
  ];
  for (const edit of tightenings) {
    assert.deepEqual(
      guardrails(["biome.json", { path: "biome-plugins/new.grit", status: "added", added: [] }], {
        ...biome(edit),
      }),
      [],
      edit.toString(),
    );
  }
});

test("loosening biome.json is held and named", () => {
  const cases = [
    [
      (config) => {
        config.overrides[0].includes.push("!apps/mobile/src/legacy/**");
      },
      "Adds the exclusion `!apps/mobile/src/legacy/**` to `./biome-plugins/field-error.grit` for `apps/mobile/**` in `biome.json`",
    ],
    [
      (config) => {
        config.files.includes.push("!apps/web/src/legacy");
      },
      "Adds the lint exclusion `!apps/web/src/legacy` to `files.includes` in `biome.json`",
    ],
    [
      (config) => {
        config.files.includes = ["apps/**"];
      },
      "Drops `**` from `files.includes` in `biome.json`, so less is linted",
    ],
    [
      (config) => {
        config.overrides.splice(0, 1);
      },
      "Removes or rescopes `./biome-plugins/field-error.grit` for `apps/mobile/**` in `biome.json`",
    ],
    [
      (config) => {
        config.overrides[0].includes[0] = "apps/mobile/src/**";
      },
      "Removes or rescopes `./biome-plugins/field-error.grit` for `apps/mobile/**` in `biome.json`",
    ],
    [
      (config) => {
        config.overrides[1].linter.rules.style.useFilenamingConvention = "info";
      },
      "Relaxes `style/useFilenamingConvention` for `apps/web/src/client/**` in `biome.json`",
    ],
    [
      (config) => {
        config.overrides.push({
          includes: ["apps/site/**"],
          linter: { rules: { a11y: { useAltText: "off" } } },
        });
      },
      "Turns off `a11y/useAltText` for `apps/site/**` in `biome.json`",
    ],
    [
      (config) => {
        config.overrides[1].linter.rules.style.useFilenamingConvention = {
          level: "warn",
          options: { filenameCases: ["camelCase", "kebab-case"] },
        };
      },
      "Changes `style/useFilenamingConvention` for `apps/web/src/client/**` in `biome.json`; the gate cannot tell whether that loosens it",
    ],
    [
      (config) => {
        config.linter.rules.preset = "none";
      },
      "Changes `preset` for `every file` in `biome.json`; the gate cannot tell whether that loosens it",
    ],
    [
      (config) => {
        config.linter.enabled = false;
      },
      "Relaxes `the linter` for `every file` in `biome.json`",
    ],
    [
      (config) => {
        config.vcs = { useIgnoreFile: false };
      },
      "Changes `vcs` in `biome.json`; the gate cannot tell whether that loosens it",
    ],
  ];
  for (const [edit, message] of cases) {
    assert.deepEqual(guardrails(["biome.json"], biome(edit)), [message], message);
  }

  assert.deepEqual(guardrails(["biome.json"], { "biome.json": "{ not json" }), [
    "Leaves `biome.json` missing or unparseable on one side; the gate cannot tell whether that loosens it",
  ]);
});

test("a lint plugin may be added, but not deleted or rewritten without review", () => {
  assert.deepEqual(
    guardrails([{ path: "biome-plugins/new.grit", status: "added", added: [] }]),
    [],
  );
  assert.deepEqual(
    guardrails([{ path: "biome-plugins/field-error.grit", status: "deleted", added: [] }]),
    ["Deletes the lint plugin `biome-plugins/field-error.grit`"],
  );
  assert.deepEqual(guardrails(["biome-plugins/field-error.grit"]), [
    "Changes the lint plugin `biome-plugins/field-error.grit`; the gate cannot tell whether that loosens it",
  ]);
});

test("guardrailScripts follows pnpm calls across packages to the files they run", () => {
  const { scripts: found, files } = guardrailScripts(tree(FILES));

  assert.deepEqual([...found.keys()].sort(), [
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

test("a new check, or a new step in a check, passes", () => {
  assert.deepEqual(
    guardrails(
      ["package.json", { path: "scripts/check-agent-docs.mjs", status: "added", added: [] }],
      {
        "package.json": scripts((all) => {
          all["check:agent-docs"] = "node scripts/check-agent-docs.mjs";
          all.check += " && pnpm check:agent-docs";
        }),
      },
    ),
    [],
  );
});

test("removing a check or a step from one is held", () => {
  assert.deepEqual(
    guardrails(["package.json"], {
      "package.json": scripts((all) => {
        delete all["check:styling"];
        all.check = "biome check . && pnpm --filter @lymi/mobile symbols:check";
      }),
    }),
    [
      "Drops or rewrites `pnpm check:styling` in `check` in `package.json`",
      "Removes the check script `check:styling` in `package.json`",
    ],
  );

  assert.deepEqual(
    guardrails(["apps/web/package.json"], {
      "apps/web/package.json": scripts((all) => {
        all["i18n:extract"] = "true";
      }, WEB),
    }),
    ["Drops or rewrites `lingui extract --clean` in `i18n:extract` in `apps/web/package.json`"],
  );
});

test("a script outside the checks is not a guardrail", () => {
  assert.deepEqual(
    guardrails(["apps/web/package.json"], {
      "apps/web/package.json": scripts((all) => {
        all["deploy:check"] = "true";
      }, WEB),
    }),
    [],
  );
});

test("a file a check runs is held when it changes or goes", () => {
  assert.deepEqual(guardrails(["scripts/check-styling.mjs", "scripts/check-pr-title.mjs"]), [
    "Changes `scripts/check-pr-title.mjs`, named in the enforced-rules table; the gate cannot tell whether that loosens it",
    "Changes `scripts/check-styling.mjs`, run by `check:styling`; the gate cannot tell whether that loosens it",
  ]);
  assert.deepEqual(
    guardrails([{ path: "apps/mobile/scripts/symbols.mjs", status: "deleted", added: [] }]),
    ["Deletes `apps/mobile/scripts/symbols.mjs`, run by `symbols:check`"],
  );
});

test("the enforced-rules table may gain rows, but not lose or reword them", () => {
  const row = "| Titles follow the shape | `scripts/check-pr-title.mjs` in CI |\n";
  assert.deepEqual(
    guardrails(["AGENTS.md"], {
      "AGENTS.md": AGENTS.replace(
        row,
        `${row}| Docs point at real files | \`pnpm check:docs\` |\n`,
      ),
    }),
    [],
  );
  assert.deepEqual(guardrails(["AGENTS.md"], { "AGENTS.md": AGENTS.replace(row, "") }), [
    "Removes or rewords the enforced-rules row `Titles follow the shape` in `AGENTS.md`",
  ]);
  assert.deepEqual(
    guardrails(["AGENTS.md"], {
      "AGENTS.md": AGENTS.replace("Tokens only", "Tokens, mostly"),
    }),
    ["Removes or rewords the enforced-rules row `Tokens only` in `AGENTS.md`"],
  );
  assert.deepEqual(
    guardrails(["AGENTS.md"], { "AGENTS.md": AGENTS.replace("## Enforced rules", "## Rules") }),
    ["Removes the enforced-rules table from `AGENTS.md`"],
  );
});

test("any change to this gate is held", () => {
  assert.deepEqual(
    guardrails([
      added(".github/workflows/guardrail-review.yml", "# @ts-nocheck"),
      "scripts/guardrail-review.mjs",
      added("scripts/guardrail-review.test.mjs", "// biome-ignore lint/x"),
    ]),
    [
      "Changes this gate's own `.github/workflows/guardrail-review.yml`",
      "Changes this gate's own `scripts/guardrail-review.mjs`",
      "Changes this gate's own `scripts/guardrail-review.test.mjs`",
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
  const guardrail = "Deletes the lint plugin `biome-plugins/field-error.grit`";
  const waiting = renderSummary({
    guardrails: [guardrail],
    approved: false,
    reviewer: "krambertech",
    headSha: HEAD,
  });
  assert.match(waiting, /may loosen guardrails/);
  assert.ok(waiting.includes(`- ${guardrail}`));
  assert.match(waiting, /Waiting for @krambertech to approve head `aaaaaaa`/);
  assert.match(waiting, /`\/approve-guardrails`/);

  const approved = renderSummary({
    guardrails: [guardrail],
    approved: true,
    reviewer: "krambertech",
    headSha: HEAD,
  });
  assert.match(approved, /@krambertech approved head `aaaaaaa`/);

  assert.match(
    renderSummary({ guardrails: [], approved: false, reviewer: "krambertech", headSha: HEAD }),
    /loosens no guardrail/,
  );
});
