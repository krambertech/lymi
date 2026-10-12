import { CHANGELOG_BLURB, CHANGELOG_FEED_TITLE } from "../components/changelog/changelog-copy";
import { changelogUpdates } from "./changelog";
import { changelogUpdatePath } from "./changelog-paths";
import { pageI18n } from "./i18n";
import { type Locale, localizedPath } from "./routes";

const SITE = "https://lymi.app";

const escapeXml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** The changelog in one language as RSS 2.0, each update with its summary and full text. */
export async function changelogFeed(locale: Locale): Promise<Response> {
  const i18n = pageI18n(locale);
  const page = `${SITE}${localizedPath("changelog", locale)}`;
  const updates = await changelogUpdates(locale);
  const items = updates.map(({ slug, date, entry }) =>
    [
      "    <item>",
      `      <title>${escapeXml(entry.data.title)}</title>`,
      `      <link>${SITE}${changelogUpdatePath(slug, locale)}</link>`,
      `      <guid isPermaLink="false">lymi-changelog-${slug}</guid>`,
      `      <pubDate>${date.toUTCString()}</pubDate>`,
      `      <description>${escapeXml(entry.data.summary)}</description>`,
      `      <content:encoded>${escapeXml(entry.rendered?.html ?? "")}</content:encoded>`,
      "    </item>",
    ].join("\n"),
  );
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">`,
    "  <channel>",
    `    <title>${escapeXml(i18n._(CHANGELOG_FEED_TITLE))}</title>`,
    `    <link>${page}</link>`,
    `    <description>${escapeXml(i18n._(CHANGELOG_BLURB))}</description>`,
    `    <language>${locale}</language>`,
    ...items,
    "  </channel>",
    "</rss>",
  ].join("\n");
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
