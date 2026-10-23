export const title = "Example translation";
export const persona = "long";
export const start = "/library";

export default async function drive({ page, step, api, expect }) {
  await step("Typing an example and its translation keeps the caret where it is", async () => {
    await page.keyboard.press("n");
    const sheet = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("textbox", { name: "Term", exact: true }) });
    await sheet.getByRole("textbox", { name: "Term", exact: true }).fill("die Katze");
    await sheet.getByRole("button", { name: "Example", exact: true }).click();
    const example = sheet.getByRole("textbox", { name: "Example", exact: true });
    await example.click();
    // One key at a time: the translation's chin appears with the first character.
    await page.keyboard.type("Die Katze schläft.", { delay: 20 });
    await expect(example).toBeFocused();
    await expect(example).toHaveValue("Die Katze schläft.");
    const translation = sheet.getByRole("textbox", { name: "Translation", exact: true });
    await translation.click();
    await page.keyboard.type("The cat sleeps.", { delay: 20 });
    await expect(translation).toBeFocused();
    await expect(translation).toHaveValue("The cat sleeps.");
    await page.keyboard.press("Escape");
    await page.goto("/library");
  });

  const main = page.getByRole("main");
  const decks = await api("/api/decks");
  const deck = decks.find((d) => d.name === "Lange Karten");
  const rows = await api(`/api/decks/${deck.id}/cards`);
  const hund = (rows.items ?? rows.cards ?? rows)
    .map((row) => row.card ?? row)
    .find((c) => c.term === "der Hund");
  const stored = () => api(`/api/cards/${hund.id}`);

  await step("The card page shows the example's translation after it", async () => {
    await main.getByRole("link", { name: /^Lange Karten/ }).click();
    await main.getByRole("button", { name: /der Hund/ }).click();
    await expect(page.getByText("Der Hund schläft.", { exact: true })).toBeVisible();
    await expect(page.getByText("(The dog is sleeping.)", { exact: true })).toBeVisible();
    const card = await stored();
    expect(card).toMatchObject({
      exampleTranslation: "The dog is sleeping.",
      exampleTranslationStale: false,
    });
    return { card: hund.id, exampleTranslation: card.exampleTranslation };
  });

  await step("A new example keeps the learner's translation and says it is stale", async () => {
    await page.getByRole("button", { name: "Edit card", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("textbox", { name: "Example", exact: true }).fill("Der Hund bellt laut.");
    await expect(sheet.getByRole("textbox", { name: "Translation", exact: true })).toHaveValue(
      "The dog is sleeping.",
    );
    await sheet.getByRole("button", { name: /^Save/ }).click();
    await expect(sheet).toBeHidden();
    await expect(
      page.getByText("Translated from an earlier example. Edit it to match.", { exact: true }),
    ).toBeVisible();
    const card = await stored();
    expect(card).toMatchObject({
      example: "Der Hund bellt laut.",
      exampleTranslation: "The dog is sleeping.",
      exampleTranslationSource: "manual",
      exampleTranslationStale: true,
    });
    return card;
  });

  await step("Rewriting the translation makes it current again", async () => {
    await page.getByRole("button", { name: "Edit card", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await expect(
      sheet.getByText("Translated from an earlier example.", { exact: true }),
    ).toBeVisible();
    await sheet
      .getByRole("textbox", { name: "Translation", exact: true })
      .fill("The dog barks loudly.");
    await sheet.getByRole("button", { name: /^Save/ }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("(The dog barks loudly.)", { exact: true })).toBeVisible();
    await expect(page.getByText(/Translated from an earlier example/)).toHaveCount(0);
    const card = await stored();
    expect(card).toMatchObject({
      exampleTranslation: "The dog barks loudly.",
      exampleTranslationStale: false,
    });
    return card;
  });

  await step("An example over 250 characters is refused with its reason", async () => {
    await page.getByRole("button", { name: "Edit card", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await sheet
      .getByRole("textbox", { name: "Example", exact: true })
      .fill("Der Hund. ".repeat(30));
    await sheet.getByRole("button", { name: /^Save/ }).click();
    await expect(sheet.getByText("Keep the example under 250 characters.")).toBeVisible();
    await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await stored()).example).toBe("Der Hund bellt laut.");
  });
}
