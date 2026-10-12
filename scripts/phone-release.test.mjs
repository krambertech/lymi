import assert from "node:assert/strict";
import test from "node:test";
import { hasLiveBuild, iosGroups, readiness, rollbackPlan, rolloutDue } from "./phone-release.mjs";

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
