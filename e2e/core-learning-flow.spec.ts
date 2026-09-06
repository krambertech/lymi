import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

test("a protected deep link survives sign-in", async ({ page }, testInfo) => {
  await page.goto("/library?from=reminder&deck=italian");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Flibrary%3Ffrom%3Dreminder%26deck%3Ditalian$/);

  await signInAsTestLearner(page, testInfo, "deep-link", "/library?from=reminder&deck=italian");
  await expect(page).toHaveURL(/\/library\?from=reminder&deck=italian$/);
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();

  await page.goto("/you");
  await expect(page.getByRole("link", { name: "Lymi website" })).toHaveAttribute(
    "href",
    "http://localhost:4174/",
  );
});

test("a learner can capture and review a new word", async ({ page }, testInfo) => {
  await test.step("sign in to a disposable account", async () => {
    await signInAsTestLearner(page, testInfo, "core-learning");
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
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.getByRole("textbox", { name: "Word or phrase", exact: true }).fill("sbrigarsi");
    await page.getByRole("textbox", { name: "Meaning", exact: true }).fill("to hurry up");
    await page.getByRole("button", { name: "Add to Italian lesson", exact: true }).click();

    await expect(page.getByRole("status")).toContainText("Added “sbrigarsi”");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
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
