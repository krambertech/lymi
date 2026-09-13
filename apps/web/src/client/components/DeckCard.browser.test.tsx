import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { DeckCard } from "./DeckCard";

i18n.load("en", messages);
i18n.activate("en");

test("a joined deck names its owner and an owned deck names nobody", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ul>
        <li>
          <DeckCard
            id="d1"
            name="Italian with Giulia"
            language="it"
            due={8}
            total={64}
            known={31}
            learning={14}
            st={{ path: "" }}
          />
        </li>
        <li>
          <DeckCard
            id="d4"
            name="Eesti keel, A1"
            language="et"
            due={5}
            total={38}
            known={12}
            learning={9}
            owner="Liis"
            st={{ path: "" }}
          />
        </li>
      </ul>
    </I18nProvider>,
  );

  const owned = page.getByRole("link", { name: /Italian with Giulia/ }).element();
  const joined = page.getByRole("link", { name: /Eesti keel, A1/ }).element();
  expect(owned.textContent).not.toContain("Shared by");
  expect(joined.textContent).toContain("Shared by Liis");

  // The whole card stays the one tap target, and the due count stays where it was.
  expect(page.getByRole("link").elements()).toHaveLength(2);
  expect(joined.querySelectorAll("a, button")).toHaveLength(0);
  expect(owned.textContent).toContain("8 due today");
  expect(joined.textContent).toContain("5 due today");
});
