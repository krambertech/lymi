import type { I18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { type ComponentType, use } from "react";
import { lessonName } from "../../lib/learn/catalogue";
import { learnI18n } from "../../lib/learn/i18n";
import { reportLoadFailure } from "../../lib/learn/load-failure";
import { Queries } from "../islands/Queries";
import { KeepEndings } from "./endings";
import "./learn.css";

const LESSONS = import.meta.glob<Record<string, ComponentType>>("./lessons/*.tsx");

interface Page {
  i18n: I18n;
  View: ComponentType;
}

interface Load {
  page: Promise<Page>;
  shown: Promise<Page>;
}

const pages = new Map<string, Load>();

async function lessonPage(slug: string, locale: string): Promise<Page> {
  const name = lessonName(slug);
  const load = LESSONS[`./lessons/${name}.tsx`];
  if (!load) throw new Error(`No lesson file for ${slug}`);
  const [module, i18n] = await Promise.all([load(), learnI18n(locale, name)]);
  const View = module[`${name}Lesson`];
  if (!View) throw new Error(`lessons/${name}.tsx exports no ${name}Lesson`);
  return { i18n, View };
}

const hubPage = async (locale: string): Promise<Page> => {
  const [{ HubView }, i18n] = await Promise.all([import("./HubView"), learnI18n(locale)]);
  return { i18n, View: HubView };
};

const kitPage = async (locale: string): Promise<Page> => {
  const [{ KitDemo }, i18n] = await Promise.all([import("./KitDemo"), learnI18n(locale)]);
  return { i18n, View: KitDemo };
};

const reviewPage = async (locale: string): Promise<Page> => {
  const [{ ReviewView }, i18n] = await Promise.all([import("./ReviewView"), learnI18n(locale)]);
  return { i18n, View: ReviewView };
};

export type LearnTarget =
  | { kind: "lesson"; slug: string }
  | { kind: "hub" }
  | { kind: "review" }
  | { kind: "kit" };

function load(target: LearnTarget, locale: string): Promise<Page> {
  switch (target.kind) {
    case "lesson":
      return lessonPage(target.slug, locale);
    case "hub":
      return hubPage(locale);
    case "review":
      return reviewPage(locale);
    case "kit":
      return kitPage(locale);
  }
}

const noop = () => {};

function keepServerHtml(): Promise<never> {
  reportLoadFailure();
  return new Promise(noop);
}

function open(target: LearnTarget, locale: string): Load {
  const key = `${locale}/${target.kind}/${target.kind === "lesson" ? target.slug : ""}`;
  const known = pages.get(key);
  if (known) return known;
  const page = load(target, locale);
  const shown = page.catch(keepServerHtml);
  page.then((value) => Object.assign(shown, { status: "fulfilled", value }), noop);
  const opened = { page, shown };
  pages.set(key, opened);
  return opened;
}

export async function prepareLearnPage(target: LearnTarget, locale: string): Promise<void> {
  await open(target, locale).page;
}

export function LearnPage({ target, locale }: { target: LearnTarget; locale: string }) {
  const { i18n, View } = use(open(target, locale).shown);
  return (
    <I18nProvider i18n={i18n} defaultComponent={KeepEndings}>
      <Queries>
        <View />
      </Queries>
    </I18nProvider>
  );
}
