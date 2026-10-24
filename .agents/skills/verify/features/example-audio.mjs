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
}
