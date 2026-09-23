import { startAsTestLearner } from "./auth";
import { expect, type Locator, type Page, test } from "./test";

function sheet(page: Page, title: string): Locator {
  return page.locator('[role="dialog"], dialog').filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

/** Every write the outbox sends, so reads still reach the server while writes cannot. */
const WRITES = /\/api\/(decks|cards)(\/[^?]*)?(\?.*)?$/;
async function cutWrites(page: Page) {
  await page.route(WRITES, (route) =>
    route.request().method() === "GET" ? route.fallback() : route.abort("internetdisconnected"),
  );
}

/**
 * A deck and a card made while nothing reaches the server show at once, outlive a reload, and
 * land in the order they were made once the connection returns: the card's deck first.
 */
test("a deck and card made offline survive a reload and reach the server", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await startAsTestLearner(page, testInfo, "writes-offline", "/library");
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  const deckName = `Offline ${testInfo.project.name}`;
  const term = "sbrigarsi";

  await cutWrites(page);
  await test.step("make a deck and a card in it with the writes cut off", async () => {
    await page.getByRole("button", { name: "Add", exact: true }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "New deck", exact: true }).click();
    const newDeck = sheet(page, "New deck");
    await newDeck.getByRole("textbox", { name: "Name", exact: true }).fill(deckName);
    await newDeck.getByRole("button", { name: "Create deck", exact: true }).click();
    await expect(page).toHaveURL(/\/library\/[^/]+$/);
    await expect(page.getByRole("heading", { name: deckName, exact: true })).toBeVisible();

    await page.keyboard.press("n");
    const addCard = sheet(page, "Add a card");
    await addCard.getByRole("textbox", { name: "Term", exact: true }).fill(term);
    await addCard.getByRole("textbox", { name: "Meaning", exact: true }).fill("to hurry up");
    await addCard.getByRole("button", { name: `Add to ${deckName}`, exact: true }).click();
    await expect(addCard).toBeHidden();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText(
      "saved on this device",
    );
    await expect(page.getByText(term, { exact: true })).toBeVisible();
  });

  await test.step("both are still there after a reload that cannot send them", async () => {
    await page.reload();
    await expect(page.getByRole("heading", { name: deckName, exact: true })).toBeVisible();
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    const decks = (await (await page.request.get("/api/decks")).json()) as { name: string }[];
    expect(decks.map((deck) => deck.name)).not.toContain(deckName);
  });

  await test.step("they reach the server once the connection returns", async () => {
    await page.unroute(WRITES);
    await page.reload();
    await expect
      .poll(async () => {
        const decks = (await (await page.request.get("/api/decks")).json()) as {
          id: string;
          name: string;
          total: number;
        }[];
        return decks.find((deck) => deck.name === deckName)?.total ?? -1;
      })
      .toBe(1);
    await expect
      .poll(() =>
        page.evaluate(
          () => Object.keys(window.localStorage).filter((k) => k.startsWith("lymi-writes:")).length,
        ),
      )
      .toBe(0);
    await expect(page.getByText(term, { exact: true })).toBeVisible();
  });
});
