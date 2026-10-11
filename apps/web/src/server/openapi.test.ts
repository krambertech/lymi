import { describe, expect, it } from "vitest";
import { openApiCorsOrigin } from "./openapi";
import { testApp } from "./test-app";

describe("OpenAPI CORS", () => {
  it("allows only the configured public website origin", () => {
    expect(openApiCorsOrigin("https://lymi.app", "https://lymi.app")).toBe("https://lymi.app");
    expect(openApiCorsOrigin("https://elsewhere.example", "https://lymi.app")).toBeNull();
    expect(openApiCorsOrigin(undefined, "https://lymi.app")).toBeNull();
  });
});

describe("OpenAPI document", () => {
  it("documents every write's 403 with the Error shape", async () => {
    const app = await testApp();
    const response = await app.fetch("/api/openapi.json", {});
    type Operation = {
      responses: Record<string, { content?: Record<string, { schema: unknown }> }>;
    };
    const document = (await response.json()) as {
      paths: Record<string, Record<string, Operation>>;
      components: { schemas: Record<string, unknown> };
    };

    const writes = Object.entries(document.paths).flatMap(([path, operations]) =>
      Object.entries(operations)
        .filter(([method]) => ["post", "patch", "put", "delete"].includes(method))
        .map(([method, operation]) => ({ route: `${method} ${path}`, operation })),
    );
    expect(writes.length).toBeGreaterThan(0);
    expect(document.components.schemas.Error).toBeDefined();
    for (const { route, operation } of writes) {
      const schema = operation.responses["403"]?.content?.["application/json"]?.schema;
      expect({ route, schema }).toEqual({ route, schema: { $ref: "#/components/schemas/Error" } });
    }
  }, 60_000);
});
