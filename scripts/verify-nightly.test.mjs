import assert from "node:assert/strict";
import test from "node:test";
import { apply, featureIssue, plan, settle, setupFailure } from "./verify-nightly.mjs";

const context = {
  sha: "3665e2c4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  runUrl: "https://github.com/o/r/actions/runs/9",
  artifactUrl: "https://github.com/o/r/actions/runs/9/artifacts/3",
  artifactName: "verify-nightly-evidence-3665e2c4",
};
const passing = { feature: "review", title: "Review", ok: true, steps: [], problems: [] };
const failing = (action = "Reveal the card") => ({
  feature: "reveal-hint",
  title: "Reveal hint",
  ok: false,
  retried: true,
  evidence: "retry/main/reveal-hint-local-3665e2c4",
  steps: [
    { action: "Open the review", ok: true },
    { action, ok: false, error: "expect(locator).toBeVisible() failed" },
  ],
  problems: [],
});
const issueFor = (f, number) => ({ number, body: featureIssue(f, context).body });

test("a first failure opens an issue naming the feature, the step, the commit and the evidence", () => {
  const [action] = plan({ open: [], results: [passing, failing()], context });
  assert.equal(action.kind, "open");
  assert.equal(action.title, "Nightly verify: Reveal hint fails on main");
  assert.match(action.body, /`reveal-hint` verify recipe fails on `main` at `3665e2c4`/);
  assert.match(action.body, /\*\*Step 2:\*\* Reveal the card/);
  assert.match(action.body, /toBeVisible\(\) failed/);
  assert.match(
    action.body,
    /\[verify-nightly-evidence-3665e2c4\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/9\/artifacts\/3\)/,
  );
  assert.match(action.body, /retry\/main\/reveal-hint-local-3665e2c4/);
});

test("a later failure edits the same issue, and comments only when the failing step changed", () => {
  const open = [issueFor(failing(), 41)];
  const [same] = plan({ open, results: [failing()], context });
  assert.equal(same.kind, "edit");
  assert.equal(same.number, 41);
  assert.equal(same.comment, null);
  const [moved] = plan({ open, results: [failing("Grade it Good")], context });
  assert.match(moved.comment, /Now fails at step 2 Grade it Good/);
});

test("a feature that passes again closes its issue with a comment", () => {
  const actions = plan({
    open: [issueFor(failing(), 41)],
    results: [{ ...passing, feature: "reveal-hint" }],
    context,
  });
  assert.deepEqual(
    actions.map((a) => [a.kind, a.number]),
    [["close", 41]],
  );
  assert.match(actions[0].comment, /passes again on `main` at `3665e2c4`/);
});

test("a passing feature with no issue and a feature that did not run change nothing", () => {
  assert.deepEqual(plan({ open: [issueFor(failing(), 41)], results: [passing], context }), []);
});

test("a night that cannot start reports it in one issue and leaves feature issues alone", () => {
  const failure = setupFailure([
    ["Install dependencies", "success"],
    ["Start the product", "failure"],
  ]);
  assert.deepEqual(failure, { step: "Start the product", outcome: "failure" });
  const first = plan({ open: [issueFor(failing(), 41)], results: [], failure, context });
  assert.deepEqual(
    first.map((a) => a.kind),
    ["open"],
  );
  assert.equal(first[0].title, "Nightly verify could not start");
  const again = plan({
    open: [{ number: 50, body: first[0].body }],
    results: [],
    failure,
    context,
  });
  assert.deepEqual(
    again.map((a) => [a.kind, a.number]),
    [["edit", 50]],
  );
  const started = plan({
    open: [{ number: 50, body: first[0].body }],
    results: [passing],
    context,
  });
  assert.deepEqual(
    started.map((a) => [a.kind, a.number]),
    [["close", 50]],
  );
});

test("every feature failing to set up is a night that could not start", () => {
  const setUp = (feature) => ({
    feature,
    title: feature,
    ok: false,
    steps: [
      { action: "set up", ok: false, error: "the doctor found this instance not worth driving" },
    ],
    problems: [],
  });
  const ran = [["Start the product", "success"]];
  assert.match(setupFailure(ran, [setUp("review"), setUp("add-card")]).outcome, /all 2 features/);
  assert.equal(setupFailure(ran, [setUp("review"), failing()]), null);
});

test("applying opens with the label, edits in place and closes after commenting", async () => {
  const calls = [];
  const api = async (path, init = {}) => {
    calls.push([init.method ?? "GET", path, init.body && JSON.parse(init.body)]);
    return { number: 7 };
  };
  await apply(
    "o/r",
    [
      { kind: "open", title: "t", body: "b" },
      { kind: "edit", number: 41, title: "t", body: "b", comment: null },
      { kind: "close", number: 50, comment: "c" },
    ],
    api,
  );
  assert.deepEqual(calls, [
    ["POST", "/repos/o/r/issues", { title: "t", body: "b", labels: ["verify: nightly"] }],
    ["PATCH", "/repos/o/r/issues/41", { title: "t", body: "b" }],
    ["POST", "/repos/o/r/issues/50/comments", { body: "c" }],
    ["PATCH", "/repos/o/r/issues/50", { state: "closed", state_reason: "completed" }],
  ]);
});

test("a feature that fails once is judged by its retry", () => {
  const first = { review: passing, "reveal-hint": failing() };
  const second = { "reveal-hint": { ...failing(), ok: true } };
  const [review, hint] = settle(["review", "reveal-hint"], first, second);
  assert.equal(review, passing);
  assert.deepEqual([hint.ok, hint.retried], [true, true]);
});
