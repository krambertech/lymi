import { type Locale, localizedPath } from "./routes";

/** `2026-10-11-welcome` → the date and `welcome`, which names the update's page and feed item. */
export const CHANGELOG_FOLDER = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * An update dated ahead is a draft until the site is built on its day; the dev server and the pull request preview show drafts.
 * `changelog-publish.yml` rebuilds the site on each update's day.
 */
export function isChangelogPublished(folder: string, today = import.meta.env.BUILD_DAY): boolean {
  if (import.meta.env.DEV || import.meta.env.CHANGELOG_DRAFTS) return true;
  const day = CHANGELOG_FOLDER.exec(folder)?.[1];
  return day !== undefined && day <= today;
}

const folders = Object.keys(import.meta.glob("../content/changelog/*/en.md"))
  .map((file) => file.split("/").at(-2) ?? "")
  .filter((folder) => isChangelogPublished(folder));

/** Every published update's slug, read from the folders so the sitemap and tests need no content layer. */
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
