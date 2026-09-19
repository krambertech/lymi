import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { queueItem } from "../design/mock";
import type { QueueItem } from "../lib/api";
import { ReviewCard } from "./review-view";

i18n.load("en", messages);
i18n.activate("en");

const noop = () => {};
const item = (card: Partial<QueueItem["card"]>): QueueItem => ({
  ...queueItem,
  card: { ...queueItem.card, ...card },
});

test("a revealed card shows its tags and marks only what the AI wrote", async () => {
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

  const tags = page.getByRole("list", { name: "Tags" }).element();
  expect(Array.from(tags.querySelectorAll("li"), (li) => li.textContent)).toEqual([
    "verbs",
    "reflexive",
  ]);
  const card = page.getByRole("region", { name: /Recognition card/ }).element();
  expect(card.textContent).toContain("AI meaning");
  expect(card.textContent).toContain("Lesson 14");
  expect(card.textContent).not.toContain("from lesson");
  expect(card.textContent).not.toContain("by you");
});

test("the learner's own text carries no chip and no tags means no list", async () => {
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
  expect(page.getByRole("list", { name: "Tags" }).elements()).toHaveLength(0);
  expect(card.textContent).not.toContain("by you");
  expect(card.textContent).not.toContain("AI");
  expect(card.querySelectorAll(".rounded-full")).toHaveLength(1);
});
