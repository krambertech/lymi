export const title = "Smart add";
export const start = "/library";

const line = (event) => `${JSON.stringify(event)}\n`;
const term = {
  id: "t1",
  term: "il cane",
  kind: "word",
  meaning: "the dog",
  gloss: "the dog",
  pronunciation: null,
  handwritten: false,
  heading: null,
  seen: "il cane",
  keep: null,
  ticked: true,
  existing: null,
  formOf: null,
};
const question = {
  id: "q1",
  question: "Which words should become cards?",
  options: [{ label: "All of them", drop: [] }],
  default: 0,
};

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const resetsAt = new Date(Date.now() + 3 * 3_600_000).toISOString();
  let used = 0;
  let answerFails = true;
  await page.route("**/api/lesson-reads/access", (route) =>
    route.fulfill({ json: { allowed: true, daily: { limit: 5, used, resetsAt } } }),
  );
  await page.route("**/api/lesson-reads", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: line({ type: "term", term }) + line({ type: "questions", questions: [question] }),
    }),
  );
  await page.route("**/api/lesson-reads/answers", (route) =>
    route.fulfill(
      answerFails ? { status: 500, json: { error: "failed" } } : { json: { drop: [] } },
    ),
  );

  const dialog = page.getByRole("dialog", { name: /^Smart add/ });
  const findTerms = dialog.getByRole("button", { name: "Find terms" });
  const showTerms = dialog.getByRole("button", { name: "Show terms" });
  const open = async () => {
    await page.goto(`/library/${deck.id}`);
    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    await page.getByRole("menuitem", { name: /^Smart add/ }).click();
    await expect(findTerms).toBeVisible();
  };

  await step("Find terms on an empty lesson says what is missing", async () => {
    await open();
    await findTerms.click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "Add a photo or PDF of the lesson, or paste its text.",
    );
    return { disabled: await findTerms.isDisabled() };
  });

  await step("Read a pasted lesson up to its question", async () => {
    await dialog.getByRole("button", { name: /^Text/ }).click();
    await dialog.getByRole("textbox", { name: "Lesson text" }).fill("il cane, the dog");
    await dialog.getByRole("button", { name: "Add text" }).click();
    await findTerms.click();
    await dialog.getByRole("textbox", { name: "Something else" }).fill("Only nouns");
    return question;
  });

  await step("A failed answer check says so", async () => {
    await showTerms.click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(showTerms).not.toHaveAttribute("aria-busy", "true");
    return { alert: await dialog.getByRole("alert").innerText() };
  });

  await step("Trying again reaches the list and adds the card", async () => {
    answerFails = false;
    await showTerms.click();
    await dialog.getByRole("button", { name: "Add 1 card" }).click();
    await expect(page.getByText(/^Added 1 card to Lezione 12/)).toBeVisible();
    const { cards } = await api(`/api/cards?term=${encodeURIComponent(term.term)}`);
    expect(cards.map((card) => card.deckId)).toContain(deck.id);
    return { added: term.term };
  });

  await step("At the daily limit Find terms stays focusable and names the notice", async () => {
    used = 5;
    await open();
    await expect(findTerms).toHaveAttribute("aria-disabled", "true");
    await expect(findTerms).toHaveAccessibleDescription(/today’s 5 lessons/);
    await findTerms.focus();
    await expect(findTerms).toBeFocused();
    return { used };
  });
}
