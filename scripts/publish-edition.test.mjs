import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createClient,
  PART_CARDS,
  parseArgs,
  partsOf,
  publish,
  upload,
  validateEdition,
} from "./publish-edition.mjs";

const cards = (count) =>
  Array.from({ length: count }, (_, i) => ({
    cardId: `c${i}`,
    provenance: "imported",
    meaning: `m${i}`,
  }));
const edition = (count) =>
  validateEdition({
    deck: { provenance: "imported", name: "Deck", summary: "Summary" },
    sections: [{ sectionId: "s1", provenance: "imported", name: "One" }],
    cards: cards(count),
  });
const target = { deckId: "deck-1", language: "uk" };

/** A stand-in for the API that records each call and answers from `answer`, or a ready edition. */
function fakeApi(answer = () => undefined, status = "draft") {
  const calls = [];
  const call = async (method, path, body) => {
    calls.push({ method, path, body });
    const given = await answer({ method, path, body, calls });
    if (given !== undefined) return given;
    if (method === "GET") return { editions: [{ language: "uk", status }] };
    if (path.endsWith("/publication")) return { status: "published", ready: 5, total: 5 };
    return { status: "draft", blockers: [], missing: 0, ready: 5, total: 5 };
  };
  return { call, calls };
}

test("keeps the part size at the API's per-call cap", () => {
  const types = readFileSync(new URL("../packages/core/src/types.ts", import.meta.url), "utf8");
  assert.match(types, new RegExp(`EDITION_IMPORT_CARDS = ${PART_CARDS};`));
});

test("splits 1,001 cards into parts of at most the cap, with the deck and sections on the first", () => {
  const parts = partsOf(edition(1001));
  assert.deepEqual(
    parts.map((part) => part.cards.length),
    [500, 500, 1],
  );
  assert.equal(parts[0].deck.name, "Deck");
  assert.equal(parts[0].sections.length, 1);
  assert.equal(parts[1].deck, undefined);
  assert.deepEqual(parts[1].sections, []);
  assert.equal(new Set(parts.flatMap((part) => part.cards.map((card) => card.cardId))).size, 1001);
});

test("refuses an edition the API would refuse, before sending anything", () => {
  assert.throws(() => validateEdition({ cards: [] }), /no cards/);
  assert.throws(() => validateEdition({ cards: [...cards(2), ...cards(1)] }), /each card once/);
  assert.throws(() => validateEdition({ cards: cards(1), slug: "x" }), /Unsupported field slug/);
});

test("needs --apply to write and none to plan", () => {
  assert.throws(() => parseArgs(["upload", "d", "uk", "e.json"]), /needs --apply/);
  assert.throws(() => parseArgs(["plan", "d", "uk", "e.json", "--apply"]), /reads only/);
  assert.equal(parseArgs(["publish", "d", "uk", "e.json", "--apply"]).command, "publish");
});

test("publishes only after every part lands", async () => {
  const api = fakeApi();
  await publish(api.call, target, edition(1001));
  assert.deepEqual(
    api.calls.map(({ method, path }) => `${method} ${path}`),
    [
      "GET /api/decks/deck-1/editions",
      "PUT /api/decks/deck-1/editions/uk",
      "PUT /api/decks/deck-1/editions/uk",
      "PUT /api/decks/deck-1/editions/uk",
      "POST /api/decks/deck-1/editions/uk/approval",
      "PUT /api/decks/deck-1/editions/uk/publication",
    ],
  );
});

test("stops at a failed part, names it, and never signs off or publishes", async () => {
  let puts = 0;
  const api = fakeApi(({ method }) => {
    if (method === "PUT" && ++puts === 2) throw new Error("HTTP 400: card-9 is not an active card");
  });
  await assert.rejects(
    publish(api.call, target, edition(1001)),
    /Part 2 of 3 failed; nothing was published/,
  );
  assert.equal(api.calls.filter(({ method }) => method === "PUT").length, 2);
  assert.ok(
    !api.calls.some(({ path }) => path.endsWith("/approval") || path.endsWith("/publication")),
  );
});

test("refuses to write over a live edition", async () => {
  const api = fakeApi(undefined, "published");
  await assert.rejects(upload(api.call, target, edition(3)), /edition is live/);
  assert.equal(api.calls.length, 1);
});

test("does not publish when signing off leaves blockers", async () => {
  const api = fakeApi(({ path }) =>
    path.endsWith("/approval")
      ? { blockers: ["1 card changed after being signed off."] }
      : undefined,
  );
  await assert.rejects(publish(api.call, target, edition(3)), /not ready: 1 card changed/);
  assert.ok(!api.calls.some(({ path }) => path.endsWith("/publication")));
});

test("retries a busy or failed answer, and not a refusal", async () => {
  const answers = [503, 200];
  const seen = [];
  const fetchImpl = async (_url, init) => {
    seen.push(init.method);
    const status = answers.shift() ?? 400;
    return new Response(JSON.stringify({ ok: status === 200 }), { status });
  };
  const call = createClient({
    key: "k",
    origin: "http://localhost:5241",
    fetchImpl,
    wait: async () => {},
  });
  assert.deepEqual(await call("PUT", "/api/decks/d/editions/uk", {}), { ok: true });
  assert.equal(seen.length, 2);

  const refused = createClient({
    key: "k",
    origin: "http://localhost:5241",
    fetchImpl: async () => new Response("not an active card", { status: 400 }),
    wait: async () => {},
  });
  await assert.rejects(refused("PUT", "/x", {}), /HTTP 400: not an active card/);
});

test("only talks to the product or a loopback address", () => {
  assert.throws(() => createClient({ key: "k", origin: "https://example.com" }), /API origin/);
  assert.throws(() => createClient({ key: "" }), /LYMI_API_KEY/);
});
