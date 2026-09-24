import { expect, it } from "vitest";
import { testApp } from "../test-app";
import { recordRequest, track } from "./analytics";

it("writes only fixed labels and counts, and stays silent without a binding", async () => {
  const points: AnalyticsEngineDataPoint[] = [];
  const writer = { writeDataPoint: (point?: AnalyticsEngineDataPoint) => points.push(point ?? {}) };
  track(undefined, { name: "signed_in" });
  recordRequest(undefined, {
    route: "/api/health",
    method: "GET",
    status: 200,
    durationMs: 1,
    actor: "anon",
  });
  expect(points).toEqual([]);

  track(writer, { name: "review_graded", mode: "meaning_to_term", grade: 3 });
  expect(points).toEqual([
    { indexes: ["review_graded"], blobs: ["meaning_to_term"], doubles: [3] },
  ]);
  recordRequest(writer, {
    route: "/api/*",
    method: "X-PRIVATE",
    status: 404,
    durationMs: 2,
    actor: "anon",
  });
  expect(points.at(-1)?.blobs).toEqual(["/api/*", "OTHER", "4xx"]);

  const app = await testApp();
  app.env.REQUESTS = writer;
  const response = await app.fetch("/api/health?private=value");
  expect(response.status).toBe(200);
  const request = points.at(-1);
  expect(request?.indexes).toEqual(["anon"]);
  expect(request?.blobs).toEqual(["/api/health", "GET", "2xx"]);
  expect(request?.doubles?.[0]).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(points)).not.toContain("private");
});
