import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { messages } from "../../locales/en.po";
import { ShellChrome } from "../components/layout/shell-chrome";
import { StaticNavProvider } from "../components/nav-link";
import { designChrome } from "../design/chrome";
import { ApiError } from "../lib/api";

i18n.load("en", messages);
i18n.activate("en");

/** The route's own part of deleting an account: which step shows as codes are sent and refused. */
const { server } = vi.hoisted(() => ({ server: { sendDeletionCode: vi.fn() } }));

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: { component: ComponentType }) => ({ options }),
  useNavigate: () => vi.fn(),
}));
vi.mock("../components/export-sheet", () => ({ ExportSheet: () => null }));
vi.mock("../lib/queries", async (original) => {
  const { queryOptions } = await import("@tanstack/react-query");
  return {
    ...(await original<typeof import("../lib/queries")>()),
    decksQuery: queryOptions({ queryKey: ["decks"], queryFn: () => [] }),
    deletionQuery: queryOptions({
      queryKey: ["deletion"],
      queryFn: () => ({
        blocked: null,
        confirmWith: "email",
        decks: 4,
        cards: 47,
        reviews: 180,
        sharedDecks: [],
      }),
    }),
  };
});
vi.mock("../lib/api", async (original) => {
  const actual = await original<typeof import("../lib/api")>();
  return {
    ...actual,
    refusalCode: (error: unknown) => (error instanceof actual.ApiError ? error.message : null),
    api: { sendDeletionCode: () => server.sendDeletionCode() },
  };
});

afterEach(() => vi.clearAllMocks());

async function renderRoute() {
  const { Route } = await import("./settings_.delete-account");
  const Screen = (Route as unknown as { options: { component: ComponentType } }).options.component;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider i18n={i18n}>
        <ShellChrome value={designChrome()}>
          <StaticNavProvider path="/settings/delete-account">
            <div className="@container/shell" style={{ width: 1000 }}>
              <Screen />
            </div>
          </StaticNavProvider>
        </ShellChrome>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

test("a refused new code keeps the code step and what was typed", async () => {
  server.sendDeletionCode.mockResolvedValueOnce({ sentTo: "learner@lymi.local" });
  await renderRoute();
  await userEvent.click(page.getByRole("button", { name: "Send code" }));
  const code = page.getByRole("textbox", { name: "Code from the email" });
  await userEvent.type(code, "123456");

  let refuse: (error: unknown) => void = () => undefined;
  server.sendDeletionCode.mockReturnValueOnce(new Promise((_, reject) => (refuse = reject)));
  await userEvent.click(page.getByRole("button", { name: "Send a new code" }));
  await expect.element(code).toHaveValue("123456");

  refuse(new ApiError(429, "code_sent"));
  await expect
    .poll(() => document.querySelector("[role=alert]")?.textContent)
    .toContain("A code is already on its way");
  await expect.element(code).toHaveValue("123456");
});
