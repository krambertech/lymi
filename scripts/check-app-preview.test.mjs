import assert from "node:assert/strict";
import test from "node:test";
import { checkAppPreview } from "./check-app-preview.mjs";

const entryUrl = "https://preview-lymi-app-pr-105.example.workers.dev/_preview?key=capability";

function previewFetch(calls, entryResponses = []) {
  return async (url, init) => {
    const value = String(url);
    calls.push([value, init.headers?.cookie ?? ""]);
    if (value.includes("/_preview?key=")) {
      const next = entryResponses.shift();
      if (next instanceof Error) throw next;
      if (next) return next;
      return new Response(null, {
        status: 303,
        headers: {
          location: "/api/dev/sign-in?as=learner",
          "set-cookie": "__Host-lymi-preview=access; Path=/; HttpOnly",
        },
      });
    }
    if (value.includes("/api/dev/sign-in")) {
      return new Response(null, {
        status: 303,
        headers: { location: "/today", "set-cookie": "lymi.session_token=session; Path=/" },
      });
    }
    if (value.endsWith("/api/me")) {
      return Response.json({ email: "learner@lymi.local" });
    }
    if (value.endsWith("/api/decks")) return Response.json([{ id: "deck" }]);
    throw new Error(`Unexpected ${value}`);
  };
}

const entryRequests = (calls) => calls.filter(([url]) => url.includes("/_preview?key=")).length;

test("verifies capability entry, persona sign-in, and seeded data", async () => {
  const calls = [];
  const result = await checkAppPreview(entryUrl, { fetchImpl: previewFetch(calls) });
  assert.equal(result.decks, 1);
  assert.equal(result.destination, "/today");
  assert.match(calls[1][1], /__Host-lymi-preview=access/);
  assert.match(calls[2][1], /lymi\.session_token=session/);
});

test("waits for a new preview Worker that answers 404 or drops the connection", async () => {
  const calls = [];
  const retries = [];
  const fetchImpl = previewFetch(calls, [
    new Response("Not found", { status: 404 }),
    new TypeError("fetch failed"),
  ]);

  const result = await checkAppPreview(entryUrl, {
    attempts: 3,
    retryDelayMs: 0,
    fetchImpl,
    onRetry: (reason, attempt) => retries.push([reason, attempt]),
  });

  assert.equal(result.decks, 1);
  assert.equal(entryRequests(calls), 3);
  assert.deepEqual(retries, [
    ["HTTP 404", 1],
    ["fetch failed", 2],
  ]);
});

test("fails after the bounded attempts when preview mode never becomes live", async () => {
  const calls = [];
  const fetchImpl = previewFetch(
    calls,
    Array.from({ length: 3 }, () => new Response("Not found", { status: 404 })),
  );

  await assert.rejects(
    () => checkAppPreview(entryUrl, { attempts: 3, retryDelayMs: 0, fetchImpl }),
    /GET \/_preview was not live after 3 attempt\(s\); last response: HTTP 404/,
  );
  assert.equal(entryRequests(calls), 3);
});

test("fails at once on a wrong capability key", async () => {
  const calls = [];
  const fetchImpl = previewFetch(calls, [new Response("not valid", { status: 403 })]);

  await assert.rejects(
    () => checkAppPreview(entryUrl, { attempts: 10, retryDelayMs: 60_000, fetchImpl }),
    /preview entry returned HTTP 403/,
  );
  assert.equal(entryRequests(calls), 1);
});

test("fails at once on a malformed session payload", async () => {
  const calls = [];
  const inner = previewFetch(calls);
  const fetchImpl = async (url, init) =>
    String(url).endsWith("/api/me") ? new Response("<html>", { status: 200 }) : inner(url, init);

  await assert.rejects(() =>
    checkAppPreview(entryUrl, { attempts: 10, retryDelayMs: 60_000, fetchImpl }),
  );
  assert.equal(entryRequests(calls), 1);
});

test("rejects a raw preview URL without its protected entry path", async () => {
  await assert.rejects(
    () => checkAppPreview("https://preview-lymi-app-pr-105.example.workers.dev"),
    /protected app preview entry link/,
  );
});
