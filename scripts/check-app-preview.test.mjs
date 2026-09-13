import assert from "node:assert/strict";
import test from "node:test";
import { checkAppPreview } from "./check-app-preview.mjs";

test("verifies capability entry, persona sign-in, and seeded data", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const value = String(url);
    calls.push([value, init.headers?.cookie ?? ""]);
    if (value.includes("/_preview?key=")) {
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

  const result = await checkAppPreview(
    "https://preview-lymi-app-pr-105.example.workers.dev/_preview?key=capability",
    fetchImpl,
  );
  assert.equal(result.decks, 1);
  assert.equal(result.destination, "/today");
  assert.match(calls[1][1], /__Host-lymi-preview=access/);
  assert.match(calls[2][1], /lymi\.session_token=session/);
});

test("rejects a raw preview URL without its protected entry path", async () => {
  await assert.rejects(
    () => checkAppPreview("https://preview-lymi-app-pr-105.example.workers.dev"),
    /protected app preview entry link/,
  );
});
