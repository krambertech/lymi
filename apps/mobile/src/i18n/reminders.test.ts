import { createCompiledCatalog } from "@lingui/cli/api";
import { setupI18n } from "@lingui/core";
import { formatter } from "@lingui/format-po";
import { expect, it } from "vitest";
import en from "../locales/en.po?raw";
import ru from "../locales/ru.po?raw";
import uk from "../locales/uk.po?raw";
import { reminderWords } from "./reminders";

const catalogs = Object.fromEntries(
  (["en", "uk", "ru"] as const).map((locale) => {
    const catalog = formatter().parse({ en, ru, uk }[locale], {
      locale,
      sourceLocale: "en",
      filename: `${locale}.po`,
    });
    const translations = Object.fromEntries(
      Object.entries(catalog).map(([id, entry]) => [id, entry.translation]),
    );
    const { source, errors } = createCompiledCatalog(locale, translations, { namespace: "json" });
    if (errors.length) throw new Error(JSON.stringify(errors));
    return [locale, JSON.parse(source).messages];
  }),
);
const i18n = setupI18n({ locale: "en", messages: catalogs });

it("writes each kind of day as the web does", () => {
  i18n.activate("en");
  expect(reminderWords(i18n, { message: "ready", count: 10 })).toEqual({
    title: "10 cards are ready",
    body: "Review whenever you have a moment.",
  });
  expect(reminderWords(i18n, { message: "to_goal", count: 6 })).toEqual({
    title: "6 cards to today’s goal",
    body: "Finish if you have a moment.",
  });
  expect(reminderWords(i18n, { message: "after_rest", count: 12 })).toEqual({
    title: "Yesterday was a rest day",
    body: "Your streak carried on. 12 cards are ready.",
  });
  expect(reminderWords(i18n, { message: "next_cards", count: 10 })).toEqual({
    title: "Your next cards are ready",
    body: "10 cards for today.",
  });
});

it("uses every plural form in Ukrainian and Russian", () => {
  i18n.activate("uk");
  expect(reminderWords(i18n, { message: "ready", count: 21 }).title).toBe("21 картка готова");
  expect(reminderWords(i18n, { message: "next_cards", count: 21 })).toEqual({
    title: "Наступні картки готові",
    body: "21 картка на сьогодні.",
  });
  i18n.activate("ru");
  expect(reminderWords(i18n, { message: "to_goal", count: 5 }).title).toBe(
    "До сегодняшней цели: 5 карточек",
  );
  expect(reminderWords(i18n, { message: "after_rest", count: 2 }).body).toBe(
    "Дни подряд не прервались. 2 карточки готовы.",
  );
});
