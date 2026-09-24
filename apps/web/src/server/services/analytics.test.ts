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
  expect(request?.indexes).toEqual(["public"]);
  expect(request?.blobs).toEqual(["/api/health", "GET", "2xx"]);
  expect(request?.doubles?.[0]).toBeGreaterThanOrEqual(0);
  expect(JSON.stringify(points)).not.toContain("private");
});

it("labels callers and routes without recording requested paths", async () => {
  const points: AnalyticsEngineDataPoint[] = [];
  const app = await testApp();
  app.env.REQUESTS = {
    writeDataPoint: (point?: AnalyticsEngineDataPoint) => points.push(point ?? {}),
  };
  const learner = await app.signUp(`analytics-${Date.now()}`);
  const label = async (path: string, as?: typeof learner) => {
    await app.fetch(path, { as });
    const [actor] = points.at(-1)?.indexes ?? [];
    const [route, , status] = points.at(-1)?.blobs ?? [];
    return [actor, route, status];
  };

  expect(await label("/api/me")).toEqual(["anon", "/api/*", "4xx"]);
  expect(await label("/api/me", learner)).toEqual(["user", "/api/me", "2xx"]);
  expect(await label("/api/cards/card_missing", learner)).toEqual([
    "user",
    "/api/cards/:id",
    "4xx",
  ]);
  expect(await label("/api/nothing/card_missing", learner)).toEqual(["user", "unmatched", "4xx"]);
  expect(await label("/api/auth/get-session", learner)).toEqual(["public", "/api/auth/*", "2xx"]);
  expect(JSON.stringify(points)).not.toContain("card_missing");
});
