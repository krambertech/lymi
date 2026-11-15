export const title = "Hint";
export const start = "/review";

const DRAFT = "A PONy crossing the bridge";

export default async function drive({ page, step, api, expect }) {
  const field = page.getByRole("textbox", { name: "Hint" });
  // Held until the step has seen the editor mid-draft, so the drafting state is not a race.
  let answer = async () => {};
  await page.route("**/hint-draft", (route) => {
    answer = () => route.fulfill({ json: { hint: DRAFT } });
  });

  await step("Reveal the first card and open its hint from the card menu", async () => {
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await page.getByRole("button", { name: "Card options" }).click();
    await page.getByRole("menuitem", { name: /^(Add|Edit) hint$/ }).click();
    await expect(field).toBeFocused();
    await field.fill("");
  });

  await step("Draft a hint: the button itself says it is drafting", async () => {
    await page.getByRole("button", { name: "Draft a hint" }).click();
    await expect(page.getByRole("button", { name: "Drafting a hint…" })).toBeVisible();
    await expect(page.getByText("Drafting a hint…")).toHaveCount(0);
    await answer();
    await expect(field).toHaveValue(DRAFT);
    await expect(page.getByRole("button", { name: "Another draft" })).toBeVisible();
    await expect(page.getByText("AI hint")).toHaveCount(0);
  });

  await step("Enter saves the draft and the card keeps it", async () => {
    const saved = page.waitForRequest(
      (r) => r.method() === "PATCH" && /\/api\/cards\/[^/]+$/.test(new URL(r.url()).pathname),
    );
    await field.press("Enter");
    const id = new URL((await saved).url()).pathname.split("/").pop();
    await expect(page.getByText(/^Hint (added|saved)$/)).toBeVisible();
    await expect.poll(async () => (await api(`/api/cards/${id}`)).hint).toBe(DRAFT);
    const { hint, hintSource } = await api(`/api/cards/${id}`);
    return { id, hint, hintSource };
  });
}
