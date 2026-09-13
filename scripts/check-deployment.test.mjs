import assert from "node:assert/strict";
import test from "node:test";
import { checkDeployment, validateHealth } from "./check-deployment.mjs";

test("accepts a healthy, identifiable deployment", () => {
  const payload = {
    ok: true,
    name: "lymi-product",
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
    () => validateHealth({ ok: true, name: "lymi-product" }),
    /did not report deployment version metadata/,
  );
  assert.throws(
    () => validateHealth({ ok: true, name: "another-app" }),
    /did not identify a healthy Lymi deployment/,
  );
});

test("accepts the independently identifiable public-site deployment", () => {
  const payload = {
    ok: true,
    name: "lymi-site",
    version: { id: "site-version", deployedAt: "2026-09-06T11:59:00.000Z" },
  };
  assert.equal(validateHealth(payload, "lymi-site"), payload);
});

test("can require the health endpoint to identify the expected Worker version", () => {
  const payload = {
    ok: true,
    name: "lymi-site",
    version: { id: "site-version", tag: "abc123", deployedAt: "2026-09-13T12:00:00.000Z" },
  };

  assert.equal(validateHealth(payload, "lymi-site", "site-version"), payload);
  assert.throws(
    () => validateHealth(payload, "lymi-site", "newer-version"),
    /did not report the expected Worker version/,
  );
});

test("waits for a preview alias to reach the uploaded Worker version", async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return Response.json({
      ok: true,
      name: "lymi-site",
      version: {
        id: requests === 1 ? "previous-version" : "uploaded-version",
        deployedAt: "2026-09-13T12:00:00.000Z",
      },
    });
  };

  const payload = await checkDeployment(
    "https://preview.example/api/health",
    "lymi-site",
    "uploaded-version",
    {
      attempts: 2,
      retryDelayMs: 0,
      fetchImpl,
    },
  );

  assert.equal(requests, 2);
  assert.equal(payload.version.id, "uploaded-version");
});
