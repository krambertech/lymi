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
const ARTICLE = "https://news.example.org/italiano/il-cane";
const articleTerm = {
  ...term,
  id: "a1",
  term: "abbaiare",
  meaning: null,
  gloss: "to bark",
  seen: "Il cane abbaia ogni mattina.",
  example: "Il cane abbaia ogni mattina.",
  at: null,
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
  let longArticle = false;
  const sent = [];
  await page.route("**/api/lesson-reads/access", (route) =>
    route.fulfill({ json: { allowed: true, daily: { limit: 5, used, resetsAt } } }),
  );
  await page.route("**/api/lesson-reads", (route) => {
    const form = route.request().postData() ?? "";
    sent.push(form);
    if (form.includes("youtu.be")) {
      return route.fulfill({
        status: 400,
        json: {
          error: "YouTube doesn't let apps read its captions.",
          code: "link_refused",
          issues: { refused: "youtube", title: "Italiano per principianti" },
        },
      });
    }
    if (form.includes('name="link"')) {
      if (longArticle && !form.includes('name="reads"')) {
        return route.fulfill({
          status: 409,
          json: {
            error: "This article counts as 2 reads.",
            code: "long_read",
            issues: { reads: "2", words: "16000", left: "5" },
          },
        });
      }
      return route.fulfill({
        contentType: "application/x-ndjson",
        body:
          line({ type: "source", title: "Il cane", url: ARTICLE }) +
          line({ type: "term", term: articleTerm }) +
          line({ type: "questions", questions: [] }),
      });
    }
    return route.fulfill({
      contentType: "application/x-ndjson",
      body: line({ type: "term", term }) + line({ type: "questions", questions: [question] }),
    });
  });
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
      "Add a photo or PDF of the lesson, paste its text or a link.",
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

  const addLink = async (link) => {
    await dialog.getByRole("button", { name: /^Link/ }).click();
    await dialog.getByRole("textbox", { name: "Article link" }).fill(link);
    await dialog.getByRole("button", { name: "Add link" }).click();
  };

  await step("A YouTube link names the video and offers to paste its transcript", async () => {
    await open();
    await addLink("https://youtu.be/abc123");
    await findTerms.click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "YouTube doesn’t let apps read the captions of “Italiano per principianti”. Paste its transcript instead.",
    );
    await dialog.getByRole("button", { name: "Paste the transcript" }).click();
    await expect(dialog.getByRole("textbox", { name: "Lesson text" })).toBeFocused();
    return { refused: "youtube" };
  });

  await step("A long article shows its count of lessons before it is read", async () => {
    longArticle = true;
    await open();
    await addLink(ARTICLE);
    await findTerms.click();
    await expect(dialog.getByText("This article counts as 2 lessons")).toBeVisible();
    await expect(dialog.getByText(/You have 5 lessons left today\./)).toBeVisible();
    await dialog.getByRole("button", { name: "Read as 2 lessons" }).click();
    await expect(dialog.getByText(articleTerm.example)).toBeVisible();
    const form = sent.at(-1) ?? "";
    expect(form).toContain('name="reads"');
    expect(form).not.toContain('name="text"');
    return { reads: 2 };
  });

  await step("A card from the article keeps its sentence and link", async () => {
    await dialog.getByRole("button", { name: "Add 1 card" }).click();
    await expect(
      page.getByText(/^Added 1 card to Lezione 12\. Lymi is filling in the rest\./),
    ).toBeVisible();
    const { cards } = await api(`/api/cards?term=${encodeURIComponent(articleTerm.term)}`);
    const card = cards.find((c) => c.deckId === deck.id);
    expect(card).toMatchObject({
      example: articleTerm.example,
      exampleSource: "lesson",
      source: ARTICLE,
    });
    return card;
  });

  await step("The card page shows the article as a link to its site", async () => {
    await page.goto(`/library/${deck.id}`);
    await page
      .getByRole("main")
      .getByRole("button", { name: /abbaiare/ })
      .click();
    const source = page.getByRole("link", { name: "news.example.org" });
    await expect(source).toBeVisible();
    await expect(source).toHaveAttribute("href", ARTICLE);
    return { href: await source.getAttribute("href") };
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
