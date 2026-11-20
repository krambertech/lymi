import { CARD_LIMITS } from "./types";

/**
 * A card's source that fits its limit. A URL over it drops every query parameter but `t`, the
 * moment in a video, then its path, so the link still leads to the site; other text that does
 * not fit is left out.
 */
export function fitSource(source: string): string | undefined {
  if (source.length <= CARD_LIMITS.source) return source;
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const t = url.searchParams.get("t");
  const moment = t ? `?t=${encodeURIComponent(t)}` : "";
  const page = `${url.origin}${url.pathname}${moment}`;
  if (page.length <= CARD_LIMITS.source) return page;
  const site = `${url.origin}/${moment}`;
  return site.length <= CARD_LIMITS.source ? site : undefined;
}

/** A source that is a web address, as a link named by its site; null for any other text. */
export function sourceLink(
  source: string | null | undefined,
): { href: string; site: string } | null {
  const text = source?.trim();
  if (!text || !/^https?:\/\//i.test(text) || /\s/.test(text)) return null;
  try {
    const url = new URL(text);
    if (!url.hostname) return null;
    return { href: url.href, site: url.hostname.replace(/^www\./i, "") };
  } catch {
    return null;
  }
}
