import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { commitTag, gitContains, shouldDeploy } from "./deploy-newest.mjs";

const never = () => assert.fail("no comparison expected");

test("deploys when nothing is live, the tag is missing or it is this commit", () => {
  assert.deepEqual(shouldDeploy({ ours: "b", live: null, contains: never }), { deploy: true });
  assert.deepEqual(shouldDeploy({ ours: undefined, live: "a", contains: never }), { deploy: true });
  assert.deepEqual(shouldDeploy({ ours: "b", live: "b", contains: never }), { deploy: true });
});

test("deploys over an older live commit", () => {
  assert.deepEqual(shouldDeploy({ ours: "b", live: "a", contains: () => false }), { deploy: true });
});

test("skips when the live commit already contains this one", () => {
  const decision = shouldDeploy({ ours: "a", live: "b", contains: () => true });
  assert.equal(decision.deploy, false);
  assert.match(decision.reason, /production serves b, which already contains a/);
});

test("deploys and says so when git cannot compare", () => {
  const decision = shouldDeploy({ ours: "a", live: "b", contains: () => null });
  assert.equal(decision.deploy, true);
  assert.match(decision.reason, /could not compare/);
});

test("reads ancestry from this repository's history", () => {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const parent = execFileSync("git", ["rev-parse", "HEAD~1"], { encoding: "utf8" }).trim();
  assert.equal(gitContains(head, parent), true);
  assert.equal(gitContains(parent, head), false);
});

test("fetches a live commit the clone lacks, and gives up when it cannot", () => {
  const calls = [];
  const git = (args) => {
    calls.push(args[0]);
    return args[0] === "merge-base" ? 0 : args[0] === "fetch" ? 0 : 1;
  };
  assert.equal(gitContains("live", "ours", git), true);
  assert.deepEqual(calls, ["cat-file", "fetch", "merge-base"]);
  assert.equal(
    gitContains("live", "ours", () => 1),
    null,
  );
});

test("takes only a full commit SHA from the live version", () => {
  const sha = "09a48f2148ddb926b19df6ee1c06cc2fd80ed509";
  assert.equal(commitTag({ version: { tag: sha } }), sha);
  assert.equal(commitTag({ version: { tag: "--upload-pack=touch /tmp/x" } }), null);
  assert.equal(commitTag({ version: { tag: "09a48f2" } }), null);
  assert.equal(commitTag({ version: {} }), null);
  assert.equal(commitTag(null), null);
});
