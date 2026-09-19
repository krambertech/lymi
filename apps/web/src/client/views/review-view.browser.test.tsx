import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { queueItem, queueItemPicture } from "../design/mock";
import type { QueueItem } from "../lib/api";
import { ReviewCard } from "./review-view";

i18n.load("en", messages);
i18n.activate("en");

const noop = () => {};
const item = (card: Partial<QueueItem["card"]>): QueueItem => ({
  ...queueItem,
  card: { ...queueItem.card, ...card },
});

test("a revealed card shows its source, not its tags, and marks only what the AI wrote", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({
          meaningSource: "ai",
          exampleSource: "lesson",
          source: "Lesson 14",
          tags: ["verbs", "reflexive"],
        })}
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>,
  );

  expect(page.getByRole("list", { name: "Tags" }).elements()).toHaveLength(0);
  const card = page.getByRole("region", { name: /Recognition card/ }).element();
  expect(card.textContent).toContain("AI meaning");
  expect(card.textContent).toContain("Lesson 14");
  expect(card.textContent).not.toContain("verbs");
  expect(card.textContent).not.toContain("from lesson");
  expect(card.textContent).not.toContain("by you");
});

test("the learner's own text and no source carry no chip", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({ meaningSource: "manual", exampleSource: "manual", source: null, tags: [] })}
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>,
  );

  const card = page.getByRole("region", { name: /Recognition card/ }).element();
  expect(card.textContent).not.toContain("by you");
  expect(card.textContent).not.toContain("AI");
  expect(card.querySelectorAll(".rounded-full")).toHaveLength(1);
});

test("the head names the deck and the section, and the mode only for a picture", async () => {
  // The picture loads through Query, so the picture card needs a client.
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <ReviewCard
          item={item({ language: "it" })}
          deck={{ name: "Verbi", language: "it" }}
          section="Lezione 3"
          revealed={false}
          onReveal={noop}
        />
        <ReviewCard
          item={{ ...queueItemPicture, card: { ...queueItemPicture.card, language: "et" } }}
          deck={{ name: "Driving", language: "it" }}
          revealed={false}
          onReveal={noop}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );

  const text = page.getByRole("region", { name: /Recognition card/ }).element().textContent ?? "";
  expect(text).toContain("Verbi");
  expect(text).toContain("Section");
  expect(text).toContain("Lezione 3");
  expect(text).not.toContain("Recognition card");
  expect(text).not.toMatch(/Recognition(?! card)|Production/);

  const picture = page.getByRole("region", { name: "Picture card" }).element().textContent ?? "";
  expect(picture).toContain("Picture → meaning");
  expect(picture).toContain("ET");
});
