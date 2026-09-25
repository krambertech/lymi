import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { DeckCard } from "./deck-card";
import { StaticNavProvider } from "./nav-link";

i18n.load("en", messages);
i18n.activate("en");

test("a joined deck names its owner and an owned deck names nobody", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <StaticNavProvider path="">
        <ul>
          <li>
            <DeckCard id="d1" name="Italian with Giulia" language="it" due={8} total={64} />
          </li>
          <li>
            <DeckCard id="d4" name="Eesti keel, A1" language="et" due={5} total={38} owner="Liis" />
          </li>
        </ul>
      </StaticNavProvider>
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

  // A deck shared by link keeps the letter plate: only publishing makes a photo public.
  expect(joined.querySelector("img")).toBeNull();
  expect(joined.querySelector(".bg-plate-2")).not.toBeNull();
});

test("a deck added from Explore draws its publisher's mark", async () => {
  // A photo that loads: the mark falls back to the letter when the address fails, which is
  // what a real /public/media address would do with no Worker behind it.
  const photo = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  await render(
    <I18nProvider i18n={i18n}>
      <StaticNavProvider path="">
        <ul>
          <li>
            <DeckCard
              id="d5"
              name="Eesti keel, A2"
              language="et"
              due={0}
              total={120}
              owner="Giulia"
              published
              publisherPhoto={photo}
            />
          </li>
          <li>
            <DeckCard
              id="d6"
              name="Eesti keel, B1"
              language="et"
              due={0}
              total={90}
              owner="Lymi"
              published
            />
          </li>
        </ul>
      </StaticNavProvider>
    </I18nProvider>,
  );

  const withPhoto = page.getByRole("link", { name: /Eesti keel, A2/ }).element();
  expect(withPhoto.querySelector("img")?.getAttribute("src")).toBe(photo);
  expect(withPhoto.textContent).toContain("Shared by Giulia");

  // Lymi's own decks get the lantern tile rather than an "L" on a plate.
  const lymi = page.getByRole("link", { name: /Eesti keel, B1/ }).element();
  expect(lymi.querySelector("svg")).not.toBeNull();
  expect(lymi.querySelector(".bg-plate-2")).toBeNull();
  expect(lymi.textContent).toContain("Shared by Lymi");
});
