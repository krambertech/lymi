import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createCommands,
  createEas,
  EAS_CLI_VERSION,
  hasLiveBuild,
  iosGroups,
  promotionCheck,
  readiness,
  recordSampleCalls,
  rollbackPlan,
  rolloutDue,
  sampleCalls,
} from "./phone-release.mjs";

const linked = {
  extra: { eas: { projectId: "0b5f6a1e-9d2c-4f7b-8e1a-3c4d5e6f7a8b" } },
  updates: { url: "https://u.expo.dev/0b5f6a1e-9d2c-4f7b-8e1a-3c4d5e6f7a8b" },
};

test("is ready only with a token, a project and an update URL", () => {
  assert.deepEqual(readiness({ token: "token", config: linked }), { ready: true, reason: "" });
  const { ready, reason } = readiness({ token: "", config: {} });
  assert.equal(ready, false);
  assert.match(reason, /EXPO_TOKEN.*projectId.*updates\.url/);
});

test("keeps the groups that ship to iOS", () => {
  const list = {
    currentPage: [
      { group: "a", platforms: "android" },
      { group: "b", platforms: "android, ios" },
      { group: "c", platforms: "ios" },
    ],
  };
  assert.deepEqual(
    iosGroups(list).map((group) => group.group),
    ["b", "c"],
  );
  assert.deepEqual(iosGroups(undefined), []);
});

test("counts a queued or finished build and ignores a failed one", () => {
  assert.equal(hasLiveBuild([{ status: "ERRORED" }, { status: "CANCELED" }]), false);
  assert.equal(hasLiveBuild([{ status: "ERRORED" }, { status: "IN_QUEUE" }]), true);
  assert.equal(hasLiveBuild([{ status: "FINISHED" }]), true);
  assert.equal(hasLiveBuild([]), false);
});

test("finishes a partial rollout after its day", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  const partial = { rolloutPercentage: 10 };
  assert.equal(rolloutDue(partial, "2026-10-12T11:00:00Z", now, 24), true);
  assert.equal(rolloutDue(partial, "2026-10-12T13:00:00Z", now, 24), false);
  assert.equal(rolloutDue({}, "2026-10-01T00:00:00Z", now, 24), false);
  assert.equal(rolloutDue({ rolloutPercentage: 100 }, "2026-10-01T00:00:00Z", now, 24), false);
});

test("reverts a rollout before anything else", () => {
  const groups = [
    { group: "new", runtimeVersion: "r1", rolloutPercentage: 10 },
    { group: "old", runtimeVersion: "r1" },
  ];
  assert.deepEqual(rollbackPlan(groups), { action: "revert-rollout", group: "new" });
});

test("brings back the previous update on the same runtime", () => {
  const groups = [
    { group: "new", runtimeVersion: "r2" },
    { group: "other-binary", runtimeVersion: "r1" },
    { group: "old", runtimeVersion: "r2" },
  ];
  assert.deepEqual(rollbackPlan(groups), { action: "republish", group: "old" });
});

test("falls back to the binary's own update when nothing came before", () => {
  const groups = [
    { group: "new", runtimeVersion: "r2" },
    { group: "other-binary", runtimeVersion: "r1" },
  ];
  assert.deepEqual(rollbackPlan(groups), { action: "embedded", runtime: "r2" });
  const afterRollback = [
    { group: "new", runtimeVersion: "r2" },
    { group: "embedded", runtimeVersion: "r2", isRollBackToEmbedded: true },
  ];
  assert.deepEqual(rollbackPlan(afterRollback), { action: "embedded", runtime: "r2" });
});

test("republishes the named group, and has nothing to undo on an empty branch", () => {
  assert.deepEqual(rollbackPlan([], "chosen"), { action: "republish", group: "chosen" });
  assert.deepEqual(rollbackPlan([]), { action: "none" });
});

const manifest = JSON.parse(readFileSync(new URL("./eas-cli-commands.json", import.meta.url)));

