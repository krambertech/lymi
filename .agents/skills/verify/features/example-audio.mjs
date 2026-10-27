export const title = "Example audio";
export const persona = "long";
export const start = "/library";

export default async function drive({ page, step, api, expect }) {
  const main = page.getByRole("main");

  await step("A card's example has its own play control beside the term's", async () => {
    await main.getByRole("link", { name: /^Lange Karten/ }).click();
    await main.getByRole("button", { name: /der Hund/ }).click();
    await expect(page.getByRole("button", { name: "Say der Hund", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play example", exact: true })).toBeVisible();
  });

  await step("A press asks for the example's clip and plays it or says why not", async () => {
    const asked = page.waitForResponse((response) =>
      /\/api\/audio\/[^/]+\/example\?/.test(response.url()),
    );
    await page.getByRole("button", { name: "Play example", exact: true }).focus();
    await page.keyboard.press("Enter");
    const response = await asked;
    // A server with no speech provider answers 503, and the control says so rather than playing.
    if (response.ok()) {
      await expect(page.getByRole("button", { name: "Replay example", exact: true })).toBeVisible();
    } else {
      // The tip shows over the control and is read out from its own alert.
      await expect(page.getByRole("alert")).toHaveText(
        "Couldn’t play the example. Try again in a moment.",
      );
    }
    return { status: response.status(), state: await api("/api/dev/state") };
  });

  await step("In review, a click on the example's translation plays the example", async () => {
    await page.goto("/today");
    await main.getByRole("link", { name: /^Review/ }).click();
    const translation = page.getByText("The dog is sleeping.", { exact: true });
    // The deck's six cards come in the draw's order, so grade until the one with a translation shows.
    for (let card = 0; card < 12; card++) {
      await page
        .getByRole("button", { name: "Reveal the card" })
        .click({ position: { x: 24, y: 24 } });
      if (await translation.isVisible()) break;
      await page.getByRole("button", { name: /^Good/ }).click();
    }
    await expect(page.getByRole("button", { name: "Play example", exact: true })).toBeVisible();
    // A tap within 400 ms of the reveal is the reveal's own second tap, which review ignores.
    await page.waitForTimeout(500);
    const asked = page.waitForResponse((response) =>
      /\/api\/audio\/[^/]+\/example\?/.test(response.url()),
    );
    await translation.click({ force: true });
    const response = await asked;
    return { status: response.status() };
  });
}
