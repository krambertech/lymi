import { signInAsTestLearner } from "./auth";
import { expect, test } from "./test";

/**
 * Nine consecutive backdated days, each meeting a goal of one review. A run counted from a
 * seven-day window would say 7.
 */
test("the streak is exact beyond the seven days the lights show", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signInAsTestLearner(page, testInfo, "core-learning");
  const post = async (path: string, data: unknown) => {
    const res = await page.request.post(path, { data });
    expect(res.ok(), `${path} failed with ${res.status()}`).toBeTruthy();
    return res.json();
  };
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const put = async (path: string, data: unknown) => {
    const res = await page.request.put(path, { data });
    expect(res.ok(), `${path} failed with ${res.status()}`).toBeTruthy();
  };
  await put("/api/settings/timezone", { mode: "manual", timezone: zone });
  const goal = await page.request.patch("/api/settings", { data: { dailyGoal: 1 } });
  expect(goal.ok()).toBeTruthy();
  const deck = (
    (await post("/api/decks", { name: "Lesson 14", defaultLanguage: "it" })) as { id: string }
  ).id;
  await post("/api/cards/batch", {
    cards: Array.from({ length: 12 }, (_, i) => ({
      deckId: deck,
      term: `parola ${i}`,
      meaning: `m${i}`,
    })),
  });
  const queue = (await (await page.request.get("/api/review/queue")).json()) as {
    items: { card: { id: string }; direction: string }[];
  };
  for (let back = 8; back >= 0; back--) {
    const when = new Date();
    when.setDate(when.getDate() - back);
    when.setHours(19, 30, 0, 0);
    const item = queue.items[back % queue.items.length];
    if (!item) throw new Error("no card");
    await post("/api/review/grade", {
      cardId: item.card.id,
      direction: item.direction,
      rating: 3,
      reviewedAt: when.toISOString(),
    });
  }
  const hist = (await (
    await page.request.get(`/api/review/history?days=7&tz=${new Date().getTimezoneOffset()}`)
  ).json()) as { days: number[]; streak: number };
  expect(hist.days).toHaveLength(7);
  expect(hist.streak).toBe(9);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/today");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // On the phone, Today's streak card is the button.
  const card = page.getByRole("button", { name: /^Streak: 9 days in a row\. / });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img", { name: /Reviewed on 7 of the last 7 days: / })).toBeVisible();

  const streak = (await (
    await page.request.get(`/api/stats/streak?tz=${encodeURIComponent(zone)}`)
  ).json()) as { current: number; longest: number; today: { goal: number; outcome: string } };
  // The account is shared with the core flow, which may already have finished today at its own goal.
  expect(streak).toMatchObject({ current: 9, longest: 9 });
  expect(["goal_met", "exhausted"]).toContain(streak.today.outcome);

  // Today counted either way: at its goal, or with nothing left to review.
  const finished = /Daily goal reached\.|Nothing left today\./;

  // The phone opens the streak as a place rising over the whole screen.
  await card.click();
  const modal = page.getByRole("dialog");
  await expect(page).toHaveURL(/[?&]streak=true/);
  await expect(modal.getByText("Longest streak")).toBeVisible();
  // Measured once the entrance has settled, since it starts slightly scaled.
  await expect.poll(async () => (await modal.boundingBox())?.width).toBe(390);
  // On a phone the modal is the whole screen, so a tap on its empty space is not a backdrop tap.
  await modal.click({ position: { x: 195, y: 820 } });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Change daily goal" }).click();
  await modal.getByText("Keen").click();
  await expect(modal.getByText("Saved")).toBeVisible();
  const settings = (await (await page.request.get("/api/settings")).json()) as {
    dailyGoal: number;
  };
  expect(settings.dailyGoal).toBe(50);
  // Today was already met, so the higher goal applies from tomorrow.
  await modal.getByRole("button", { name: "Back to streak" }).click();
  await expect(modal.getByText(finished)).toBeVisible();
  await modal.getByRole("button", { name: "Close" }).click();
  await expect(modal).toBeHidden();
  await expect(page).not.toHaveURL(/streak=/);

  // A wide window with a fine pointer opens the same panel centred; a touch device keeps the whole screen.
  await page.setViewportSize({ width: 1280, height: 820 });
  // The rail's pill, since the card on the page carries the same name.
  const pill = page
    .getByRole("complementary")
    .getByRole("button", { name: "Streak: 9 days in a row", exact: true });
  await pill.click();
  await expect(modal.getByText(finished)).toBeVisible();
  await expect
    .poll(async () => (await modal.boundingBox())?.width)
    .toBe(testInfo.project.use.hasTouch ? 1280 : 400);
  // The streak is a place, so a reload keeps it open and Back closes it.
  await page.reload();
  await expect(modal.getByText(finished)).toBeVisible();
  await page.goBack();
  await expect(modal).toBeHidden();
  await expect(page).not.toHaveURL(/streak=/);

  // Opening and closing change only the overlay, so the page under it keeps its scroll. A touch
  // drawer locks scroll differently, so the fine pointer proves it.
  if (!testInfo.project.use.hasTouch) {
    await page.setViewportSize({ width: 1280, height: 480 });
    const top = await page.evaluate(() => {
      window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) / 2);
      return window.scrollY;
    });
    expect(top).toBeGreaterThan(0);
    await pill.click();
    await expect(modal.getByText(finished)).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(top);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(top);
  }
});
