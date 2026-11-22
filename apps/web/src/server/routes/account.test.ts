import { beforeAll, describe, expect, it, vi } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

const cleanup = vi.hoisted(() => ({
  failure: new Error("D1 is unavailable"),
  report: vi.fn(),
}));

vi.mock("../services", async (original) => ({
  ...(await original<typeof import("../services")>()),
  deleteAccount: async () => ({
    email: "leaving@lymi.local",
    language: "en",
    confirmedWith: "code",
    keptDecks: 1,
    publishedDecks: 0,
    privateImages: [],
    audioKeys: [],
    imports: [],
    exports: [],
    sessionsEnded: true,
    appleRevocation: null,
  }),
  copyFormerDecks: () => Promise.reject(cleanup.failure),
}));

vi.mock("../posthog", async (original) => ({
  ...(await original<typeof import("../posthog")>()),
  reportServerException: cleanup.report,
}));

let app: TestApp;
let learner: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("leaving");
}, 60_000);

describe("deleting an account", () => {
  it("answers, and reports a cleanup that failed after the delete", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const deleted = await app.fetch("/api/me", {
      ...json({ code: "123456" }, { method: "DELETE" }),
      as: learner,
    });

    expect(deleted.status, await deleted.clone().text()).toBe(200);
    expect(cleanup.report).toHaveBeenCalledWith(expect.anything(), cleanup.failure, {
      route: "account/cleanup",
      method: "DELETE",
    });
  });
});
