import assert from "node:assert/strict";
import test from "node:test";
import { validateHealth } from "./check-deployment.mjs";

test("accepts a healthy, identifiable deployment", () => {
  const payload = {
    ok: true,
    name: "lymi",
    time: "2026-09-06T12:00:00.000Z",
    version: {
      id: "0199f00d-0000-7000-8000-000000000000",
      tag: "abc123",
      deployedAt: "2026-09-06T11:59:00.000Z",
    },
  };

  assert.equal(validateHealth(payload), payload);
});

test("rejects an old or unrelated health response", () => {
  assert.throws(
    () => validateHealth({ ok: true, name: "lymi" }),
    /did not report deployment version metadata/,
  );
  assert.throws(
    () => validateHealth({ ok: true, name: "another-app" }),
    /did not identify a healthy Lymi deployment/,
  );
});
