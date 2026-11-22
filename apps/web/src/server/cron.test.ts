import { afterEach, describe, expect, it, vi } from "vitest";
import { JobFailed, job } from "./cron";
import type { Bindings } from "./env";

const env = { PRODUCT_URL: "http://localhost:5173" } as unknown as Bindings;

describe("a cron job that fails", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails the invocation without the SQL or the learner's text", async () => {
    const line = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("D1_ERROR: no such column: sbrigarsi: SQLITE_ERROR");
    const error = new Error("Failed query: update cards\nparams: sbrigarsi", { cause });

    const failure = await job(env, "readwise", Promise.reject(error)).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(JobFailed);
    expect((failure as JobFailed).message).toBe("cron/readwise failed: Error D1_ERROR");
    expect((failure as JobFailed).cause).toBeUndefined();
    expect(JSON.stringify(line.mock.calls)).not.toContain("sbrigarsi");
  });

  it("keeps the count a job failed with", async () => {
    const failed = new JobFailed("3 review reminder sends failed");
    await expect(job(env, "review-reminders", Promise.reject(failed))).rejects.toBe(failed);
  });
});
