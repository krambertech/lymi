import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { LearnerMenu } from "./learner-menu";
import { StaticNavProvider } from "./nav-link";

i18n.load("en", messages);
i18n.activate("en");

function Menu({ variant }: { variant: "phone" | "rail" }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <StaticNavProvider path="/today">
          <LearnerMenu variant={variant} name="Alex Sample" docsUrl="https://lymi.app/docs" />
        </StaticNavProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

test("on the phone the avatar opens Insights and Explore", async () => {
  await render(<Menu variant="phone" />);
  await page.getByRole("button", { name: "Alex", exact: true }).click();
  await expect.element(page.getByRole("menuitem", { name: "Insights" })).toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "Explore" })).toBeVisible();
});
