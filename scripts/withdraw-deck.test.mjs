import assert from "node:assert/strict";
import test from "node:test";
import { createClient, parseArgs, withdraw } from "./withdraw-deck.mjs";

function fakeApi(status = "published") {
  const calls = [];
  const call = async (method, path) => {
    calls.push(`${method} ${path}`);
    if (method === "GET") return { publication: { slug: "verbs-part-1", status } };
    const redirectTo = new URL(path, "http://x").searchParams.get("redirectTo");
    return { publication: { slug: "verbs-part-1", status: "withdrawn", redirectTo } };
  };
  return { call, calls };
}

test("reads the options", () => {
  assert.deepEqual(parseArgs(["deck-1", "--redirect-to", "estonian-top-100-verbs", "--apply"]), {
    deckId: "deck-1",
    redirectTo: "estonian-top-100-verbs",
    apply: true,
  });
  assert.throws(() => parseArgs(["deck-1", "--redirect-to", "Not A Slug"]), /needs a deck slug/);
  assert.throws(() => parseArgs([]), /Usage/);
});

test("only reads without --apply", async () => {
  const api = fakeApi();
  const said = await withdraw(api.call, { deckId: "deck-1", redirectTo: "merged" });
  assert.match(said, /Would withdraw verbs-part-1 \(published\) -> merged/);
  assert.deepEqual(api.calls, ["GET /api/decks/deck-1/publication"]);
});

test("withdraws with the redirect as a query parameter", async () => {
  const api = fakeApi();
  const said = await withdraw(api.call, { deckId: "deck-1", redirectTo: "merged", apply: true });
  assert.deepEqual(api.calls, [
    "GET /api/decks/deck-1/publication",
    "DELETE /api/decks/deck-1/publication?redirectTo=merged",
  ]);
  assert.equal(said, "Withdrew verbs-part-1; its page now redirects to merged.");
});

test("refuses a redirect to the deck itself before writing", async () => {
  const api = fakeApi();
  await assert.rejects(
    withdraw(api.call, { deckId: "deck-1", redirectTo: "verbs-part-1", apply: true }),
    /its own page/,
  );
  assert.equal(api.calls.length, 1);
});

test("passes the API's refusal of a target that is not live", async () => {
  const call = createClient({
    key: "k",
    origin: "http://localhost:5241",
    fetchImpl: async () =>
      new Response("Cannot redirect to merged: no published deck has that slug yet.", {
        status: 400,
      }),
  });
  await assert.rejects(call("DELETE", "/x"), /HTTP 400: Cannot redirect to merged/);
});
