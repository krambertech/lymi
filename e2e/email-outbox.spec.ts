import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

test("a local account email stays in the outbox and can be read by address", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "email-outbox");
  const state = (await (await page.request.get("/api/dev/state")).json()) as {
    user: { email: string };
  };

  const sent = await page.request.post("/api/email/test", {
    data: { to: state.user.email, language: "en" },
  });
  expect(sent.ok()).toBe(true);

  const response = await page.request.post("/api/dev/outbox", {
    data: { to: state.user.email },
  });
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    message: {
      kind: "test",
      to: state.user.email,
      language: "en",
      subject: "Test email from Lymi",
      text: expect.stringContaining("Lymi can send account emails"),
    },
  });
});

test("a signed-in non-operator cannot send an account email", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "email-non-operator");

  const response = await page.request.post("/api/email/test", {
    data: { to: "learner@example.com", language: "en" },
  });

  expect(response.status()).toBe(403);
});
