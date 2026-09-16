import { eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import { type ServiceContext, ServiceError } from "./context";
import {
  clearLocalEmailOutbox,
  latestLocalEmail,
  renderTransactionalEmail,
  sendOperatorTestEmail,
  sendTransactionalEmail,
} from "./email";
import { learner, testDb } from "./test-db";

function fakeEnv(productUrl: string, send = vi.fn().mockResolvedValue({ messageId: "message-1" })) {
  return {
    env: { PRODUCT_URL: productUrl, EMAIL: { send } } as Pick<Bindings, "PRODUCT_URL" | "EMAIL">,
    send,
  };
}

let db: Db;
let dispose: () => Promise<void>;
let nextLearner = 0;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function person(name: string): Promise<ServiceContext> {
  nextLearner += 1;
  return learner(db, `email-${name.toLowerCase()}-${nextLearner}`, name);
}

const sentAudits = (ctx: ServiceContext) =>
  db
    .select({ action: schema.auditLog.action, payload: schema.auditLog.payload })
    .from(schema.auditLog)
    .where(eq(schema.auditLog.userId, ctx.userId));

describe("transactional email", () => {
  afterEach(() => {
    clearLocalEmailOutbox();
    vi.restoreAllMocks();
  });

  it("renders the test message in every app language", async () => {
    const expected = {
      en: [
        "Test email from Lymi",
        "Hello,\n\nThis test confirms that Lymi can send account emails.\n\nYou don’t need to do anything.\n\nLymi",
      ],
      uk: [
        "Тестовий лист від Lymi",
        "Вітаємо,\n\nЦей тест підтверджує, що Lymi може надсилати листи про обліковий запис.\n\nНічого робити не потрібно.\n\nLymi",
      ],
      ru: [
        "Тестовое письмо от Lymi",
        "Привет,\n\nЭтот тест подтверждает, что Lymi может отправлять письма об аккаунте.\n\nНичего делать не нужно.\n\nLymi",
      ],
    } as const;

    for (const [language, [subject, text]] of Object.entries(expected)) {
      const message = await renderTransactionalEmail("test", language);
      expect(message).toMatchObject({ kind: "test", language, subject, text });
      expect(message.html).toContain(`<html lang="${language}">`);
      expect(message.html).toContain(`<p>${text.split("\n")[0]}</p>`);
    }
  });

  it("falls back to English for an unknown language", async () => {
    await expect(renderTransactionalEmail("test", "et")).resolves.toMatchObject({
      language: "en",
      subject: "Test email from Lymi",
    });
  });

  it("renders feedback in English whatever the learner reads, with the kind in the subject", async () => {
    const message = await renderTransactionalEmail("feedback", "en", {
      feedback: {
        kind: "idea",
        message: "Let a deck hold a picture.",
        from: "Lesia <lesia@example.com>",
        screen: "/today",
        appVersion: "v42",
        browser: "Safari/17",
        language: "uk",
      },
    });

    expect(message).toMatchObject({
      kind: "feedback",
      language: "en",
      subject: "Lymi feedback: Idea",
    });
    expect(message.text).toBe(
      "Let a deck hold a picture.\n\nFrom: Lesia <lesia@example.com>\nScreen: /today\nApp version: v42\nBrowser: Safari/17\nApp language: uk",
    );
    expect(message.html).toContain('<html lang="en">');
    expect(message.html).toContain("Screen: /today<br>");
    // The learner's own words are escaped rather than rendered as markup.
    expect(message.html).toContain("Lesia &lt;lesia@example.com&gt;");
  });

  it("sends feedback to the operator inbox with the learner as reply-to", async () => {
    const ctx = await person("Feedback");
    const { env, send } = fakeEnv("https://my.lymi.app");

    await expect(
      sendTransactionalEmail(ctx, env, {
        kind: "feedback",
        to: "hello@lymi.app",
        language: "en",
        replyTo: "lesia@example.com",
        feedback: {
          kind: "bug",
          message: "The streak flame is missing.",
          from: "Lesia <lesia@example.com>",
          screen: "/today",
          appVersion: "v42",
          browser: "Safari/17",
          language: "uk",
        },
      }),
    ).resolves.toEqual({ delivery: "provider" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hello@lymi.app",
        replyTo: "lesia@example.com",
        subject: "Lymi feedback: Bug",
      }),
    );
  });

  it("writes loopback sends to the outbox without touching the provider", async () => {
    const ctx = await person("Loopback");
    const { env, send } = fakeEnv("http://127.0.0.1:4173");
    await expect(
      sendTransactionalEmail(ctx, env, {
        kind: "test",
        to: "Learner@Example.com",
        language: "uk",
      }),
    ).resolves.toEqual({ delivery: "outbox" });

    expect(send).not.toHaveBeenCalled();
    expect(latestLocalEmail("learner@example.com")).toMatchObject({
      kind: "test",
      language: "uk",
      to: "learner@example.com",
      subject: "Тестовий лист від Lymi",
    });
    await expect(sentAudits(ctx)).resolves.toEqual([
      {
        action: "send_transactional_email",
        payload: { kind: "test", delivery: "outbox" },
      },
    ]);
  });

  it("sends both bodies through the production binding with replies going to hello", async () => {
    const ctx = await person("Provider");
    const { env, send } = fakeEnv("https://my.lymi.app");
    await expect(
      sendTransactionalEmail(ctx, env, {
        kind: "test",
        to: "learner@example.com",
        language: "en",
      }),
    ).resolves.toEqual({ delivery: "provider" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "learner@example.com",
        from: { email: "notifications@lymi.app", name: "Lymi" },
        replyTo: "hello@lymi.app",
        subject: "Test email from Lymi",
        text: expect.stringContaining("Lymi can send account emails"),
        html: expect.stringContaining("<p>Lymi</p>"),
      }),
    );
    const audits = await sentAudits(ctx);
    expect(audits).toEqual([
      {
        action: "send_transactional_email",
        payload: { kind: "test", delivery: "provider" },
      },
    ]);
    expect(JSON.stringify(audits)).not.toContain("learner@example.com");
  });

  it("refuses a signed-in learner outside the operator capability list", async () => {
    const ctx = await person("Learner");
    const { env, send } = fakeEnv("http://127.0.0.1:4173");

    await expect(
      sendOperatorTestEmail(ctx, env, { to: "learner@example.com", language: "en" }, new Set()),
    ).rejects.toEqual(new ServiceError("forbidden", "Only a Lymi operator can send a test email."));
    expect(send).not.toHaveBeenCalled();
    await expect(sentAudits(ctx)).resolves.toEqual([]);
  });

  it("returns a safe error and logs only the kind and error class", async () => {
    const ctx = await person("Failure");
    const providerError = Object.assign(
      new Error("Could not deliver private body to learner@example.com"),
      { code: "E_DELIVERY_FAILED" },
    );
    const { env } = fakeEnv("https://my.lymi.app", vi.fn().mockRejectedValue(providerError));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendTransactionalEmail(ctx, env, {
        kind: "test",
        to: "learner@example.com",
        language: "en",
      }),
    ).rejects.toEqual(
      new ServiceError("unavailable", "Couldn’t send the email. Try again in a moment."),
    );
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "transactional_email_failed",
        kind: "test",
        errorClass: "delivery",
      }),
    );
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain("learner@example.com");
    expect(logged).not.toContain("private body");
    await expect(sentAudits(ctx)).resolves.toEqual([]);
  });

  it("keeps an unmapped provider code without logging the provider message", async () => {
    const ctx = await person("ProviderCode");
    const providerError = Object.assign(new Error("Private provider detail"), {
      code: "E_PROVIDER_NEW_FAILURE",
    });
    const { env } = fakeEnv("https://my.lymi.app", vi.fn().mockRejectedValue(providerError));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendTransactionalEmail(ctx, env, {
        kind: "test",
        to: "learner@example.com",
        language: "en",
      }),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "transactional_email_failed",
        kind: "test",
        errorClass: "E_PROVIDER_NEW_FAILURE",
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("Private provider detail");
  });
});
