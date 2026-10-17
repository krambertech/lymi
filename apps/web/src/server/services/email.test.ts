import { trayHue } from "@lymi/core/catalog";
import { eq } from "@lymi/core/db";
import { hues } from "@lymi/design";
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
        "Test email from Lymi\n\nThis test confirms that Lymi can send account emails.\n\nYou don’t need to do anything.\n\nLymi",
      ],
      uk: [
        "Тестовий лист від Lymi",
        "Тестовий лист від Lymi\n\nЦей тест підтверджує, що Lymi може надсилати листи щодо акаунта.\n\nНічого робити не потрібно.\n\nLymi",
      ],
      ru: [
        "Тестовое письмо от Lymi",
        "Тестовое письмо от Lymi\n\nЭтот тест подтверждает, что Lymi может отправлять письма об аккаунте.\n\nНичего делать не нужно.\n\nLymi",
      ],
    } as const;

    for (const [language, [subject, text]] of Object.entries(expected)) {
      const message = await renderTransactionalEmail("test", language);
      expect(message).toMatchObject({ kind: "test", language, subject, text });
      expect(message.html).toContain(`lang="${language}"`);
      expect(message.html).toContain(`<title>${subject}</title>`);
      expect(message.html).toContain("https://my.lymi.app/brand/email/lantern-light.png");
    }
  });

  it("points images and the footer at the origins it is sent from", async () => {
    const message = await renderTransactionalEmail(
      "test",
      "en",
      {},
      { productUrl: "http://localhost:5241", siteUrl: "http://localhost:4321" },
    );
    expect(message.html).toContain("http://localhost:5241/brand/email/lantern-dark.png");
    expect(message.html).toContain('href="http://localhost:4321"');
  });

  it("puts a link kind's link behind its button and repeats it to paste", async () => {
    const url = "https://my.lymi.app/api/auth/reset-password/token?callbackURL=%2F";
    const message = await renderTransactionalEmail("reset-password", "en", { url });
    expect(message.text).toContain(`Set a new password for your Lymi account:\n\n${url}`);
    expect(
      message.html.match(/href="https:\/\/my\.lymi\.app\/api\/auth\/reset-password/g),
    ).toHaveLength(2);
    expect(message.html).toContain(">Set a new password<");
  });

  it("opens an invitation on the deck's cover in its hue, naming the language and cards", async () => {
    const message = await renderTransactionalEmail("deck-invitation", "en", {
      url: "https://my.lymi.app/join/token",
      invitation: {
        deckId: "deck-1",
        deckName: "Estonian A2",
        ownerName: "Maria Kask",
        cards: 214,
        language: "et",
      },
    });
    expect(message.subject).toBe("Maria Kask shared a deck with you");
    expect(message.html).toContain("Estonian · 214 cards");
    expect(message.html).toContain(">MK<");
    expect(message.html).toContain("Maria Kask invited you to study this deck on Lymi.");
    expect(message.html).toContain(hues.tray.light[trayHue("deck-1")] ?? "the deck's tray colour");
    expect(message.text).toMatch(
      /^Estonian A2\nEstonian · 214 cards\n\nMaria Kask invited you to study this deck on Lymi\.\n\nYou review/,
    );
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
    expect(message.html).toContain('lang="en"');
    expect(message.html).toContain("Screen: /today\n");
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
        html: expect.stringContaining("This test confirms that Lymi can send account emails."),
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

  it("sends through Resend once its key is set, tagging the kind and leaving the binding alone", async () => {
    const ctx = await person("Resend");
    const binding = vi.fn();
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "re_1" }), { status: 200 }));
    await expect(
      sendTransactionalEmail(
        ctx,
        {
          PRODUCT_URL: "https://my.lymi.app",
          EMAIL: { send: binding },
          RESEND_API_KEY: "re_key",
        } as never,
        { kind: "test", to: "learner@example.com", language: "en" },
      ),
    ).resolves.toEqual({ delivery: "provider" });

    expect(binding).not.toHaveBeenCalled();
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer re_key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: "Lymi <notifications@lymi.app>",
      to: ["learner@example.com"],
      reply_to: "hello@lymi.app",
      subject: "Test email from Lymi",
      tags: [{ name: "kind", value: "test" }],
    });
  });

  it("maps a Resend refusal to a safe error class", async () => {
    const ctx = await person("ResendRefused");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ name: "daily_quota_exceeded", message: "private" }), {
        status: 429,
      }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      sendTransactionalEmail(
        ctx,
        {
          PRODUCT_URL: "https://my.lymi.app",
          EMAIL: { send: vi.fn() },
          RESEND_API_KEY: "re_key",
        } as never,
        { kind: "test", to: "learner@example.com", language: "en" },
      ),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(log).toHaveBeenCalledWith(
      JSON.stringify({
        event: "transactional_email_failed",
        kind: "test",
        errorClass: "daily_limit",
      }),
    );
  });
});
