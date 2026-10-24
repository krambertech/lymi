import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createCommands,
  createEas,
  EAS_CLI_VERSION,
  hasLiveBuild,
  platformGroups,
  promotionCandidate,
  promotionCheck,
  readiness,
  recordSampleCalls,
  releasePlatforms,
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

test("releases iOS alone until PHONE_PLATFORMS names Android", () => {
  assert.deepEqual(releasePlatforms(undefined), ["ios"]);
  assert.deepEqual(releasePlatforms(""), ["ios"]);
  assert.deepEqual(releasePlatforms("android, ios"), ["ios", "android"]);
  assert.deepEqual(releasePlatforms("android"), ["android"]);
  assert.throws(() => releasePlatforms("ios,web"), /PHONE_PLATFORMS names web/);
});

test("keeps the groups that ship to the platform", () => {
  const list = {
    currentPage: [
      { group: "a", platforms: "android" },
      { group: "b", platforms: "android, ios" },
      { group: "c", platforms: "ios" },
    ],
  };
  assert.deepEqual(
    platformGroups(list, "ios").map((group) => group.group),
    ["b", "c"],
  );
  assert.deepEqual(
    platformGroups(list, "android").map((group) => group.group),
    ["a", "b"],
  );
  assert.deepEqual(platformGroups(undefined, "ios"), []);
});

