import { beforeAll, describe, expect, it, vi } from "vitest";
import { type ReadwiseApi, ReadwiseUnavailable } from "../readwise/api";
import { createFakeReadwiseApi, DEV_READWISE_TOKEN } from "../readwise/dev-fake";
import { json, type TestApp, testApp } from "../test-app";

const pull = vi.hoisted(() => ({ failure: null as Error | null }));

vi.mock("../readwise/deps", () => ({
  readwiseDeps: (env: { BETTER_AUTH_SECRET: string }) => {
    const api: ReadwiseApi = {
      ...createFakeReadwiseApi(),
      exportPage: async (token, input) => {
        if (pull.failure) throw pull.failure;
        return createFakeReadwiseApi().exportPage(token, input);
      },
    };
    return { api, secret: env.BETTER_AUTH_SECRET, languages: null, enrichment: null };
  },
}));

let app: TestApp;

beforeAll(async () => {
  app = await testApp();
}, 60_000);

/** Follows a book with a pull set to fail, as saving its language does. */
async function follow(handle: string, failure: Error) {
  const reader = await app.signUp(handle);
  await app.fetch("/api/decks", {
    ...json({ name: "Italiano", defaultLanguage: "it" }),
    as: reader,
  });
  await app.fetch("/api/readwise", { ...json({ token: DEV_READWISE_TOKEN }), as: reader });
  pull.failure = failure;
  const response = await app.fetch("/api/readwise", {
    ...json({ books: [{ id: "9001", language: "it" }] }, { method: "PATCH" }),
    as: reader,
  });
  pull.failure = null;
  return { reader, response };
}

describe("PATCH /api/readwise", () => {
  it("keeps a saved book through a Readwise outage", async () => {
    const { response } = await follow("rw-route-down", new ReadwiseUnavailable(502));
    expect(response.status).toBe(200);
    const { connection } = (await response.json()) as {
      connection: { books: { id: string; followed: boolean }[] };
    };
    expect(connection.books.find((book) => book.id === "9001")?.followed).toBe(true);
  });

  it("answers 500 for a failure that is not Readwise's, with the book still saved", async () => {
    const { reader, response } = await follow("rw-route-bug", new RangeError("a bug in the pull"));
    expect(response.status).toBe(500);
    const saved = await app.fetch("/api/readwise", { as: reader });
    const { connection } = (await saved.json()) as {
      connection: { books: { id: string; followed: boolean }[] };
    };
    expect(connection.books.find((book) => book.id === "9001")?.followed).toBe(true);
  });
});
