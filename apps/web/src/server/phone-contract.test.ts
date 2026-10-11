import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DeckOut } from "@lymi/core";
import Ajv2020 from "ajv/dist/2020";
import { beforeAll, describe, expect, it } from "vitest";
import { breakingChanges, type Contract, contractOf } from "../../../../scripts/api-compat.mjs";
import { json, type Session, type TestApp, testApp } from "./test-app";

/**
 * Every phone release freezes the API it was built against in apps/mobile/contract, and the
 * Worker stays compatible with each frozen release that is still supported. ADR 0031.
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

/** The phone's reads, with the ids a seeded learner fills in. */
const phoneReads = [
  "/api/decks",
  "/api/decks/{id}/cards",
  "/api/decks/{id}/sections",
  "/api/review/draw",
  "/api/review/queue",
  "/api/review/rounds",
  "/api/stats/streak",
];

let app: TestApp;
let learner: { session: Session; deckId: string };
let current: Contract;

beforeAll(async () => {
  app = await testApp();
  // Signing up first lets Better Auth seed its rows once, before any other request.
  learner = await seededLearner();
  current = contractOf(await (await app.fetch("/api/openapi.json", {})).json());
}, 60_000);

// `pnpm --filter @lymi/mobile contract:freeze` runs this when a release is cut.
it.runIf(process.env.FREEZE_PHONE_CONTRACT === "1")(
  "freezes the API this release is built against",
  () => {
    writeFileSync(join(contracts, `${appVersion()}.json`), `${JSON.stringify(current, null, 1)}\n`);
  },
);

describe.each(frozen)("the phone release $version", ({ contract }) => {
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
      const path = template.replace("{id}", learner.deckId);
      const operation = contract.paths[template]?.get as
        | { responses: Record<string, { content?: Record<string, { schema: unknown }> }> }
        | undefined;
      // A read this release never made is no part of its contract.
      if (!operation) continue;
      const response = await app.fetch(path, { as: learner.session });
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

/** A learner with a deck of due cards, so each read answers with rows rather than empty lists. */
async function seededLearner(): Promise<{ session: Session; deckId: string }> {
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
  return { session, deckId };
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
function rebase(schema: unknown): unknown {
  return JSON.parse(
    JSON.stringify(schema ?? {}).replaceAll('"#/components/', '"contract#/components/'),
  );
}
