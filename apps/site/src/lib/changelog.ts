import { type CollectionEntry, getCollection } from "astro:content";
import type { ImageMetadata } from "astro";
import { CHANGELOG_FOLDER, isChangelogPublished } from "./changelog-paths";
import type { Locale } from "./routes";
import { TRAY_HUES } from "./tray";

export interface ChangelogUpdate {
  /** The folder name without its date: the update's own page, its anchor on the list and its feed id. */
  slug: string;
  date: Date;
  entry: CollectionEntry<"changelog">;
  /** Counted from the oldest update, so neighbours differ and a new update repaints nothing. */
  hue: number;
  screenshot?: { light: ImageMetadata; dark: ImageMetadata } | undefined;
}

const SHOTS = import.meta.glob<ImageMetadata>("../content/changelog/*/*.webp", {
  eager: true,
  import: "default",
});

function screenshotOf(folder: string, locale: Locale) {
  const file = (theme: string) => SHOTS[`../content/changelog/${folder}/${locale}-${theme}.webp`];
  const light = file("light");
  const dark = file("dark");
  if (!light || !dark) {
    throw new Error(
      `${folder} has a screenshot but no ${locale}-light.webp and ${locale}-dark.webp.`,
    );
  }
  return { light, dark };
}

/** Every published update in one language, newest first. */
export async function changelogUpdates(locale: Locale): Promise<ChangelogUpdate[]> {
  const entries = await getCollection("changelog");
  const updates: ChangelogUpdate[] = [];
  for (const entry of entries) {
    const [folder = "", language] = entry.id.split("/");
    const match = CHANGELOG_FOLDER.exec(folder);
    if (!match) throw new Error(`Changelog entry ${entry.id} is not in a YYYY-MM-DD-slug folder.`);
    if (language !== locale || !isChangelogPublished(folder)) continue;
    const [, day, slug] = match as unknown as [string, string, string];
    const screenshot = entry.data.screenshot ? screenshotOf(folder, locale) : undefined;
    updates.push({ slug, date: new Date(`${day}T12:00:00Z`), entry, hue: 0, screenshot });
  }
  updates.sort((a, b) => a.date.getTime() - b.date.getTime() || a.slug.localeCompare(b.slug));
  for (const [index, update] of updates.entries()) update.hue = index % TRAY_HUES;
  return updates.reverse();
}

/** "11 October 2026" in the page's language. */
export function changelogDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
