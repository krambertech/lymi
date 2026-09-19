import { AddCardOutcomeOut, ApiKeyCreatedOut, DeckOut, JoinOut, JoinPreviewOut } from "@lymi/core";
import { ExploreOut } from "@lymi/core/catalog";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { json, type Session, type TestApp, testApp } from "../test-app";

/**
 * A published deck admits anyone who adds it, once, until it is withdrawn, and lands in the
 * edition Explore showed. ADR 0015, ADR 0020. The add page itself and signing up from it are
 * `e2e/published-deck-add.spec.ts`: the door page is HTMLRewriter, which only workerd has.
 */
let app: TestApp;
let publisher: Session;
let visitor: Session;

const Decks = z.array(DeckOut.pick({ id: true, name: true }));

const publication = (slug: string, category: "languages" | "driving") => ({
  slug,
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  category,
  meaningLanguage: "en",
  publisher: "Lymi",
});

async function publish(name: string, slug: string, term: string, meaning: string) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name, defaultLanguage: "et" }),
    as: publisher,
  });
  expect(deck.status).toBe(201);
  const deckId = DeckOut.parse(await deck.json()).id;
  const card = await app.fetch("/api/cards", { ...json({ deckId, term, meaning }), as: publisher });
  const outcome = AddCardOutcomeOut.parse(await card.json());
  if (outcome.status !== "added") throw new Error(`${term} was skipped`);
  const published = await app.fetch(`/api/decks/${deckId}/publication`, {
    ...json(publication(slug, "languages"), { method: "PUT" }),
    as: publisher,
  });
  expect(published.status, await published.text()).toBe(200);
  return { deckId, cardId: outcome.card.id };
}

async function libraryOf(session: Session) {
  const response = await app.fetch("/api/decks", { as: session });
  expect(response.status).toBe(200);
  return Decks.parse(await response.json());
}

beforeAll(async () => {
  app = await testApp({ publishers: ["publisher@lymi.local"] });
  publisher = await app.signUp("publisher");
  visitor = await app.signUp("visitor");
}, 60_000);

describe("a published deck", () => {
  const slug = "everyday-estonian";
  let deckId = "";

  it("previews for a visitor who is not signed in", async () => {
    ({ deckId } = await publish("Everyday Estonian", slug, "tere hommikust", "good morning"));

    const response = await app.fetch(`/api/add/${slug}`);
    expect(response.status).toBe(200);
    expect(JoinPreviewOut.parse(await response.json())).toMatchObject({
      status: "live",
      viewer: "signed-out",
      deck: { name: "Everyday Estonian", total: 1, owner: { name: "Lymi" } },
    });
  });

  it("is added once, and adding it again changes nothing", async () => {
    const added = await app.fetch(`/api/add/${slug}`, { method: "POST", as: visitor });
    expect(added.status).toBe(200);
    expect(JoinOut.parse(await added.json())).toMatchObject({ deckId });

    const again = await app.fetch(`/api/add/${slug}`, { method: "POST", as: visitor });
    expect(again.status).toBe(200);
    expect((await libraryOf(visitor)).filter((deck) => deck.id === deckId)).toHaveLength(1);

    const preview = await app.fetch(`/api/add/${slug}`, { as: visitor });
    expect(JoinPreviewOut.parse(await preview.json())).toMatchObject({
      status: "live",
      viewer: "member",
      deckId,
    });
  });

  it("is never added by a key", async () => {
    const made = await app.fetch("/api/keys", {
      ...json({ name: "Script", scope: "write" }),
      as: visitor,
    });
    const key = ApiKeyCreatedOut.parse(await made.json()).key;
    const response = await app.fetch(`/api/add/${slug}`, {
      method: "POST",
      headers: { "x-api-key": key },
    });
    expect(response.status).toBe(403);
  });

  it("keeps its learner once withdrawn and turns newcomers away", async () => {
    const withdrawn = await app.fetch(`/api/decks/${deckId}/publication`, {
      method: "DELETE",
      as: publisher,
    });
    expect(withdrawn.status).toBe(200);

    const latecomer = await app.signUp("latecomer");
    const preview = await app.fetch(`/api/add/${slug}`, { as: latecomer });
    expect(JoinPreviewOut.parse(await preview.json())).toMatchObject({ status: "off", deck: null });
    const refused = await app.fetch(`/api/add/${slug}`, { method: "POST", as: latecomer });
    expect(refused.status).toBe(404);
    expect(await refused.json()).toEqual({ error: "This deck is not published" });
    expect((await libraryOf(visitor)).some((deck) => deck.id === deckId)).toBe(true);
  });
});

describe("a deck added from Explore", () => {
  it("lands in the edition Explore showed", async () => {
    const slug = "explore-edition";
    const { deckId, cardId } = await publish("Explore Edition", slug, "kevad", "spring");
    const written = await app.fetch(`/api/decks/${deckId}/editions/uk`, {
      ...json(
        {
          deck: { name: "Українська колода", summary: "Український опис.", provenance: "human" },
          cards: [{ cardId, meaning: "весна", provenance: "human" }],
        },
        { method: "PUT" },
      ),
      as: publisher,
    });
    expect(written.status, await written.text()).toBe(200);
    for (const [path, method] of [
      [`/api/decks/${deckId}/editions/uk/approval`, "POST"],
      [`/api/decks/${deckId}/editions/uk/publication`, "PUT"],
    ] as const) {
      const response = await app.fetch(path, { ...json({}, { method }), as: publisher });
      expect(response.status, `${method} ${path}: ${await response.clone().text()}`).toBe(200);
    }

    const reader = await app.signUp("reader");
    const language = await app.fetch("/api/settings", {
      ...json({ appLanguage: "uk" }, { method: "PATCH" }),
      as: reader,
    });
    expect(language.status).toBe(200);
    const explore = ExploreOut.parse(
      await (await app.fetch("/api/explore", { as: reader })).json(),
    );
    const shown = explore.decks.find((deck) => deck.slug === slug);
    expect(shown).toMatchObject({ name: "Українська колода", meaningLanguage: "uk" });

    // The edition rides along with the press, and the membership reads in it from then on.
    const added = await app.fetch(`/api/add/${slug}?meaningLanguage=uk`, {
      method: "POST",
      as: reader,
    });
    expect(added.status).toBe(200);
    expect((await libraryOf(reader)).find((deck) => deck.id === deckId)?.name).toBe(
      "Українська колода",
    );
  });
});
