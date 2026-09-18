import assert from "node:assert/strict";
import test from "node:test";
import { shardOutcome } from "./e2e-shard-outcome.mjs";

const passingReport = {
  stats: { expected: 21, unexpected: 0, flaky: 1, skipped: 2 },
  suites: [
    {
      title: "review-draw.spec.ts",
      specs: [
        { title: "a learner can grade a due card", ok: true, file: "review-draw.spec.ts", line: 9 },
      ],
    },
  ],
};

test("a passing shard reports its counts", () => {
  const record = shardOutcome({
    shard: "2",
    shards: "3",
    outcome: "success",
    setupOutcome: "success",
    report: passingReport,
  });

  assert.equal(record.shard, 2);
  assert.equal(record.shards, 3);
  assert.equal(record.outcome, "success");
  assert.equal(record.reported, true);
  assert.deepEqual(
    { passed: record.passed, failed: record.failed, flaky: record.flaky, skipped: record.skipped },
    { passed: 21, failed: 0, flaky: 1, skipped: 2 },
  );
  assert.deepEqual(record.failures, []);
});

test("a failing shard names the tests that failed, nested suites included", () => {
  const record = shardOutcome({
    shard: 1,
    shards: 3,
    outcome: "failure",
    report: {
      stats: { expected: 18, unexpected: 2, flaky: 0, skipped: 0 },
      suites: [
        {
          title: "deck-creation.spec.ts",
          specs: [
            {
              title: "a learner can add a card",
              ok: false,
              file: "deck-creation.spec.ts",
              line: 42,
            },
          ],
          suites: [
            {
              title: "on a phone",
              specs: [
                {
                  title: "a learner can target a deck",
                  ok: false,
                  file: "deck-creation.spec.ts",
                  line: 88,
                },
              ],
            },
          ],
        },
      ],
    },
  });

  assert.equal(record.outcome, "failure");
  assert.deepEqual(record.failures, [
    "deck-creation.spec.ts:42 — a learner can add a card",
    "deck-creation.spec.ts:88 — a learner can target a deck",
  ]);
  assert.equal(record.truncatedFailures, 0);
});

test("a shard whose setup broke is a failure rather than a skip", () => {
  const record = shardOutcome({
    shard: 3,
    shards: 3,
    outcome: "skipped",
    setupOutcome: "failure",
  });

  assert.equal(record.outcome, "failure");
  assert.equal(record.reported, false);
  assert.equal(record.passed, 0);
});

test("a long list of failures is truncated with a count of the rest", () => {
  const specs = Array.from({ length: 25 }, (_, index) => ({
    title: `a learner can do thing ${index}`,
    ok: false,
    file: "long.spec.ts",
    line: index,
  }));

  const record = shardOutcome({
    shard: 1,
    shards: 3,
    outcome: "failure",
    report: { stats: { expected: 0, unexpected: 25, flaky: 0, skipped: 0 }, suites: [{ specs }] },
  });

  assert.equal(record.failures.length, 20);
  assert.equal(record.truncatedFailures, 5);
});
