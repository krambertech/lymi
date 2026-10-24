import assert from "node:assert/strict";
import test from "node:test";
import {
  commentPhase,
  failingStep,
  marker,
  overall,
  previewEntry,
  render,
  upsertComment,
} from "./verify-ci.mjs";

const sha = "f82f0b4afbab1da4b42b3dd1bd2a4f8ff300d6a9";
const passed = (title, extra = {}) => ({
  feature: title.toLowerCase(),
  title,
  ok: true,
  steps: [{ action: "Open Today", ok: true }],
  problems: [],
  ...extra,
});
const failed = (title) => ({
  feature: title.toLowerCase(),
  title,
  ok: false,
  steps: [
    { action: "Open Today", ok: true },
    { action: "Reveal the card", ok: false, error: "expect(locator).toBeVisible() failed" },
  ],
  problems: [],
});
const verdict = (features) => ({
  verdict: overall(features),
  sha,
  version: "6e33fb6e-6a9d-4fa9-bd4e-ecb824a6e9b8",
  reason: "These are the features the changed paths reach.",
  features,
  evidenceClean: true,
});

test("a failing step fails the verdict, and console errors or a retry only add notes", () => {
  assert.equal(overall([passed("Review"), passed("Add")]), "PASS");
  assert.equal(overall([passed("Review", { problems: ["console: boom"] })]), "PASS+NOTES");
  assert.equal(overall([passed("Review", { retried: true })]), "PASS+NOTES");
  assert.equal(overall([passed("Review"), failed("Add")]), "FAIL");
});

test("the failing step is numbered from one", () => {
  assert.deepEqual(failingStep(failed("Review")), {
    number: 2,
    action: "Reveal the card",
    ok: false,
    error: "expect(locator).toBeVisible() failed",
  });
  assert.equal(failingStep(passed("Review")), null);
});

test("a final comment names the verdict, the head commit, the features, the failing step and the evidence", () => {
  const body = render({
    phase: "final",
    verdict: verdict([passed("Review"), failed("Reveal hint")]),
    artifactUrl: "https://github.com/o/r/actions/runs/1/artifacts/2",
    runUrl: "https://github.com/o/r/actions/runs/1",
  });
  assert.ok(body.startsWith(marker));
  assert.match(body, /## Verify: FAIL at `f82f0b4a`/);
  assert.match(body, /\| Review \| PASS \|/);
  assert.match(body, /\| Reveal hint \| \*\*FAIL\*\* at step 2 \|/);
  assert.match(body, /\*\*Reveal hint\*\* failed at step 2, Reveal the card:/);
  assert.match(body, /toBeVisible\(\) failed/);
  assert.match(body, /\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/1\/artifacts\/2\)/);
});

test("a pass with notes lists what was worth a look", () => {
  const body = render({
    phase: "final",
    verdict: verdict([
      passed("Review", { problems: ["HTTP 503 https://x.workers.dev/api/x"] }),
      passed("Add", { retried: true, firstAttempt: failed("Add") }),
    ]),
  });
  assert.match(body, /## Verify: PASS\+NOTES/);
  assert.match(body, /Add failed its first attempt at step 2 and passed on retry/);
  assert.match(body, /Review: `HTTP 503/);
});

test("withheld evidence says so instead of linking it", () => {
  const body = render({
    phase: "final",
    verdict: { ...verdict([passed("Review")]), evidenceClean: false },
    artifactUrl: "https://example.com/artifact",
  });
  assert.match(body, /evidence was withheld/);
  assert.doesNotMatch(body, /example\.com/);
});

test("the running comment warns anyone about to try the preview by hand", () => {
  const body = render({ phase: "running", features: ["review", "add-card"], sha });
  assert.match(body, /## Verify: running at `f82f0b4a`/);
  assert.match(body, /Driving review, add-card/);
  assert.match(body, /wait for the verdict here before trying the preview by hand/);
});

test("the comment phase follows the plan and how the preview and verify jobs ended", () => {
  const features = ["review"];
  assert.equal(commentPhase({ features: [] }).phase, "skipped");
  assert.match(commentPhase({ features, draft: true }).reason, /draft/);
  assert.deepEqual(commentPhase({ features, previewResult: "failure" }), {
    phase: "undriven",
    reason: "the app preview job ended as failure.",
  });
  assert.equal(
    commentPhase({ features, previewResult: "success", hasVerdict: true }).phase,
    "final",
  );
  assert.match(
    commentPhase({ features, previewResult: "success", verifyResult: "failure" }).reason,
    /before writing a verdict/,
  );
});

function fakeApi(comments) {
  const calls = [];
  const api = async (path, init = {}) => {
    calls.push({ path, method: init.method ?? "GET", body: init.body && JSON.parse(init.body) });
    if (init.method === "POST") return { id: 99 };
    if (init.method === "PATCH") return {};
    return comments;
  };
  return { api, calls };
}

test("a later push edits the one verify comment instead of adding another", async () => {
  const { api, calls } = fakeApi([
    { id: 1, user: { type: "User" }, body: `${marker} quoted by a person` },
    { id: 2, user: { type: "Bot" }, body: `${marker}\n## Verify: FAIL` },
  ]);
  const result = await upsertComment({ repo: "o/r", pr: "5", body: `${marker}\nnew`, api });
  assert.deepEqual(result, { action: "edited", id: 2 });
  assert.deepEqual(calls.at(-1), {
    path: "/repos/o/r/issues/comments/2",
    method: "PATCH",
    body: { body: `${marker}\nnew` },
  });
});

test("the first verdict creates the comment, and a skip never does", async () => {
  const first = fakeApi([]);
  assert.equal(
    (await upsertComment({ repo: "o/r", pr: "5", body: "b", api: first.api })).action,
    "created",
  );
  const skip = fakeApi([]);
  assert.equal(
    (await upsertComment({ repo: "o/r", pr: "5", body: "b", create: false, api: skip.api })).action,
    "none",
  );
  assert.ok(skip.calls.every((call) => call.method === "GET"));
});

test("the preview link comes from the newest successful app-preview deployment of the commit", async () => {
  const api = async (path) => {
    if (path.includes("/deployments?")) return [{ id: 7 }, { id: 6 }];
    if (path.includes("/deployments/7/")) return [{ state: "in_progress", environment_url: "" }];
    return [{ state: "success", environment_url: "https://p.workers.dev/_preview?key=abc" }];
  };
  const entry = await previewEntry({ repo: "o/r", sha, api, attempts: 1 });
  assert.equal(entry.origin, "https://p.workers.dev");
  assert.equal(entry.searchParams.get("key"), "abc");
  await assert.rejects(
    previewEntry({ repo: "o/r", sha, api: async () => [], attempts: 1 }),
    /no successful app-preview deployment/,
  );
});