/** Fails when an argv names a command, flag or argument the pinned CLI does not accept. */
function assertAccepted(argv) {
  assert.deepEqual(argv.slice(0, 3), ["npx", "--yes", `eas-cli@${EAS_CLI_VERSION}`]);
  const [id, ...rest] = argv.slice(3);
  const command = manifest.commands[id];
  assert.ok(command, `eas-cli ${EAS_CLI_VERSION} has no ${id} command`);
  let positionals = 0;
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith("--")) {
      positionals++;
      continue;
    }
    const name = token.slice(2);
    const type =
      command.flags[name] ??
      (command.flags[name.replace(/^no-/, "")] === "boolean-or-no" ? "boolean" : undefined);
    assert.ok(type, `eas-cli ${EAS_CLI_VERSION} ${id} rejects ${token}`);
    if (type === "option") i++;
  }
  assert.ok(positionals <= command.args.length, `${id} takes ${command.args.length} arguments`);
}

/** A stub CLI that answers like a project with one partial production rollout. */
function stubEas() {
  const calls = [];
  const captured = new Set();
  const answers = {
    "channel:list": { currentPage: [{ name: "beta" }] },
    "update:list": {
      currentPage: [
        {
          group: "g2",
          runtimeVersion: "r1",
          rolloutPercentage: 10,
          platforms: "ios",
          message: "x",
        },
        { group: "g1", runtimeVersion: "r1", platforms: "ios", message: "y" },
      ],
    },
    "update:view": [
      { platform: "ios", gitCommitHash: "abc1234def", createdAt: "2026-10-01T00:00:00Z" },
    ],
    "build:list": [{ status: "FINISHED" }],
  };
  const eas = createEas((argv, { capture }) => {
    calls.push(argv);
    if (capture) captured.add(argv[3]);
    return capture ? JSON.stringify(answers[argv[3]] ?? {}) : null;
  });
  return { calls, captured, eas };
}

test("records the pinned CLI's commands", () => {
  assert.equal(manifest.version, EAS_CLI_VERSION);
  assert.equal(manifest.commands["update:view"].flags["non-interactive"], undefined);
});

test("sends only flags the pinned CLI accepts, for every call", () => {
  const { calls, eas } = stubEas();
  sampleCalls(eas);
  assert.equal(calls.length, 13);
  for (const argv of calls) assertAccepted(argv);
});

test("sends exactly the calls the pinned CLI's own parser accepted, values included", () => {
  assert.deepEqual(
    recordSampleCalls(),
    manifest.accepted,
    "An EAS call changed; run node scripts/phone-release.mjs manifest to check it with the CLI.",
  );
});

test("captures only the output it parses, so the rest reaches the job log", () => {
  const { captured, eas } = stubEas();
  eas.channels();
  eas.groups("beta");
  eas.view("g1");
  eas.builds("beta", "r1");
  eas.createChannel("production");
  eas.build("beta");
  eas.publish("beta", "preview", "m");
  eas.republish("g1", "production", "m", 10);
  assert.deepEqual([...captured].sort(), [
    "build:list",
    "channel:list",
    "update:list",
    "update:view",
  ]);
});

test("creates only the channels a fresh project is missing", () => {
  const { calls, eas } = stubEas();
  createCommands(eas).channels();
  const created = calls.filter((argv) => argv[3] === "channel:create").map((argv) => argv[4]);
  assert.deepEqual(created, ["production"]);
});

test("the release commands reach the CLI through accepted calls", () => {
  const { calls, eas } = stubEas();
  const commands = createCommands(eas);
  assert.deepEqual(commands.latest("beta"), {
    group: "g2",
    runtime: "r1",
    rollout: 10,
    commit: "abc1234def",
  });
  commands["finish-rollout"]("production", "24");
  commands.rollback("production");
  assert.ok(calls.some((argv) => argv[3] === "update:edit"));
  assert.ok(calls.some((argv) => argv[3] === "update:revert-update-rollout"));
  for (const argv of calls) assertAccepted(argv);
});

test("promotes only the tested group, once, with no rollout running", () => {
  const beta = { group: "b2" };
  const done = [{ message: "[Oct 12 by ci] Promote abc1234", rolloutPercentage: 10 }];
  assert.deepEqual(promotionCheck({ planned: "b2", beta, production: [], commit: "abc1234def" }), {
    ok: true,
  });
  assert.equal(
    promotionCheck({ planned: "b1", beta, production: [], commit: "abc1234def" }).ok,
    false,
  );
  assert.equal(
    promotionCheck({ planned: "b2", beta, production: done, commit: "abc1234def" }).done,
    true,
  );
  const running = [{ message: "Promote 9999999", rolloutPercentage: 10 }];
  assert.match(
    promotionCheck({ planned: "b2", beta, production: running, commit: "abc1234def" }).reason,
    /rollout is still running/,
  );
});
