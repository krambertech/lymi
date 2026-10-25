export const title = "Assistant offer";
export const start = "/today";

export default async function drive({ page, step, api, expect }) {
  // The card lives on the rail, which only a desktop has; the phone has the menu row alone.
  if ((page.viewportSize()?.width ?? 0) < 768) return;
  const offer = page.getByRole("region", { name: "Connect your AI assistant" });

  await step("With no app connected, the card offers each guide", async () => {
    const apps = await api("/api/connected-apps");
    expect(apps).toEqual([]);
    await expect(offer).toBeVisible();
    for (const name of ["Claude", "ChatGPT", "Gemini", "Grok"]) {
      await expect(
        offer.getByRole("link", { name: `Connect ${name}`, exact: true }),
      ).toHaveAttribute("href", new RegExp(`/docs/mcp/${name.toLowerCase()}$`));
    }
    await expect(offer.getByRole("link", { name: /^Connect your AI assistant/ })).toHaveAttribute(
      "href",
      /\/docs\/mcp$/,
    );
    await expect(offer.getByRole("button", { name: "Connect", exact: true })).toHaveCount(0);
    return apps;
  });

  await step("In a short window the places stay in view above the card", async () => {
    await page.setViewportSize({ width: 768, height: 520 });
    for (const place of ["Today", "Library", "Insights", "Explore"]) {
      const link = page.getByRole("navigation").getByRole("link", { name: place, exact: true });
      await expect(link).toBeInViewport({ ratio: 1 });
    }
    await expect(offer).toBeInViewport({ ratio: 1 });
    await page.setViewportSize({ width: 1280, height: 800 });
    return api("/api/connected-apps");
  });

  await step("Dismiss hides the card, and the learner menu keeps the row", async () => {
    await offer.hover();
    await offer.getByRole("button", { name: "Dismiss", exact: true }).click();
    await expect(offer).toBeHidden();
    const me = await api("/api/me");
    await page.getByRole("button", { name: me.name.split(" ")[0], exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Connect AI assistant" })).toBeVisible();
    await page.keyboard.press("Escape");
    return api("/api/connected-apps");
  });

  await step("After a reload the card stays dismissed on this device", async () => {
    await page.reload();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Today", exact: true }),
    ).toBeVisible();
    await expect(offer).toBeHidden();
    return api("/api/connected-apps");
  });
}
