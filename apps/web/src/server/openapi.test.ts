import { describe, expect, it } from "vitest";
import { openApiCorsOrigin } from "./openapi";

describe("OpenAPI CORS", () => {
  it("allows only the configured public website origin", () => {
    expect(openApiCorsOrigin("https://lymi.app", "https://lymi.app")).toBe("https://lymi.app");
    expect(openApiCorsOrigin("https://elsewhere.example", "https://lymi.app")).toBeNull();
    expect(openApiCorsOrigin(undefined, "https://lymi.app")).toBeNull();
  });
});
