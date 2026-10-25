import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { ConnectedApp } from "../lib/api";
import { AssistantOffer, useAssistantOffer } from "./assistant-offer";
import { StaticNavProvider } from "./nav-link";

i18n.load("en", messages);
i18n.activate("en");

function Harness() {
  const offer = useAssistantOffer(true);
  return (
    <>
      {offer.card && <AssistantOffer onDismiss={offer.dismiss} />}
      {offer.row && <p>menu row</p>}
    </>
  );
}

function renderWith(apps: ConnectedApp[]) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(apps));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <StaticNavProvider path="/today">
          <Harness />
        </StaticNavProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("offers each assistant's page in Settings while no app is connected", async () => {
  await renderWith([]);
  await expect.element(page.getByText("Connect your AI assistant")).toBeVisible();
  await expect
    .element(page.getByRole("link", { name: "Connect Claude" }))
    .toHaveAttribute("href", "/settings/apps/claude");
  await expect
    .element(page.getByRole("link", { name: /^Connect your AI assistant/ }))
    .toHaveAttribute("href", "/settings#apps");
});

test("dismissing hides the card on this device and keeps the menu row", async () => {
  const screen = await renderWith([]);
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect.element(page.getByText("Connect your AI assistant")).not.toBeInTheDocument();
  await expect.element(page.getByText("menu row")).toBeVisible();

  await screen.unmount();
  await renderWith([]);
  await expect.element(page.getByText("menu row")).toBeVisible();
  await expect.element(page.getByText("Connect your AI assistant")).not.toBeInTheDocument();
});

test("a connected app ends the offer", async () => {
  const at = new Date().toISOString();
  await renderWith([
    {
      id: "c1",
      clientId: "https://claude.ai/oauth/client.json",
      name: "Claude",
      scope: "read",
      createdAt: at,
      updatedAt: at,
    },
  ]);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 50));
  await expect.element(page.getByText("menu row")).not.toBeInTheDocument();
  await expect.element(page.getByText("Connect your AI assistant")).not.toBeInTheDocument();
});
