import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "./env";
import {
  dispatchReviewReminders,
  reminderCopy,
  reminderIsDue,
  reminderMoment,
} from "./push-delivery";

const candidate = {
  id: "push-1",
  endpoint: "https://push.example/subscription",
  p256dh: "public-key",
  auth: "auth-key",
  reminder_time: "19:00",
  timezone: "Europe/Tallinn",
  last_sent_local_date: null,
  app_language: null,
  due_count: 7,
};

function fakeEnv(row = candidate, claimChanges = 1) {
  const statements: string[] = [];
  const prepare = vi.fn((sql: string) => {
    statements.push(sql);
    return {
      bind: vi.fn(() => ({
        all: vi.fn().mockResolvedValue({ results: [row] }),
        run: vi.fn().mockResolvedValue({ meta: { changes: claimChanges } }),
      })),
    };
  });
  const env = Object.assign(Object.create(null), {
    DB: Object.assign(Object.create(null), { prepare }) as D1Database,
    PRODUCT_URL: "https://my.lymi.example",
  }) as Bindings;
  return { env, statements };
}

describe("review reminder delivery", () => {
  it("loads the Web Push implementation in the Workers runtime", async () => {
    const { default: webpush } = await import("web-push");
    const keys = webpush.generateVAPIDKeys();
    expect(keys.publicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(keys.privateKey).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("evaluates local wall-clock time through daylight-saving timezones", () => {
    const now = new Date("2026-09-06T16:07:00.000Z");
    expect(reminderMoment(now, "Europe/Tallinn")).toEqual({
      localDate: "2026-09-06",
      minutes: 19 * 60 + 7,
    });
    expect(reminderIsDue(now, "Europe/Tallinn", "19:00")).not.toBeNull();
    expect(reminderIsDue(now, "Europe/Tallinn", "19:15")).toBeNull();
    expect(
      reminderIsDue(new Date("2026-09-06T16:15:00.000Z"), "Europe/Tallinn", "19:00"),
    ).not.toBeNull();
    expect(
      reminderIsDue(new Date("2026-09-06T16:30:00.000Z"), "Europe/Tallinn", "19:00"),
    ).toBeNull();
  });

  it("keeps a midnight retry attached to the preceding local date", () => {
    expect(reminderIsDue(new Date("2026-09-07T00:00:00.000Z"), "UTC", "23:45")).toEqual({
      localDate: "2026-09-06",
      minutes: 0,
    });
    expect(reminderIsDue(new Date("2026-09-07T00:15:00.000Z"), "UTC", "23:45")).toBeNull();
  });

  it("keeps lock-screen copy generic", async () => {
    expect(await reminderCopy(1)).toEqual({
      title: "One word is ready",
      body: "One card is waiting when you have a moment.",
    });
    expect((await reminderCopy(7)).body).toBe("7 cards are waiting when you have a moment.");
  });

  it("uses the Ukrainian plural categories one, few and many", async () => {
    expect((await reminderCopy(1, "uk")).body).toBe("1 картка чекає, коли матимеш хвилинку.");
    expect((await reminderCopy(2, "uk")).body).toBe("2 картки чекають, коли матимеш хвилинку.");
    expect((await reminderCopy(5, "uk")).body).toBe("5 карток чекають, коли матимеш хвилинку.");
    expect((await reminderCopy(21, "uk")).body).toBe("21 картка чекає, коли матимеш хвилинку.");
    expect((await reminderCopy(3, "xx")).title).toBe("A few words are ready");
  });

  it("claims the local date and sends one reminder", async () => {
    const { env, statements } = fakeEnv();
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(
      dispatchReviewReminders(env, new Date("2026-09-06T16:07:00.000Z"), send),
    ).resolves.toEqual({ considered: 1, sent: 1, expired: 0, failed: 0 });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: "push-1" }), 7, env);
    expect(statements.some((sql) => sql.includes("last_sent_local_date = ?"))).toBe(true);
  });

  it("does not send without due cards or after another invocation won the claim", async () => {
    const noCards = fakeEnv({ ...candidate, due_count: 0 });
    const send = vi.fn().mockResolvedValue(undefined);
    expect(
      await dispatchReviewReminders(noCards.env, new Date("2026-09-06T16:07:00.000Z"), send),
    ).toMatchObject({ sent: 0 });

    const duplicate = fakeEnv(candidate, 0);
    expect(
      await dispatchReviewReminders(duplicate.env, new Date("2026-09-06T16:07:00.000Z"), send),
    ).toMatchObject({ sent: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("removes expired endpoints and releases transient failures", async () => {
    const expired = fakeEnv();
    const gone = Object.assign(new Error("gone"), { statusCode: 410 });
    const expiredResult = await dispatchReviewReminders(
      expired.env,
      new Date("2026-09-06T16:07:00.000Z"),
      vi.fn().mockRejectedValue(gone),
    );
    expect(expiredResult).toMatchObject({ expired: 1, failed: 0 });
    expect(expired.statements.some((sql) => sql.includes("DELETE FROM push_subscriptions"))).toBe(
      true,
    );

    const transient = fakeEnv();
    const failedResult = await dispatchReviewReminders(
      transient.env,
      new Date("2026-09-06T16:07:00.000Z"),
      vi.fn().mockRejectedValue(new Error("temporary")),
    );
    expect(failedResult).toMatchObject({ expired: 0, failed: 1 });
    expect(
      transient.statements.some((sql) => sql.includes("SET last_sent_local_date = NULL")),
    ).toBe(true);
  });
});
