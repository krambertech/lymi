import assert from "node:assert/strict";
import test from "node:test";
import { findPreviewUrl } from "./preview-url.mjs";

const upload = {
  type: "version-upload",
  version: 1,
  worker_name: "lymi-site",
  version_id: "version-id",
  preview_url: "https://version-lymi-site.example.workers.dev",
  preview_alias_url: "https://pr-73-lymi-site.example.workers.dev/",
};

test("returns the stable alias rather than the version-specific preview", () => {
  const output = `${JSON.stringify({ type: "wrangler-session" })}\n${JSON.stringify(upload)}\n`;

  assert.equal(
    findPreviewUrl(output, { workerName: "lymi-site", alias: "pr-73" }),
    "https://pr-73-lymi-site.example.workers.dev",
  );
});

test("uses the latest matching upload from a structured output file", () => {
  const latest = {
    ...upload,
    preview_alias_url: "https://pr-74-lymi-site.example.workers.dev",
  };
  const output = `${JSON.stringify(upload)}\n${JSON.stringify(latest)}\n`;

  assert.equal(
    findPreviewUrl(output, { workerName: "lymi-site", alias: "pr-74" }),
    latest.preview_alias_url,
  );
});

test("fails when Wrangler omits or returns the wrong alias", () => {
  assert.throws(
    () =>
      findPreviewUrl(JSON.stringify({ ...upload, preview_alias_url: null }), {
        workerName: "lymi-site",
        alias: "pr-73",
      }),
    /without the requested stable preview alias/,
  );
  assert.throws(
    () => findPreviewUrl(JSON.stringify(upload), { workerName: "lymi-site", alias: "pr-72" }),
    /unexpected preview alias URL/,
  );
});

test("fails clearly when the structured output is malformed", () => {
  assert.throws(
    () => findPreviewUrl("not-json", { workerName: "lymi-site", alias: "pr-73" }),
    /line 1 is not valid JSON/,
  );
});
