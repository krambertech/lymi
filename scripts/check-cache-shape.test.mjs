import assert from "node:assert/strict";
import test from "node:test";
import {
  cacheShapeOf,
  newestContract,
  responseFingerprint,
  verdict,
} from "./check-cache-shape.mjs";

const contract = (deckFields) => ({
  paths: {
    "/api/decks": {
      get: {
        responses: {
          200: {
            content: { "application/json": { schema: { $ref: "#/components/schemas/Deck" } } },
          },
          401: {
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Deck: { type: "object", properties: deckFields },
      Error: { type: "object", properties: { error: { type: "string" } } },
      DeckInput: { type: "object", properties: { name: { type: "string" } } },
    },
  },
});

test("a field added to a response changes the fingerprint", () => {
  const before = responseFingerprint(contract({ name: { type: "string" } }));
  const after = responseFingerprint(
    contract({ name: { type: "string" }, purpose: { type: "string" } }),
  );
  assert.notEqual(before, after);
});

test("error responses and schemas no response reaches leave it alone", () => {
  const base = contract({ name: { type: "string" } });
  const changed = structuredClone(base);
  changed.components.schemas.Error.properties.code = { type: "string" };
  changed.components.schemas.DeckInput.properties.purpose = { type: "string" };
  assert.equal(responseFingerprint(base), responseFingerprint(changed));
});

test("key order does not matter", () => {
  assert.equal(
    responseFingerprint(contract({ a: { type: "string" }, b: { type: "number" } })),
    responseFingerprint(contract({ b: { type: "number" }, a: { type: "string" } })),
  );
});

test("changed responses fail until CACHE_SHAPE is bumped or the decision recorded", () => {
  const lock = { cacheShape: "1", responses: "aaa" };
  assert.match(verdict(lock, { cacheShape: "1", responses: "bbb" }), /bump CACHE_SHAPE/);
  assert.match(verdict(lock, { cacheShape: "2", responses: "bbb" }), /--write/);
  assert.match(verdict(lock, { cacheShape: "2", responses: "aaa" }), /--write/);
  assert.equal(verdict(lock, { cacheShape: "1", responses: "aaa" }), null);
});

test("reads CACHE_SHAPE and picks the newest release", () => {
  assert.equal(cacheShapeOf('const CACHE_SHAPE = "3";'), "3");
  assert.equal(newestContract(["0.0.9.json", "0.0.10.json", "notes.md"]), "0.0.10");
});
