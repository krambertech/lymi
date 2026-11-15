import { describe, expect, it } from "vitest";
import { curlFor, type Doc, example, paramsOf, type Route, schemaHomes } from "./openapi";

const doc: Doc = {
  components: {
    parameters: {
      AddQuery: {
        in: "query",
        name: "meaningLanguage",
        required: true,
        schema: { type: "string" },
      },
    },
    schemas: {
      Deck: { type: "object", properties: { id: { type: "string" } } },
      Node: {
        type: "object",
        properties: { next: { anyOf: [{ $ref: "#/components/schemas/Node" }, { type: "null" }] } },
      },
    },
  },
  paths: {
    "/api/add/{slug}": {
      post: {
        tags: ["Explore"],
        parameters: [
          { in: "path", name: "slug", required: true },
          { $ref: "#/components/parameters/AddQuery" },
        ],
      },
    },
    "/api/decks": {
      get: {
        tags: ["Decks"],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Deck" } },
              },
            },
          },
        },
      },
    },
  },
};

const add: Route = {
  method: "post",
  path: "/api/add/{slug}",
  op: doc.paths?.["/api/add/{slug}"]?.post ?? {},
};

describe("paramsOf", () => {
  it("follows a parameter the generator hoisted into components", () => {
    expect(paramsOf(add.op, doc).map((p) => `${p.in} ${p.name}`)).toEqual([
      "path slug",
      "query meaningLanguage",
    ]);
  });

  it("puts a hoisted required query parameter in the curl example", () => {
    expect(curlFor(add, "https://my.lymi.app", doc)).toContain("/api/add/{slug}?meaningLanguage=");
  });
});

describe("example", () => {
  it("ends on a schema that names itself", () => {
    const defs = doc.components?.schemas ?? {};
    expect(() => example({ $ref: "#/components/schemas/Node" }, defs)).not.toThrow();
  });
});

describe("schemaHomes", () => {
  it("puts a schema on the page of the first resource that returns it", () => {
    const defs = doc.components?.schemas ?? {};
    const homes = schemaHomes(doc, defs, [
      { name: "Decks", slug: "decks" },
      { name: "Explore", slug: "explore" },
    ]);
    expect(homes.get("Deck")).toBe("decks");
    expect(homes.has("Node")).toBe(false);
  });
});
