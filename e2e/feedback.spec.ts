import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

/**
 * Writing to Lymi without leaving it. The message goes to the operator inbox, so the outbox is
 * read back by the learner's own address, which the send carries as its reply-to.
 */
test("a learner can send feedback from the learner menu", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "feedback", "/today");
  const state = (await (await page.request.get("/api/dev/state")).json()) as {
    user: { name: string; email: string };
  };
  const firstName = state.user.name.split(" ")[0] ?? state.user.name;

  await test.step("open the form from the learner menu", async () => {
    await page.getByRole("button", { name: firstName, exact: true }).click();
    await page.getByRole("menuitem", { name: "Send feedback", exact: true }).click();
  });

  const dialog = page.getByRole("dialog", { name: "Send feedback" });
  await test.step("write a note and send it", async () => {
    await dialog.getByRole("button", { name: "Idea", exact: true }).click();
    await dialog
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("Let a deck hold a picture.");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
  });

  const sent = page.getByRole("dialog", { name: "Feedback sent" });
  await expect(sent.getByText("A reply comes to your email.", { exact: false })).toBeVisible();

  await sent.getByRole("button", { name: "Close", exact: true }).click();
  await expect(sent).toBeHidden();

  const outbox = await page.request.post("/api/dev/outbox", { data: { to: state.user.email } });
  expect(outbox.ok()).toBe(true);
  await expect(outbox.json()).resolves.toMatchObject({
    message: {
      kind: "feedback",
      to: "hello@lymi.app",
      replyTo: state.user.email,
      subject: "Lymi feedback: Idea",
      text: expect.stringContaining("Let a deck hold a picture."),
    },
  });
});
