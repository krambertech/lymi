import assert from "node:assert/strict";
import test from "node:test";
import { unboundedParts } from "./request-bounds.mjs";

const text = { type: "string" };
const id = { type: "string", minLength: 1, maxLength: 200 };
const object = (properties, rest) => ({ type: "object", properties, ...rest });
const at = (problems) => problems.map((problem) => problem.split(" accepts ")[0]);

test("the schemas that reached review without a maximum are refused", () => {
  const drawnCards816 = object({
    cards: { type: "array", maxItems: 10_000, items: { type: "string", minLength: 1 } },
  });
  assert.deepEqual(at(unboundedParts(drawnCards816)), ["cards[]"]);

  const ankiConnectCall954 = object({
    action: text,
    params: { type: "object", propertyNames: text, additionalProperties: {} },
  });
  assert.deepEqual(at(unboundedParts(ankiConnectCall954)), [
    "action",
    "params",
    "params{key}",
    "params{value}",
  ]);

  const ankiConnectMedia1231 = object({ fields: { type: "array", items: text } });
  assert.deepEqual(unboundedParts(ankiConnectMedia1231), [
    "fields accepts a list with no maximum. Add .max(n).",
    "fields[] accepts text with no maximum. Add .max(n), or use Id or Cursor from packages/core/src/bounds.ts.",
  ]);
});

test("every kind of bound is accepted", () => {
  const bounded = object({
    id,
    kind: { enum: ["a", "b"] },
    only: { const: "a" },
    at: { type: "string", format: "date-time" },
    code: { type: "string", pattern: "^([01]\\d|2[0-3]):(00|30)$" },
    count: { type: ["integer", "null"] },
    ids: { type: "array", items: id, maxItems: 200 },
    pair: { type: "array", prefixItems: [id, { type: "boolean" }] },
    decks: { type: "object", propertyNames: id, additionalProperties: id, maxProperties: 5 },
  });
  assert.deepEqual(unboundedParts(bounded), []);
});

test("a pattern bounds text only when it is closed and repeats a fixed number of times", () => {
  const patterns = ["^a+$", "^a{2,}$", "^\\w*$", "abc", "^a|b$"];
  const properties = Object.fromEntries(patterns.map((pattern) => [pattern, { ...text, pattern }]));
  assert.deepEqual(at(unboundedParts(object(properties))), patterns);
});

test("branches, references and nested schemas are walked", () => {
  const components = { Card: object({ term: text, next: { $ref: "#/components/schemas/Card" } }) };
  const schema = { anyOf: [{ type: "null" }, { $ref: "#/components/schemas/Card" }, text] };
  assert.deepEqual(at(unboundedParts(schema, { components })), ["term", "(whole value)"]);
  assert.deepEqual(at(unboundedParts({ $ref: "#/components/schemas/Gone" })), ["(whole value)"]);
});

test("a value another parser reads passes only when that parser is checked too", () => {
  const later = object({ params: { "x-lymi-parsed-by": "AnkiConnect action" } });
  assert.deepEqual(unboundedParts(later, { parsers: ["AnkiConnect action"] }), []);
  assert.deepEqual(at(unboundedParts(later, { parsers: ["MCP tool"] })), ["params"]);
});
