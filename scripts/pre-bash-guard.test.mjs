import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { check, segments } from "../.claude/hooks/pre-bash-guard.mjs";

const hook = fileURLToPath(new URL("../.claude/hooks/pre-bash-guard.mjs", import.meta.url));

const refused = {
  production: {
    alternative: /pnpm deploy:check.*pnpm deploy:health/,
    commands: [
      "pnpm deploy",
      "pnpm run deploy",
      "pnpm deploy:site",
      "pnpm deploy:product",
      "pnpm db:migrate:prod",
      "pnpm --filter @lymi/web db:migrate:prod",
      "pnpm --filter @lymi/web run deploy",
      "pnpm --filter @lymi/web design:deploy",
      "npm run deploy",
      "wrangler deploy",
      "npx wrangler deploy -c dist/lymi/wrangler.json",
      "cd apps/web && pnpm exec wrangler deploy",
      "pnpm wrangler versions deploy",
      "wrangler d1 migrations apply lymi --remote",
      "pnpm --filter @lymi/web exec wrangler d1 migrations apply lymi --remote",
      "wrangler -c dist/lymi/wrangler.json deploy",
      "npx wrangler@latest deploy",
      "pnpm dlx wrangler@4 deploy",
      "wrangler rollback",
      "wrangler delete lymi",
      "wrangler secret put OPENAI_API_KEY",
      "wrangler versions secret put OPENAI_API_KEY",
      "wrangler secret delete OPENAI_API_KEY",
      "wrangler d1 execute lymi --remote --command 'DELETE FROM card'",
    ],
  },
  stash: {
    alternative: /WIP commit.*git stash push -u -m.*git stash apply <sha>/,
    commands: [
      "git stash",
      "git stash -u",
      "git stash push",
      "git stash push -u",
      "git stash pop",
      "git stash pop stash@{0}",
      "git stash apply",
      "git stash drop",
      "git stash clear",
      "git -C ../lymi stash",
      "git add . && git stash && git pull && git stash pop",
    ],
  },
  phone: {
    alternative: /pnpm exec stim ios/,
    commands: [
      "npx expo run:ios",
      "cd apps/mobile && npx expo run:ios",
      "pnpm exec expo run:ios --device abc",
      "pnpm --filter @lymi/mobile exec expo run:ios --configuration Release",
      "pnpm expo run:ios",
      "npx expo@latest run:ios",
      "pnpm ios",
      "pnpm --filter @lymi/mobile ios",
      "pnpm run ios",
    ],
  },
  "browser suite": {
    alternative: /pnpm test:e2e:chromium.*LYMI_FULL_SUITE=1 pnpm test:e2e/,
    commands: [
      "pnpm test:e2e",
      "pnpm run test:e2e",
      "pnpm test:e2e --reporter list",
      "pnpm test:e2e -- --workers 2",
      "npx playwright test",
      "pnpm exec playwright test",
      "timeout 900 pnpm test:e2e 2>&1 | tail -50",
    ],
  },
  "full gate": {
    alternative: /pnpm verify:changed.*LYMI_FULL_SUITE=1 pnpm verify/,
    commands: ["pnpm verify", "pnpm run verify", "pnpm verify > /tmp/verify.log 2>&1"],
  },
};

const allowed = [
  "pnpm deploy:check",
  "pnpm deploy:check:product",
  "pnpm deploy:health",
  "pnpm db:migrate",
  "pnpm --filter @lymi/web design:check",
  "npx wrangler deploy --dry-run",
  "wrangler d1 migrations apply lymi --local",
  "wrangler d1 migrations list lymi --remote",
  "wrangler d1 execute lymi --local --command 'SELECT 1'",
  "wrangler secret list",
  "npx wrangler@latest deploy --dry-run",
  "git stash list",
  "git stash list --format='%H %gs'",
  "git stash show -p stash@{1}",
  'git stash push -u -m "rebase-ab12"',
  "git stash -m tagged",
  "git stash apply 3f2a1b9",
  "git stash drop stash@{2}",
  "git stash branch rescue 3f2a1b9",
  "pnpm exec stim ios",
  "pnpm exec stim ios --no-build-cache",
  "EXPO_PUBLIC_API_URL=http://localhost:5241 LANG=en_US.UTF-8 npx expo run:ios --configuration Release --device ABC-123 --no-bundler",
  "npx expo run:android",
  "pnpm test:e2e:chromium",
  "pnpm test:e2e:ui",
  "pnpm test:e2e --project=webkit",
  "pnpm test:e2e -- --project webkit",
  "pnpm test:e2e e2e/core-learning-flow.spec.ts",
  "pnpm exec playwright test --grep review",
  "LYMI_FULL_SUITE=1 pnpm test:e2e",
  "export LYMI_FULL_SUITE=1 && pnpm test:e2e",
  "export LYMI_FULL_SUITE=1; bash -c 'pnpm verify'",
  "LYMI_FULL_SUITE=1 sh -c 'pnpm test:e2e'",
  "pnpm verify:changed",
  "LYMI_FULL_SUITE=1 pnpm verify",
  "pnpm test",
  'git commit -m "Never run pnpm deploy or git stash pop"',
  "echo pnpm deploy",
  "grep -rn 'expo run:ios' docs",
  "cat > notes.md <<'EOF'\npnpm deploy\ngit stash\nEOF\ngit status",
];

for (const [rule, { alternative, commands }] of Object.entries(refused)) {
  test(`refuses the ${rule} commands and names the alternative`, () => {
    for (const command of commands) {
      const reason = check(command);
      assert.ok(reason, `${command} should be refused`);
      assert.match(reason, alternative, command);
    }
  });
}

test("lets the neighbours of each refused command run", () => {
  for (const command of allowed) assert.equal(check(command), null, command);
});

test("an opt-in with a zero or an empty value still refuses the full suite", () => {
  assert.ok(check("LYMI_FULL_SUITE=0 pnpm test:e2e"));
  assert.ok(check("LYMI_FULL_SUITE= pnpm verify"));
});

test("checks the command a shell runs with -c", () => {
  assert.ok(check(`bash -c "pnpm deploy"`));
  assert.ok(check(`sh -lc 'cd apps/mobile && npx expo run:ios'`));
  assert.equal(check(`bash -c "pnpm deploy:check"`), null);
});

test("splits a command on operators but keeps quoted text and drops redirect targets", () => {
  assert.deepEqual(segments(`a "b c" 'd|e' && f >out 2>&1 | g; $(h) \`i\``), [
    ["a", "b c", "d|e"],
    ["f"],
    ["g"],
    ["h"],
    ["i"],
  ]);
});

function runHook(payload) {
  const result = spawnSync(process.execPath, [hook], { input: payload, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("the hook denies a refused Bash command in Claude Code's format", () => {
  const output = JSON.parse(
    runHook(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git stash" } })),
  );
  assert.equal(output.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /git stash push -u -m/);
});

test("the hook stays silent for an allowed command, another tool or unreadable input", () => {
  assert.equal(
    runHook(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git stash list" } })),
    "",
  );
  assert.equal(
    runHook(JSON.stringify({ tool_name: "Read", tool_input: { command: "pnpm deploy" } })),
    "",
  );
  assert.equal(runHook("not json"), "");
});
