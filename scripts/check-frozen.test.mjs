import assert from "node:assert/strict";
import test from "node:test";
import { changedContracts, changedQueuedBodies, minimumVersion } from "./check-frozen.mjs";

const contract = { paths: { "/api/decks": {} } };

test("a frozen contract stays while its release is served", () => {
  const base = { "0.0.10": contract };
  const minimum = "0.0.10";
  assert.deepEqual(changedContracts({ base, current: { "0.0.10": contract }, minimum }), []);
  assert.match(
    changedContracts({ base, current: { "1.0.0": contract }, minimum })[0],
    /0\.0\.10\.json was deleted or renamed/,
  );
  assert.match(
    changedContracts({ base, current: { "0.0.10": { paths: {} } }, minimum })[0],
    /0\.0\.10\.json was changed/,
  );
});

test("a frozen contract may go once the minimum passes its release", () => {
  const base = { "0.0.10": contract };
  assert.deepEqual(changedContracts({ base, current: {}, minimum: "0.0.11" }), []);
  assert.deepEqual(changedContracts({ base, current: {}, minimum: "1.0.0" }), []);
  assert.equal(changedContracts({ base, current: {}, minimum: "0.0.9" }).length, 1);
});

test("a queued body is never removed, renamed or edited", () => {
  const base = { "an aided grade": { stored: { aid: "hook" } } };
  assert.deepEqual(changedQueuedBodies({ base, current: { ...base, more: {} } }), []);
  assert.match(changedQueuedBodies({ base, current: {} })[0], /"an aided grade" was removed/);
  assert.match(
    changedQueuedBodies({ base, current: { "an aided grade": { stored: { aid: "hint" } } } })[0],
    /"an aided grade" was changed/,
  );
});

test("reads the minimum version out of wrangler.jsonc", () => {
  assert.equal(minimumVersion('"PHONE_MINIMUM_VERSION_IOS": "0.0.10",'), "0.0.10");
  assert.throws(() => minimumVersion("{}"), /PHONE_MINIMUM_VERSION_IOS/);
});
