export const title = "Import from Quizlet";
export const start = "/import/quizlet";

export default async function drive({ page, step, expect }) {
  const main = page.getByRole("main");
  const text = main.getByRole("textbox", { name: "Your set’s text" });
  const proceed = main.getByRole("button", { name: /^Continue/ });

  await step("Continue with nothing pasted asks for the set", async () => {
    await expect(text).toBeVisible();
    await proceed.click();
    await expect(main.getByRole("alert")).toHaveText(
      "Paste your set’s text or choose a .txt file first.",
    );
    await expect(text).toBeFocused();
    return { disabled: await proceed.isDisabled() };
  });

  await step("Continue on text with no cards names the separators", async () => {
    await text.fill("one side only");
    await expect(main.getByRole("heading", { name: "0 cards", exact: true })).toBeVisible();
    await proceed.click();
    await expect(main.getByRole("alert")).toHaveText(
      "No cards found in this text. Check the separators.",
    );
    return { cards: 0 };
  });

  await step("A readable set moves on", async () => {
    await text.fill("der Hund\tthe dog\ndie Katze\tthe cat");
    await expect(main.getByRole("alert")).toHaveCount(0);
    await main.getByRole("button", { name: "Continue with 2 cards", exact: true }).click();
    await expect(text).toBeHidden({ timeout: 30_000 });
    return { cards: 2 };
  });
}
