import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AddCardsOut, CLIENT_HEADER, DeckOut, formatClientHeader } from "@lymi/core";
import Ajv2020, { type AnySchema } from "ajv/dist/2020";
import { beforeAll, describe, expect, it } from "vitest";
import {
  breakingChanges,
  type Contract,
  closedChoices,
  contractOf,
} from "../../../../scripts/api-compat.mjs";
import { json, type Session, type TestApp, testApp } from "./test-app";

/**
 * Every phone release freezes the API it was built against in apps/mobile/contract, and the
 * Worker stays compatible with each frozen release that is still supported. ADR 0032.
 */
const contracts = join(import.meta.dirname, "../../../mobile/contract");
const appVersion = (): string =>
  JSON.parse(readFileSync(join(contracts, "../app.json"), "utf8")).expo.version;

const frozen = readdirSync(contracts)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({
    version: name.replace(/\.json$/, ""),
    contract: JSON.parse(readFileSync(join(contracts, name), "utf8")) as Contract,
  }));

/**
 * Every call the phone makes, directly or through `packages/client`. A freeze keeps only these,
 * so a web-only endpoint can change freely; add a call here when the phone starts making it.
 */
const phoneOperations = [
  "GET /api/me",
  "PATCH /api/me",
  "GET /api/decks",
  "GET /api/decks/{id}/cards",
  "GET /api/decks/{id}/sections",
  "GET /api/review/draw",
  "GET /api/review/queue",
  "GET /api/review/rounds",
  "POST /api/review/today",
  "POST /api/review/grade",
  "POST /api/review/undo",
  "GET /api/stats/streak",
  "GET /api/stats/insights",
  "GET /api/activity",
  "GET /api/settings",
  "PATCH /api/settings",
  "PUT /api/settings/timezone/device",
  "GET /api/series",
  "POST /api/series",
  "PATCH /api/series/{id}",
  "PUT /api/series/{id}/decks",
  "PUT /api/series/order",
  "DELETE /api/series/{id}",
  "POST /api/decks",
  "PATCH /api/decks/{id}",
  "POST /api/decks/{id}/archive",
  "POST /api/decks/{id}/restore",
  "POST /api/decks/{id}/leave",
  "GET /api/cards/{id}/history",
  "GET /api/cards",
  "POST /api/cards",
  "PATCH /api/cards/{id}",
  "POST /api/cards/{id}/archive",
  "POST /api/cards/{id}/restore",
  "POST /api/cards/{id}/hook-draft",
  "PUT /api/cards/{id}/important",
  "PUT /api/cards/{id}/image",
  "GET /api/cards/{id}/image/{imageId}",
  "GET /api/explore",
  "GET /api/explore/{slug}",
  "POST /api/add/{slug}",
];

// The phone's calls the document hides, Better Auth, the photo, audio, feedback, and join links and
// the add preview, are guarded by phone-contract-unlisted.test.ts instead.

/** The phone's reads a seeded learner can make, with its deck as `{id}`. */
const phoneReads = phoneOperations
  .filter((operation) => operation.startsWith("GET ") && !/\{(?!id\})/.test(operation))
  .map((operation) => operation.slice("GET ".length));

/**
 * Fields the phone reads whose values stay a fixed list on purpose. Every other fixed list in its
 * responses carries `x-lymi-open`, so a field that lands here needs a reason.
 */
const closedOnPurpose = [
  // The scheduler has exactly four grades.
  "GET /api/review/draw 200 .log[].rating",
  // A literal `true` acknowledgement.
  "POST /api/cards/{id}/archive 200 .ok",
  "POST /api/cards/{id}/restore 200 .ok",
  "DELETE /api/series/{id} 200 .ok",
  "POST /api/decks/{id}/archive 200 .ok",
  "POST /api/decks/{id}/leave 200 .ok",
  "POST /api/decks/{id}/restore 200 .ok",
  "POST /api/review/grade 200 .ok",
  "POST /api/review/undo 200 .ok",
  // Capture says where an added card went, so a new outcome needs a version gate first.
  "POST /api/cards 200 .status",
  "POST /api/cards 201 .status",
];