test("promotes one commit that every released platform runs on beta", () => {
  const ios = { group: "i1", runtime: "ri", commit: "abc1234def" };
  const android = { group: "a1", runtime: "ra", commit: "abc1234def" };
  assert.deepEqual(promotionCandidate({ ios, android }), {
    ok: true,
    commit: "abc1234def",
    groups: { ios: { group: "i1", runtime: "ri" }, android: { group: "a1", runtime: "ra" } },
  });
  assert.match(
    promotionCandidate({ ios, android: { ...android, commit: "9999999aaa" } }).reason,
    /ios abc1234, android 9999999\); run Phone beta again/,
  );
  assert.match(
    promotionCandidate({ ios, android: { group: "", runtime: "", commit: "" } }).reason,
    /Nothing is published on beta for android/,
  );
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

/**
 * A stub CLI that answers like a project with one partial production rollout on each platform,
 * where each platform publishes its own groups.
 */
function stubEas(answers = {}) {
  const calls = [];
  const captured = new Set();
  const list = (platform) => ({
    currentPage: [
      {
        group: `${platform}-g2`,
        runtimeVersion: `${platform}-r1`,
        rolloutPercentage: 10,
        platforms: platform,
        message: "x",
      },
      {
        group: `${platform}-g1`,
        runtimeVersion: `${platform}-r1`,
        platforms: platform,
        message: "y",
      },
    ],
  });
  const answer = (argv) => {
    const id = argv[3];
    const value = (flag) => argv[argv.indexOf(flag) + 1];
    if (answers[id]) return answers[id](argv);
    if (id === "channel:list") return { currentPage: [{ name: "beta" }] };
    if (id === "update:list") return list(value("--platform"));
    if (id === "update:view") {
      return [
        {
          platform: argv[4].split("-")[0],
          gitCommitHash: "abc1234def",
          createdAt: "2026-10-01T00:00:00Z",
        },
      ];
    }
    if (id === "build:list") return [{ status: "FINISHED" }];
    return {};
  };
  const eas = createEas((argv, { capture }) => {
    calls.push(argv);
    if (capture) captured.add(argv[3]);
    return capture ? JSON.stringify(answer(argv)) : null;
  });
  return { calls, captured, eas };
}

const called = (calls, id) =>
  calls.filter((argv) => argv[3] === id).map((argv) => argv.slice(4).join(" "));

test("records the pinned CLI's commands", () => {
  assert.equal(manifest.version, EAS_CLI_VERSION);
  assert.equal(manifest.commands["update:view"].flags["non-interactive"], undefined);
});

test("sends only flags the pinned CLI accepts, for every call", () => {
  const { calls, eas } = stubEas();
  sampleCalls(eas);
  assert.equal(calls.length, 21);
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
  eas.groups("android", "beta");
  eas.view("g1");
  eas.builds("android", "beta", "r1");
  eas.createChannel("production");
  eas.build("android", "beta");
  eas.publish("android", "beta", "preview", "m");
  eas.republish("android", "g1", "production", "m", 10);
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
  const commands = createCommands(eas, ["ios", "android"]);
  assert.deepEqual(commands.latest("beta", "android"), {
    group: "android-g2",
    runtime: "android-r1",
    rollout: 10,
    commit: "abc1234def",
  });
  commands["finish-rollout"]("production", "24");
  commands.rollback("production", "all");
  assert.deepEqual(called(calls, "update:edit"), [
    "ios-g2 --rollout-percentage 100 --non-interactive",
    "android-g2 --rollout-percentage 100 --non-interactive",
  ]);
  assert.equal(called(calls, "update:revert-update-rollout").length, 2);
  for (const argv of calls) assertAccepted(argv);
});

test("touches only the released platforms", () => {
  const { calls, eas } = stubEas();
  createCommands(eas, ["ios"])["finish-rollout"]("production", "24");
  assert.deepEqual(called(calls, "update:edit"), [
    "ios-g2 --rollout-percentage 100 --non-interactive",
  ]);
});

test("rolls back a named group on its own platform only", () => {
  const { calls, eas } = stubEas();
  createCommands(eas, ["ios", "android"]).rollback("production", "all", "android-g1");
  assert.deepEqual(called(calls, "update:republish"), [
    "--group android-g1 --destination-branch production --platform android --message Roll back production --non-interactive",
  ]);
});

test("refuses a rollback with nothing published on any chosen platform", () => {
  const { eas } = stubEas({ "update:list": () => ({ currentPage: [] }) });
  assert.throws(
    () => createCommands(eas, ["ios", "android"]).rollback("beta", "android"),
    /nothing to roll back/,
  );
});

test("Promote republishes every platform or none", () => {
  const beta = (platform) => ({
    currentPage: [{ group: `${platform}-b`, runtimeVersion: "r", platforms: platform }],
  });
  const production = (running) => (platform) => ({
    currentPage:
      running === platform
        ? [
            {
              group: `${platform}-p`,
              platforms: platform,
              rolloutPercentage: 10,
              message: "Promote 9999999",
            },
          ]
        : [],
  });
  const groups = JSON.stringify({ ios: { group: "ios-b" }, android: { group: "android-b" } });
  const run = (running) => {
    const { calls, eas } = stubEas({
      "update:list": (argv) => {
        const platform = argv[argv.indexOf("--platform") + 1];
        return argv.includes("beta") ? beta(platform) : production(running)(platform);
      },
    });
    const commands = createCommands(eas, ["ios", "android"]);
    return { calls, promote: () => commands.promote("abc1234def", groups) };
  };
  const blocked = run("android");
  assert.throws(blocked.promote, /android: A production rollout is still running/);
  assert.deepEqual(called(blocked.calls, "update:republish"), []);
  const clear = run("");
  assert.deepEqual(clear.promote(), { promoted: true });
  assert.equal(called(clear.calls, "update:republish").length, 2);
});

test("builds only the platforms whose runtime has no live build", () => {
  const { calls, eas } = stubEas({
    "build:list": (argv) =>
      argv.includes("android") ? [{ status: "ERRORED" }] : [{ status: "FINISHED" }],
  });
  createCommands(eas, ["ios", "android"])["build-missing"](
    "production",
    JSON.stringify({ ios: { runtime: "ri" }, android: { runtime: "ra" } }),
  );
  assert.deepEqual(called(calls, "build"), [
    "--profile production --platform android --auto-submit --no-wait --non-interactive",
  ]);
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

test("every workflow installs the app's dependencies before it calls EAS", () => {
  const dir = new URL("../.github/workflows/", import.meta.url);
  for (const file of ["phone-beta", "phone-promote", "phone-rollback", "phone-rollout"]) {
    const jobs = readFileSync(new URL(`${file}.yml`, dir), "utf8")
      .split(/^jobs:$/m)[1]
      .split(/^ {2}\S/m);
    for (const job of jobs) {
      for (const call of job.matchAll(/phone-release\.mjs ([\w-]+)/g)) {
        if (call[1] === "ready") continue;
        const install = job.indexOf("pnpm install");
        assert.ok(
          install !== -1 && install < call.index,
          `${file}.yml runs phone-release.mjs ${call[1]} before pnpm install; eas-cli cannot load app.json's plugins without it.`,
        );
      }
    }
  }
});
