import { createCompiledCatalog } from "@lingui/cli/api";
import { setupI18n } from "@lingui/core";
import { formatter } from "@lingui/format-po";
import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import en from "../locales/en.po?raw";
import ru from "../locales/ru.po?raw";
import uk from "../locales/uk.po?raw";
import { lastSevenDays } from "../ui/days";
import { nextDay, type Snapshot } from "../widgets/next-day";
import { widgetText } from "./widgets";
import "../widgets/today-widget";
import "../widgets/week-widget";
import "../widgets/lock-widget";

const { layouts } = vi.hoisted(() => ({
  layouts: new Map<string, (props: object, env: object) => ReactNode>(),
}));
vi.mock("expo-widgets", () => ({
  createWidget: (name: string, layout: (props: object, env: object) => ReactNode) => {
    layouts.set(name, layout);
    return {};
  },
}));
vi.mock("@expo/ui/swift-ui", () => ({
  Text: "Text",
  HStack: "HStack",
  VStack: "VStack",
  ZStack: "ZStack",
  Image: "Image",
  Spacer: "Spacer",
  Gauge: "Gauge",
  RoundedRectangle: "RoundedRectangle",
}));
vi.mock("@expo/ui/swift-ui/modifiers", () => {
  const modifier = () => ({});
  return {
    containerBackground: modifier,
    font: modifier,
    foregroundStyle: modifier,
    frame: modifier,
    gaugeStyle: modifier,
    monospacedDigit: modifier,
    resizable: modifier,
    widgetURL: modifier,
  };
});

function visibleText(node: ReactNode): string[] {
  if (typeof node === "string") return node ? [node] : [];
  if (Array.isArray(node)) return node.flatMap(visibleText);
  if (!isValidElement<{ children?: ReactNode; currentValueLabel?: ReactNode }>(node)) return [];
  return [node.props.children, node.props.currentValueLabel].flatMap(visibleText);
}

const languages = ["en", "uk", "ru"] as const;
const catalogs = Object.fromEntries(
  languages.map((locale) => {
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
const snapshot = (n: number, signedIn = true): Snapshot => ({
  due: n,
  streak: n,
  reviewed: 0,
  goal: n,
  left: n,
  signedIn,
  out: false,
  week: [0, 0, 0, 0, 0, 0, 0],
  dates: lastSevenDays("2026-10-17"),
});

const forms = {
  en: { card: ["card", "cards", "cards"], day: ["day", "days", "days"] },
  uk: { card: ["картка", "картки", "карток"], day: ["день", "дні", "днів"] },
  ru: { card: ["карточка", "карточки", "карточек"], day: ["день", "дня", "дней"] },
};
const counts = [
  [0, 2],
  [1, 0],
  [2, 1],
  [5, 2],
  [11, 2],
  [21, 0],
  [22, 1],
  [25, 2],
  [101, 0],
];

describe.each(languages)("widget text in %s", (locale) => {
  it.each(counts)("formats %i with the right card and day forms", (count, form) => {
    i18n.activate(locale);
    // English has no Slavic one/few/many distinction for 21 and 101.
    const index = locale === "en" ? (count === 1 ? 0 : 1) : form;
    const text = widgetText(i18n, snapshot(count));
    expect(text.dueCount).toBe(i18n.number(count));
    expect(text.streakCount).toBe(i18n.number(count));
    expect(text.dueLabel.split(" ")[0]).toBe(forms[locale].card[index]);
    expect(text.streakLabel.split(" ")[0]).toBe(forms[locale].day[index]);
    expect(text.dueLine).toBe(`${i18n.number(count)} ${text.dueLabel}`);
    expect(text.streakLine).toBe(`${i18n.number(count)} ${text.streakLabel}`);
    expect(text.inline).toBe(`${text.dueLine} · ${i18n.number(count)} ${forms[locale].day[index]}`);
    expect(Object.values(JSON.parse(JSON.stringify(text)))).toEqual(Object.values(text));
  });

  it("formats large counts and keeps a signed-out day neutral", () => {
    i18n.activate(locale);
    const text = widgetText(i18n, snapshot(12345, false));
    expect(text.dueCount).toBe(new Intl.NumberFormat(locale).format(12345));
    expect(text.dueLine).toContain(text.dueCount);
    expect(text.today).toBe("");
  });

  it("localizes both entries of the next-day timeline", () => {
    i18n.activate(locale);
    const now = { ...snapshot(21), left: 0, reviewed: 21 };
    const next = nextDay(
      now,
      {
        today: { date: "2026-10-17", attempts: 21, goal: 21, outcome: "goal_met" },
        goal: 21,
        current: 21,
        longest: 21,
        reviewedDays: 21,
        restDays: [],
        days: [],
      },
      [0, 0, 0, 0, 0, 0, 21],
      new Date(Date.now() + 3600000),
      1,
    );
    expect(next).toBeDefined();
    if (!next) throw new Error("Expected a next-day timeline entry");
    const today = widgetText(i18n, now);
    const tomorrow = widgetText(i18n, next.snapshot);
    expect(today.today).toBe(
      { en: "Today counts", uk: "Сьогодні зараховано", ru: "Сегодня засчитано" }[locale],
    );
    expect(tomorrow.today).toBe(
      {
        en: "21 reviews to today’s goal",
        uk: "До сьогоднішньої мети: 21 повторення",
        ru: "До сегодняшней цели: 21 повторение",
      }[locale],
    );
  });
});

it("replaces every string after a language change and restores it on relaunch", () => {
  const now = snapshot(22);
  i18n.activate("en");
  const english = widgetText(i18n, now);
  i18n.activate("uk");
  const ukrainian = widgetText(i18n, now);
  i18n.activate("ru");
  const russian = widgetText(i18n, now);
  for (const key of [
    "dueLabel",
    "dueShort",
    "dueLine",
    "streakLabel",
    "streakLine",
    "inline",
    "today",
  ] as const) {
    expect(ukrainian[key]).not.toBe(english[key]);
    expect(russian[key]).not.toBe(english[key]);
    expect(russian[key]).not.toBe(ukrainian[key]);
  }
  const relaunched = setupI18n({ locale: "uk", messages: catalogs });
  expect(widgetText(relaunched, now)).toEqual(ukrainian);
});

const sizes = [
  ["TodayWidget", "systemSmall", ["dueCount", "dueShort"]],
  ["TodayWidget", "systemMedium", ["dueCount", "dueLabel", "streakLine"]],
  ["WeekWidget", "systemMedium", ["streakCount", "streakLabel", "dueLine", "today"]],
  ["LockWidget", "accessoryCircular", ["dueCount"]],
  ["LockWidget", "accessoryRectangular", ["streakLine", "dueLine"]],
  ["LockWidget", "accessoryInline", ["inline"]],
] as const;

describe.each(languages)("widget render text in %s", (locale) => {
  it.each(sizes)("%s %s receives localized strings", (name, family, fields) => {
    i18n.activate(locale);
    const text = widgetText(i18n, snapshot(22));
    const render = layouts.get(name);
    if (!render) throw new Error(`No layout for ${name}`);
    const tree = render({ text }, { widgetFamily: family, colorScheme: "light" });
    expect(visibleText(tree)).toEqual(fields.map((field) => text[field]));
  });
});

it.each(sizes)("%s %s has no English fallback before the app sends props", (name, family) => {
  const render = layouts.get(name);
  if (!render) throw new Error(`No layout for ${name}`);
  const strings = visibleText(render({}, { widgetFamily: family, colorScheme: "light" }));
  expect(strings.every((text) => text === "0")).toBe(true);
});