let app: TestApp;
let learner: { session: Session; deckId: string; cardId: string };
let document: unknown;
let current: Contract;

beforeAll(async () => {
  app = await testApp();
  // Signing up first lets Better Auth seed its rows once, before any other request.
  learner = await seededLearner();
  document = await (await app.fetch("/api/openapi.json", {})).json();
  current = contractOf(document);
}, 60_000);

// `pnpm --filter @lymi/mobile contract:freeze` runs this when a release is cut.
it.runIf(process.env.FREEZE_PHONE_CONTRACT === "1")(
  "freezes the API this release is built against",
  () => {
    const release = contractOf(document, phoneOperations);
    writeFileSync(join(contracts, `${appVersion()}.json`), `${JSON.stringify(release, null, 1)}\n`);
  },
);

it("leaves open every fixed list the phone reads, except those closed on purpose", () => {
  expect(closedChoices(contractOf(document, phoneOperations))).toEqual(closedOnPurpose.sort());
});

describe.each(frozen)("the phone release $version", ({ version, contract }) => {
  it("declares no breaking change", () => {
    expect(breakingChanges(contract, current)).toEqual([]);
  });

  it("is served responses it can read", async () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    ajv.addFormat("date-time", true);
    ajv.addFormat("email", true);
    ajv.addFormat("uri", true);
    ajv.addSchema({ $id: "contract", components: tolerant(contract.components) });
    for (const template of phoneReads) {
      const id = template.startsWith("/api/cards/") ? learner.cardId : learner.deckId;
      const path = template.replace("{id}", id);
      const operation = contract.paths[template]?.get as
        | { responses: Record<string, { content?: Record<string, { schema: unknown }> }> }
        | undefined;
      // A read this release never made is no part of its contract.
      if (!operation) continue;
      // The installed release names itself, so routes gated by `clientSupports` answer as it sees them.
      const response = await app.fetch(path, {
        as: learner.session,
        headers: { [CLIENT_HEADER]: formatClientHeader({ platform: "ios", version }) },
      });
      expect({ path, status: response.status }).toEqual({ path, status: 200 });
      const schema = operation.responses["200"]?.content?.["application/json"]?.schema;
      const validate = ajv.compile(tolerant(rebase(schema)));
      const body = await response.json();
      expect({ path, errors: validate(body) ? null : validate.errors }).toEqual({
        path,
        errors: null,
      });
    }
  }, 60_000);
});

/**
 * A learner with a deck of due cards in a series and one graded review, so each read answers with
 * rows rather than empty lists.
 */
async function seededLearner(): Promise<{ session: Session; deckId: string; cardId: string }> {
  const session = await app.signUp("phone-contract");
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Lesson 3", defaultLanguage: "et" }),
    as: session,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const cards = await app.fetch("/api/cards/batch", {
    ...json({ cards: ["tere", "aitäh", "palun"].map((term) => ({ deckId, term, meaning: term })) }),
    as: session,
  });
  expect(cards.status).toBe(200);
  const [first] = AddCardsOut.parse(await cards.json()).results;
  if (first?.status !== "added") throw new Error("The seeded card was not added");
  const series = await app.fetch("/api/series", {
    ...json({ name: "Estonian", deckIds: [deckId] }),
    as: session,
  });
  expect(series.status).toBe(201);
  const grade = await app.fetch("/api/review/grade", {
    ...json({
      cardId: first.card.id,
      mode: { cue: "term", target: "meaning" },
      rating: 3,
      timezone: "UTC",
    }),
    as: session,
  });
  expect(grade.status).toBe(200);
  return { session, deckId, cardId: first.card.id };
}

/** The client reads JSON without parsing it, so a key it does not know is never a failure. */
function tolerant<T>(schema: T): T {
  return JSON.parse(
    JSON.stringify(schema).replaceAll(
      '"additionalProperties":false',
      '"additionalProperties":true',
    ),
  );
}

/** Points the document's local references at the registered contract. */
function rebase(schema: unknown): AnySchema {
  return JSON.parse(
    JSON.stringify(schema ?? {}).replaceAll('"#/components/', '"contract#/components/'),
  );
}
