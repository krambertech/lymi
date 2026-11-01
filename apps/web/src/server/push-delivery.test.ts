import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "./env";
import {
  dispatchReviewReminders,
  reminderCopy,
  reminderIsDue,
  reminderLink,
  reminderMoment,
} from "./push-delivery";

const candidate = {
  id: "push-1",
  user_id: "learner-1",
  endpoint: "https://push.example/subscription",
  p256dh: "public-key",
  auth: "auth-key",
  reminder_time: "19:00",
  timezone: "Europe/Tallinn",
  last_sent_local_date: null,
  app_language: null,
  review_timezone: null as string | null,
  last_opened_at: new Date("2026-09-05T09:00:00.000Z").getTime(),
};
const ready = { message: "ready", count: 7 } as const;
const seven = async () => ({ reminder: ready, due: 7 });

function fakeEnv(row = candidate, claimChanges = 1) {
  const statements: string[] = [];
  const prepare = vi.fn((sql: string) => {
    statements.push(sql);
    const statement = {
      all: vi.fn().mockResolvedValue({ results: [row] }),
      run: vi.fn().mockResolvedValue({ meta: { changes: claimChanges } }),
    };
    return { ...statement, bind: vi.fn(() => statement) };
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

  it("uses the right reminder plurals in every app language", async () => {
    const titles = {
      en: ["1 card is ready", "2 cards are ready", "5 cards are ready", "21 cards are ready"],
      uk: ["1 картка готова", "2 картки готові", "5 карток готові", "21 картка готова"],
      ru: ["1 карточка готова", "2 карточки готовы", "5 карточек готовы", "21 карточка готова"],
    } as const;
    for (const [locale, expected] of Object.entries(titles)) {
      const actual = await Promise.all(
        [1, 2, 5, 21].map((count) => reminderCopy({ message: "ready", count }, locale)),
      );
      expect(actual.map((copy) => copy.title)).toEqual(expected);
    }
    expect((await reminderCopy(ready, "xx")).body).toBe("Review whenever you have a moment.");
  });

  it("writes each kind of day in English", async () => {
    expect(await reminderCopy({ message: "ready", count: 10 })).toEqual({
      title: "10 cards are ready",
      body: "Review whenever you have a moment.",
    });
    expect(await reminderCopy({ message: "to_goal", count: 6 })).toEqual({
      title: "6 cards to today’s goal",
      body: "Finish if you have a moment.",
    });
    expect(await reminderCopy({ message: "after_rest", count: 12 })).toEqual({
      title: "Yesterday was a rest day",
      body: "Your streak carried on. 12 cards are ready.",
    });
    expect(await reminderCopy({ message: "next_cards", count: 10 })).toEqual({
      title: "Your next cards are ready",
      body: "10 cards for today.",
    });
  });

  it("keeps a day's words whole in Ukrainian and Russian, one card or twenty-one", async () => {
    expect(await reminderCopy({ message: "next_cards", count: 1 }, "uk")).toEqual({
      title: "Наступна картка готова",
      body: "1 картка на сьогодні.",
    });
    expect(await reminderCopy({ message: "next_cards", count: 21 }, "uk")).toEqual({
      title: "Наступні картки готові",
      body: "21 картка на сьогодні.",
    });
    expect((await reminderCopy({ message: "next_cards", count: 21 }, "ru")).title).toBe(
      "Следующие карточки готовы",
    );
    expect(await reminderCopy({ message: "to_goal", count: 5 }, "ru")).toEqual({
      title: "До сегодняшней цели: 5 карточек",
      body: "Закончи, если есть минутка.",
    });
    expect(await reminderCopy({ message: "after_rest", count: 2 }, "uk")).toEqual({
      title: "Учора був день відпочинку",
      body: "Дні поспіль не перервалися. 2 картки готові.",
    });
  });

  it("marks the link with the way in and the message", () => {
    expect(reminderLink("to_goal", "https://my.lymi.example")).toBe(
      "https://my.lymi.example/review?lymi_entry=reminder&lymi_reminder=to_goal",
    );
  });

  it("claims the local date and sends one reminder", async () => {
    const { env, statements } = fakeEnv();
    const send = vi.fn().mockResolvedValue(undefined);
    const count = vi.fn(seven);
    await expect(
      dispatchReviewReminders(env, new Date("2026-09-06T16:07:00.000Z"), send, count),
    ).resolves.toEqual({ considered: 1, sent: 1, quiet: 0, expired: 0, failed: 0 });
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ id: "push-1" }), ready, env);
    expect(statements.some((sql) => sql.includes("last_sent_local_date = ?"))).toBe(true);
    expect(count).toHaveBeenCalledWith("learner-1", "Europe/Tallinn", expect.any(Date));
  });

  it("counts the review day in the review zone, not the device zone", async () => {
    const { env } = fakeEnv({ ...candidate, review_timezone: "Asia/Tokyo" });
    const count = vi.fn(seven);
    await dispatchReviewReminders(env, new Date("2026-09-06T16:07:00.000Z"), vi.fn(), count);
    expect(count).toHaveBeenCalledWith("learner-1", "Asia/Tokyo", expect.any(Date));
  });

  it("does not send without due cards or after another invocation won the claim", async () => {
    const noCards = fakeEnv();
    const send = vi.fn().mockResolvedValue(undefined);
    expect(
      await dispatchReviewReminders(
        noCards.env,
        new Date("2026-09-06T16:07:00.000Z"),
        send,
        async () => ({ reminder: null, due: 0 }),
      ),
    ).toMatchObject({ sent: 0 });

    const closed = fakeEnv();
    const count = vi.fn(seven);
    await dispatchReviewReminders(closed.env, new Date("2026-09-06T12:00:00.000Z"), send, count);
    expect(count).not.toHaveBeenCalled();

    const duplicate = fakeEnv(candidate, 0);
    expect(
      await dispatchReviewReminders(
        duplicate.env,
        new Date("2026-09-06T16:07:00.000Z"),
        send,
        seven,
      ),
    ).toMatchObject({ sent: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("stays silent on a day that needs no reminder, and leaves the claim for later", async () => {
    const { env, statements } = fakeEnv();
    const send = vi.fn().mockResolvedValue(undefined);
    await dispatchReviewReminders(env, new Date("2026-09-06T16:07:00.000Z"), send, async () => ({
      reminder: null,
      due: 40,
    }));
    expect(send).not.toHaveBeenCalled();
    expect(statements.some((sql) => sql.includes("UPDATE push_subscriptions"))).toBe(false);
  });

  it("stops a week after the learner last opened Lymi", async () => {
    const opened = new Date("2026-09-06T16:00:00.000Z").getTime();
    const { env } = fakeEnv({ ...candidate, last_opened_at: opened });
    const send = vi.fn().mockResolvedValue(undefined);
    const count = vi.fn(seven);
    const weekLater = new Date("2026-09-13T16:07:00.000Z");
    await expect(dispatchReviewReminders(env, weekLater, send, count)).resolves.toMatchObject({
      sent: 0,
      quiet: 1,
    });
    expect(count).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("reminds again once the learner returns", async () => {
    const { env } = fakeEnv({
      ...candidate,
      last_opened_at: new Date("2026-09-13T08:00:00.000Z").getTime(),
    });
    await expect(
      dispatchReviewReminders(env, new Date("2026-09-13T16:07:00.000Z"), vi.fn(), seven),
    ).resolves.toMatchObject({ sent: 1, quiet: 0 });
  });

  it("removes expired endpoints and releases transient failures", async () => {
    const expired = fakeEnv();
    const gone = Object.assign(new Error("gone"), { statusCode: 410 });
    const expiredResult = await dispatchReviewReminders(
      expired.env,
      new Date("2026-09-06T16:07:00.000Z"),
      vi.fn().mockRejectedValue(gone),
      seven,
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
      seven,
    );
    expect(failedResult).toMatchObject({ expired: 0, failed: 1 });
    expect(
      transient.statements.some((sql) => sql.includes("SET last_sent_local_date = NULL")),
    ).toBe(true);
  });
});
