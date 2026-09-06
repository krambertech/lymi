import { expect, test } from "@playwright/test";

test("a learner can capture and review a new word", async ({ page }, testInfo) => {
  const email = `e2e-${testInfo.project.name}-${testInfo.retry}@lymi.local`;

  await test.step("create a local account", async () => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Dev sign-in" }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("lymi-e2e-password");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  });

  let deckId = "";
  await test.step("prepare a deck through the authenticated API", async () => {
    const response = await page.request.post("/api/decks", {
      data: { name: "Italian lesson", defaultLanguage: "it" },
    });
    expect(response.ok()).toBeTruthy();
    deckId = ((await response.json()) as { id: string }).id;
    await page.goto(`/library/${deckId}`);

    await expect(page.getByRole("heading", { name: "Italian lesson" })).toBeVisible();
  });

  await test.step("add a complete card", async () => {
    await page.getByRole("button", { name: "Add word" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add a word or phrase" });
    await dialog.getByRole("textbox", { name: "Word or phrase" }).fill("sbrigarsi");
    await dialog.getByRole("textbox", { name: "Meaning" }).fill("to hurry up");
    await dialog.getByRole("button", { name: "Add to Italian lesson" }).click();

    await expect(dialog.getByRole("status")).toContainText("Added “sbrigarsi”");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("cell", { name: "sbrigarsi", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "to hurry up", exact: true })).toBeVisible();
  });

  await test.step("review and persist the result", async () => {
    await page.getByRole("button", { name: "Review 1 due" }).click();
    await expect(page.getByLabel("Recognition card for sbrigarsi")).toBeVisible();
    await page.getByRole("button", { name: "Tap card to reveal" }).click();
    await expect(page.getByText("to hurry up", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Good" }).click();

    await expect(page.getByRole("heading", { name: "That’s the lot" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Nothing due" })).toBeVisible();
  });
});
