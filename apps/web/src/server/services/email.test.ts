import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bindings } from "../env";
import { ServiceError } from "./context";
import {
  clearLocalEmailOutbox,
  latestLocalEmail,
  renderTransactionalEmail,
  sendTransactionalEmail,
} from "./email";

function fakeEnv(productUrl: string, send = vi.fn().mockResolvedValue({ messageId: "message-1" })) {
  return {
    env: { PRODUCT_URL: productUrl, EMAIL: { send } } as Pick<Bindings, "PRODUCT_URL" | "EMAIL">,
    send,
  };
}

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
      expect(message.html).toContain(
        `<p>${subject === "Test email from Lymi" ? "Hello," : text.split("\n")[0]}</p>`,
      );
    }
  });

  it("falls back to English for an unknown language", async () => {
    await expect(renderTransactionalEmail("test", "et")).resolves.toMatchObject({
      language: "en",
      subject: "Test email from Lymi",
    });
  });

  it("writes loopback sends to the outbox without touching the provider", async () => {
    const { env, send } = fakeEnv("http://127.0.0.1:4173");
    await expect(
      sendTransactionalEmail(env, { kind: "test", to: "Learner@Example.com", language: "uk" }),
    ).resolves.toEqual({ delivery: "outbox" });

    expect(send).not.toHaveBeenCalled();
    expect(latestLocalEmail("learner@example.com")).toMatchObject({
      kind: "test",
      language: "uk",
      to: "learner@example.com",
      subject: "Тестовий лист від Lymi",
    });
  });

  it("sends both bodies through the production binding with replies going to hello", async () => {
    const { env, send } = fakeEnv("https://my.lymi.app");
    await expect(
      sendTransactionalEmail(env, { kind: "test", to: "learner@example.com", language: "en" }),
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
  });

  it("returns a safe error and logs only the kind and error class", async () => {
    const providerError = Object.assign(
      new Error("Could not deliver private body to learner@example.com"),
      { code: "E_DELIVERY_FAILED" },
    );
    const { env } = fakeEnv("https://my.lymi.app", vi.fn().mockRejectedValue(providerError));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendTransactionalEmail(env, { kind: "test", to: "learner@example.com", language: "en" }),
    ).rejects.toEqual(
      new ServiceError("unavailable", "Couldn't send the email. Try again in a moment."),
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
  });
});
