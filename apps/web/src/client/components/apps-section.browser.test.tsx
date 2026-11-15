import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ApiError } from "../lib/api";
import { AppsSection } from "./apps-section";

i18n.load("en", messages);
i18n.activate("en");

const { server } = vi.hoisted(() => ({
  server: {
    apps: vi.fn<() => Promise<unknown[]>>(),
    readwise: vi.fn<() => Promise<{ connection: unknown }>>(),
    keys: vi.fn<() => Promise<unknown[]>>(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("../lib/queries", async () => {
  const { queryOptions } = await import("@tanstack/react-query");
  return {
    connectedAppsQuery: queryOptions({ queryKey: ["apps"], queryFn: () => server.apps() }),
    readwiseQuery: queryOptions({ queryKey: ["readwise"], queryFn: () => server.readwise() }),
    keysQuery: queryOptions({ queryKey: ["keys"], queryFn: () => server.keys() }),
  };
});

const claude = {
  id: "c1",
  clientName: "Claude",
  clientUri: "https://claude.ai",
  logoUri: null,
  scopes: ["cards:read"],
  createdAt: "2026-10-01T00:00:00.000Z",
  lastUsedAt: null,
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <AppsSection />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const failure = new ApiError(500, "Lymi couldn’t load your apps.");

beforeEach(() => {
  server.apps.mockReset().mockResolvedValue([]);
  server.readwise.mockReset().mockResolvedValue({ connection: null });
  server.keys.mockReset().mockResolvedValue([]);
});

test("offers the apps when nothing is connected and every read answered", async () => {
  renderSection();
  await expect.element(page.getByRole("link", { name: /Readwise/ })).toBeVisible();
  await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
});

test.each(["apps", "readwise", "keys"] as const)(
  "a failed %s read shows an error and offers no apps",
  async (read) => {
    server[read].mockRejectedValue(failure);
    renderSection();
    await expect.element(page.getByRole("alert")).toBeVisible();
    await expect.element(page.getByRole("link", { name: /Readwise/ })).not.toBeInTheDocument();
    await expect.element(page.getByRole("list", { name: "Your apps" })).not.toBeInTheDocument();
  },
);

test("a failed read keeps what did load, without the offer to add", async () => {
  server.apps.mockResolvedValue([claude]);
  server.readwise.mockRejectedValue(failure);
  renderSection();
  await expect.element(page.getByRole("list", { name: "Your apps" })).toBeVisible();
  await expect.element(page.getByRole("alert")).toBeVisible();
  await expect.element(page.getByRole("link", { name: /Readwise/ })).not.toBeInTheDocument();
  await expect.element(page.getByText("Add an app")).not.toBeInTheDocument();
});
