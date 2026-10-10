import { signInAsTestLearner, startAsTestLearner } from "./auth";
import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

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
  await page.getByTestId("learner-menu").filter({ visible: true }).click();
  await expect(page.getByRole("menuitem", { name: "Docs" })).toHaveAttribute(
    "href",
    `${e2eSiteUrl}/docs`,
  );
});

test("a learner can capture and review a new word", async ({ page }, testInfo) => {
  const notes = "++reflexive++ ~~old form~~ [Dictionary](https://example.com)";
  await test.step("sign in to a disposable account", async () => {
    await startAsTestLearner(page, testInfo, "core-learning");
  });

  let deckId = "";
  await test.step("prepare a deck through the authenticated API", async () => {
    const response = await page.request.post("/api/decks", {
      data: { name: "Italian lesson", defaultLanguage: "it" },
    });
    expect(response.ok()).toBeTruthy();
    deckId = ((await response.json()) as { id: string }).id;
    await page.goto(`/library/${deckId}`);

    await expect(page.getByRole("heading", { name: "Italian lesson", exact: true })).toBeVisible();
  });

  await test.step("add a complete card", async () => {
    await page.getByRole("button", { name: "Add card" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add a card" });
    await expect(dialog).toBeVisible();
    await page.getByRole("textbox", { name: "Term", exact: true }).fill("sbrigarsi");
    await page.getByRole("textbox", { name: "Meaning", exact: true }).fill("to hurry up");
    const phone = testInfo.project.name === "webkit";
    await dialog
      .getByRole("button", { name: phone ? "Notes" : "More fields", exact: true })
      .click();
    const notesPanel = phone ? page.getByRole("dialog", { name: "Notes", exact: true }) : dialog;
    await notesPanel.getByRole("textbox", { name: "Notes", exact: true }).fill(notes);
    if (phone) await notesPanel.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Add to Italian lesson", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText(
      "Added “sbrigarsi”",
    );
    await expect(page.getByText("sbrigarsi", { exact: true })).toBeVisible();
    await expect(page.getByText("to hurry up", { exact: true })).toBeVisible();
  });

  await test.step("saved notes render on the card page", async () => {
    await page.getByRole("button", { name: /sbrigarsi.*to hurry up/ }).click();
    await page.reload();
    await expect(page.locator("u").filter({ hasText: "reflexive" })).toBeVisible();
    await expect(page.locator("s").filter({ hasText: "old form" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dictionary", exact: true })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    await page.goto(`/library/${deckId}`);
  });

  await test.step("review and persist the result", async () => {
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await expect(page.getByLabel("Recognition card for sbrigarsi")).toBeVisible();
    // Press the corner: on a phone the card's centre can land on the pronunciation button.
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(page.getByText("to hurry up", { exact: true })).toBeVisible();
    await expect(
      page.locator("u").filter({ hasText: "reflexive" }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.locator("s").filter({ hasText: "old form" }).filter({ visible: true }),
    ).toBeVisible();
    const dictionary = page.getByRole("link", { name: "Dictionary", exact: true });
    await expect(dictionary).toHaveAttribute("target", "_blank");
    await page
      .context()
      .route("https://example.com/", (route) => route.fulfill({ body: "Dictionary" }));
    const opened = page.waitForEvent("popup");
    await dictionary.click();
    const tab = await opened;
    await expect(tab).toHaveURL("https://example.com/");
    await tab.close();
    await expect(page.getByRole("button", { name: "Good" })).toBeVisible();
    await page.getByRole("button", { name: "Good" }).click();

    await expect(page.getByRole("heading", { name: "You’re done for today" })).toBeVisible();
    await page.reload();
    // The day keeps its outcome: everything was reviewed, which is not the same as nothing due.
    await expect(page.getByRole("heading", { name: "You’re done for today" })).toBeVisible();
  });
});
