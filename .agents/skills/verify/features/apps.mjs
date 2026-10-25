export const title = "Apps";
export const start = "/settings";
export const persona = "learner";

export default async function drive({ page, step, expect }) {
  const addable = () => page.getByRole("list", { name: "Apps you can add" });

  await step("Find the Apps group with apps to add", async () => {
    await expect(page.getByRole("heading", { level: 2, name: "Apps", exact: true })).toBeVisible();
    await expect(addable().getByRole("link", { name: "Custom MCP" })).toBeVisible();
  });

  await step("Open Grok and read how to connect it", async () => {
    // A chip until Grok connects, then a row; its page shows how it connects either way.
    await page.getByRole("link", { name: /^Grok/ }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Grok" })).toBeVisible();
    const address = await page.getByLabel("MCP server address").innerText();
    const clientId = await page.getByLabel("Client ID").innerText();
    expect(address).toMatch(/\/mcp$/);
    expect(clientId).toMatch(/\/oauth\/grok\.json$/);
    await expect(page.getByRole("link", { name: /Read the Grok guide/ })).toBeVisible();
    return { address, clientId };
  });

  await step("Go back and open Custom MCP", async () => {
    await page.getByRole("link", { name: "Settings" }).first().click();
    await addable().getByRole("link", { name: "Custom MCP" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Custom MCP" })).toBeVisible();
    await expect(page.getByLabel("MCP server address")).toBeVisible();
    await expect(page.getByLabel("Client ID")).toHaveCount(0);
  });
}
