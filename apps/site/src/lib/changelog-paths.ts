import { type Locale, localizedPath } from "./routes";

/** `2026-10-11-welcome` → the date and `welcome`, which names the update's page and feed item. */
export const CHANGELOG_FOLDER = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

const folders = Object.keys(import.meta.glob("../content/changelog/*/en.md")).map(
  (file) => file.split("/").at(-2) ?? "",
);

/** Every update's slug, read from the folders so the sitemap and tests need no content layer. */
export const changelogSlugs: readonly string[] = folders.map(
  (folder) => CHANGELOG_FOLDER.exec(folder)?.[2] ?? folder,
);

export function changelogUpdatePath(slug: string, locale: string): string {
  return `${localizedPath("changelog", locale)}/${slug}`;
}

export function changelogUpdatePaths(slug: string): Record<Locale, string> {
  return {
    en: changelogUpdatePath(slug, "en"),
    uk: changelogUpdatePath(slug, "uk"),
    ru: changelogUpdatePath(slug, "ru"),
  };
}
