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

test("on the phone the avatar says there is more, and is named for what it opens", async () => {
  await render(<Menu variant="phone" />);
  const trigger = page.getByRole("button", { name: "More, account menu", exact: true });
  await expect.element(trigger).toBeVisible();
  expect(trigger.element().textContent).toContain("More");

  await trigger.click();
  await expect.element(page.getByRole("menuitem", { name: "Insights" })).toBeVisible();
  await expect.element(page.getByRole("menuitem", { name: "Explore" })).toBeVisible();
});

test("the rail's profile row has no More hint", async () => {
  await render(<Menu variant="rail" />);
  const trigger = page.getByRole("button", { name: "Alex" });
  await expect.element(trigger).toBeVisible();
  expect(trigger.element().textContent).not.toContain("More");
});
