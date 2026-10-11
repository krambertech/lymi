import assert from "node:assert/strict";
import test from "node:test";
import { breakingChanges, contractOf } from "./api-compat.mjs";

const mode = {
  anyOf: [
    {
      type: "object",
      properties: { cue: { const: "term" }, target: { const: "meaning" } },
      required: ["cue", "target"],
    },
    {
      type: "object",
      properties: { cue: { const: "meaning" }, target: { const: "term" } },
      required: ["cue", "target"],
    },
  ],
};

/** A document with one read and one write, shaped like the review routes. */
function documentWith({ card = {}, draw = {}, grade = {}, modeSchema = mode } = {}) {
  return contractOf({
    paths: {
      "/api/review/draw": {
        get: {
          parameters: [{ in: "query", name: "deck", required: false, schema: { type: "string" } }],
          responses: {
            200: {
              description: "The draw",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Draw" } } },
            },
            401: { description: "Signed out" },
          },
        },
      },
      "/api/review/grade": {
        post: {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cardId: { type: "string" },
                    rating: { enum: [1, 2, 3, 4] },
                    note: { type: "string", maxLength: 200 },
                    ...grade.properties,
                  },
                  required: ["cardId", "rating", ...(grade.required ?? [])],
                  ...(grade.strict ? { additionalProperties: false } : {}),
                },
              },
            },
          },
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { type: "object", properties: { ok: { const: true } }, required: ["ok"] },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Card: {
          type: "object",
          properties: {
            id: { type: "string" },
            term: { type: "string" },
            meaning: { type: ["string", "null"] },
            ...card.properties,
          },
          required: card.required ?? ["id", "term", "meaning"],
        },
        ReviewMode: modeSchema,
        Draw: {
          type: "object",
          properties: {
            cards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  card: { $ref: "#/components/schemas/Card" },
                  mode: { $ref: "#/components/schemas/ReviewMode" },
                },
                required: ["card", "mode"],
              },
            },
            ...draw.properties,
          },
          required: ["cards", ...(draw.required ?? [])],
        },
      },
    },
  });
}

test("an unchanged document is compatible", () => {
  assert.deepEqual(breakingChanges(documentWith(), documentWith()), []);
});

test("a response may gain fields and the API may gain endpoints", () => {
  const next = documentWith({
    card: { properties: { hook: { type: "string" } } },
    draw: { properties: { goal: { type: "integer" } }, required: ["goal"] },
  });
  next.paths["/api/insights"] = { get: { responses: { 200: { description: "New" } } } };
  assert.deepEqual(breakingChanges(documentWith(), next), []);
});

test("a removed or now-optional response field breaks the client", () => {
  const next = documentWith({ card: { required: ["id", "term"] } });
  assert.deepEqual(breakingChanges(documentWith(), next), [
    "GET /api/review/draw 200.cards[].card: meaning may be missing",
  ]);
});

test("a removed endpoint or success status breaks the client", () => {
  const next = documentWith();
  delete next.paths["/api/review/grade"];
  next.paths["/api/review/draw"].get.responses = {
    202: next.paths["/api/review/draw"].get.responses[200],
  };
  assert.deepEqual(breakingChanges(documentWith(), next), [
    "GET /api/review/draw: no longer answers 200",
    "GET /api/review/draw: now answers 202, which the client does not expect",
    "POST /api/review/grade: removed",
  ]);
});

test("a new review mode breaks a client that does not tolerate unknown modes", () => {
  const picture = {
    type: "object",
    properties: { cue: { const: "image" }, target: { const: "term" } },
    required: ["cue", "target"],
  };
  const next = documentWith({ modeSchema: { anyOf: [...mode.anyOf, picture] } });
  assert.deepEqual(breakingChanges(documentWith(), next), [
    "GET /api/review/draw 200.cards[].mode: a value no longer fits any of the shapes it had",
  ]);

  const tolerant = documentWith({ modeSchema: { ...mode, "x-lymi-open": true } });
  assert.deepEqual(breakingChanges(tolerant, next), []);
});

test("a widened response enum breaks the client unless it is open", () => {
  const frozen = documentWith({
    draw: { properties: { outcome: { enum: ["open", "goal_met"] } } },
  });
  const next = documentWith({
    draw: { properties: { outcome: { enum: ["open", "goal_met", "rest_day"] } } },
  });
  assert.deepEqual(breakingChanges(frozen, next), [
    'GET /api/review/draw 200.outcome: "rest_day" not among ["open","goal_met"]',
  ]);
  const open = documentWith({
    draw: { properties: { outcome: { enum: ["open", "goal_met"], "x-lymi-open": true } } },
  });
  assert.deepEqual(breakingChanges(open, next), []);
});

test("an old client's request must still be accepted", () => {
  const required = documentWith({
    grade: { properties: { durationMs: { type: "integer" } }, required: ["durationMs"] },
  });
  assert.deepEqual(breakingChanges(documentWith(), required), [
    "POST /api/review/grade body: durationMs is now required",
  ]);

  const optional = documentWith({ grade: { properties: { durationMs: { type: "integer" } } } });
  assert.deepEqual(breakingChanges(documentWith(), optional), []);

  const narrowed = documentWith();
  const body = narrowed.paths["/api/review/grade"].post.requestBody.content["application/json"];
  body.schema.properties.rating = { enum: [1, 3] };
  body.schema.properties.note.maxLength = 100;
  assert.deepEqual(breakingChanges(documentWith(), narrowed), [
    "POST /api/review/grade body.rating: 2, 4 not among [1,3]",
    "POST /api/review/grade body.note: maxLength tightened to 100",
  ]);
});

test("a strict request schema refuses a field the old client still sends", () => {
  const frozen = documentWith({ grade: { properties: { legacy: { type: "string" } } } });
  const next = documentWith({ grade: { strict: true } });
  assert.deepEqual(breakingChanges(frozen, next), [
    "POST /api/review/grade body: legacy is no longer accepted",
  ]);
});

test("a new required query parameter breaks the client", () => {
  const next = documentWith();
  next.paths["/api/review/draw"].get.parameters.push({
    in: "query",
    name: "tz",
    required: true,
    schema: { type: "string" },
  });
  assert.deepEqual(breakingChanges(documentWith(), next), [
    "GET /api/review/draw: new required query:tz",
  ]);
});

test("the contract drops prose so rewording a description changes nothing", () => {
  const frozen = documentWith();
  const reworded = contractOf({
    ...frozen,
    paths: {
      ...frozen.paths,
      "/api/review/draw": {
        get: { ...frozen.paths["/api/review/draw"].get, summary: "Draw the next cards" },
      },
    },
  });
  assert.deepEqual(reworded, frozen);
});
