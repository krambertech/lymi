import { afterEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import { joinBeta } from "./beta";
import type { ServiceError } from "./context";

interface DbDoubleOptions {
  existing?: boolean | undefined;
  insertError?: Error | undefined;
}

function dbDouble({ existing = false, insertError }: DbDoubleOptions = {}) {
  const limit = vi.fn().mockResolvedValue(existing ? [{ id: "signup_1" }] : []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const onConflictDoNothing = insertError
    ? vi.fn().mockRejectedValue(insertError)
    : vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  const db = { select, insert } as unknown as Db;
  return { db, select, insert, values, onConflictDoNothing };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("joinBeta", () => {
  it("recognises an address that is already on the list", async () => {
    const fake = dbDouble({ existing: true });

    await expect(
      joinBeta(fake.db, { email: "learner@example.com", source: "landing" }),
    ).resolves.toEqual({ alreadyOn: true });
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("stores where a new address joined and tolerates a concurrent duplicate", async () => {
    const fake = dbDouble();

    await expect(
      joinBeta(fake.db, { email: "learner@example.com", source: "join" }),
    ).resolves.toEqual({ alreadyOn: false });
    expect(fake.values).toHaveBeenCalledWith(
      expect.objectContaining({ email: "learner@example.com", source: "join" }),
    );
    expect(fake.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("turns database failures into a recoverable service error without logging the address", async () => {
    const fake = dbDouble({ insertError: new Error("no such table: beta_signups") });
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = joinBeta(fake.db, {
      email: "private-person@example.com",
      source: "landing",
    });

    await expect(result).rejects.toMatchObject({
      code: "unavailable",
      message: "The beta list is temporarily unavailable. Try again soon.",
    } satisfies Partial<ServiceError>);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("no such table: beta_signups"));
    expect(logged).not.toHaveBeenCalledWith(expect.stringContaining("private-person@example.com"));
  });
});
