import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

test("a protected deep link survives sign-in", async ({ page }, testInfo) => {
  await page.goto("/library?from=reminder&deck=italian");
  await expect(page.getByRole("heading", { name: "Sign in to Lymi" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/login\?returnTo=%2Flibrary%3Ffrom%3Dreminder%26deck%3Ditalian$/);

  await signInAsTestLearner(page, testInfo, "deep-link", "/library?from=reminder&deck=italian");
  await expect(page).toHaveURL(/\/library\?from=reminder&deck=italian$/);
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();

  // The docs link is the one place the product points at the public site's configured origin.
  // Today carries the learner menu on both machines: the rail on desktop, the avatar on the phone.
  await page.goto("/today");
  await page.getByRole("button", { name: "Dev", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Docs" })).toHaveAttribute(
    "href",
    "http://localhost:4174/docs",
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
    await page.getByRole("button", { name: "Add card" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.getByRole("textbox", { name: "Term", exact: true }).fill("sbrigarsi");
    await page.getByRole("textbox", { name: "Meaning", exact: true }).fill("to hurry up");
    await page.getByRole("button", { name: "Add to Italian lesson", exact: true }).click();

    await expect(page.getByRole("status")).toContainText("Added “sbrigarsi”");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByText("sbrigarsi", { exact: true })).toBeVisible();
    await expect(page.getByText("to hurry up", { exact: true })).toBeVisible();
  });

  await test.step("review and persist the result", async () => {
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Recognition card for sbrigarsi")).toBeVisible();
    // Press the corner: on a phone the card's centre can land on the pronunciation button.
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(page.getByText("to hurry up", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Good" }).click();

    await expect(page.getByRole("heading", { name: "Nothing left today" })).toBeVisible();
    await page.reload();
    // The day keeps its outcome: everything was reviewed, which is not the same as nothing due.
    await expect(page.getByRole("heading", { name: "Nothing left today" })).toBeVisible();
  });
});
