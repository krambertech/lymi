import type { LinkRefusal } from "@lymi/core";
import type { Fetch } from "../ai/types";
import { type HealthEnv, metered } from "../dependency-health";

/** Who Lymi says it is when it reads a page, with the page that explains why. */
export const LYMI_BOT = "LymiBot/1.0 (+https://lymi.app/docs/smart-add#lymibot)";
const BOT_TOKEN = "lymibot";

/** The whole read of a link, robots.txt and redirects included. */
const TIMEOUT_MS = 10_000;
const MAX_PAGE_BYTES = 5_000_000;
const MAX_ROBOTS_BYTES = 500_000;
const MAX_REDIRECTS = 5;

/** Services whose terms or DRM forbid reading them, by the site's registrable name. */
const REFUSED_SITES: Record<string, string> = {
  "netflix.com": "Netflix",
  "disneyplus.com": "Disney+",
  "spotify.com": "Spotify",
  "spotify.link": "Spotify",
};
const YOUTUBE_SITES = new Set(["youtube.com", "youtu.be", "youtube-nocookie.com"]);

export type LinkKind =
  | { kind: "article"; url: URL }
  | { kind: "youtube"; url: URL }
  | { kind: "drm"; service: string };

/** Why a link is not a page Lymi may fetch; the message is the learner's. */
export class LinkInvalid extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkInvalid";
  }
}

/** The page could not be read: unreachable, too large, not a web page, or with no text. */
export class LinkUnreadable extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LinkUnreadable";
  }
}

/** The site does not allow apps to read it, by robots.txt or its TDM reservation. */
export class LinkRefused extends Error {
  constructor(readonly refused: Extract<LinkRefusal, "robots" | "tdm">) {
    super("This site doesn't allow apps to read it. Paste the text instead.");
    this.name = "LinkRefused";
  }
}

/**
 * Whether a host may be fetched: a public name, never an IP literal, a single label or a name
 * reserved for private networks.
 */
export function publicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host.startsWith("[") || host.includes(":")) return false;
  if (/^[\d.]+$/.test(host) || /^0x[\da-f]+$/i.test(host)) return false;
  if (!host.includes(".")) return false;
  return !/(^|\.)(localhost|local|internal|intranet|lan|home|corp|private|test|invalid|example|onion|home\.arpa)$/.test(
    host,
  );
}

/** The last two labels of a host, enough to tell the sites this module names apart. */
function site(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").split(".").slice(-2).join(".");
}

/** A pasted link, checked against the URL rules and sorted by what Lymi may read from it. */
export function classifyLink(raw: string): LinkKind {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new LinkInvalid("Paste a link that starts with https://.");
  }
  if (url.protocol !== "https:") throw new LinkInvalid("Paste a link that starts with https://.");
  if (url.username || url.password || (url.port && url.port !== "443") || !publicHost(url.hostname))
    throw new LinkInvalid("Smart add reads only public web pages.");
  const name = site(url.hostname);
  const service = REFUSED_SITES[name];
  if (service) return { kind: "drm", service };
  if (YOUTUBE_SITES.has(name)) return { kind: "youtube", url };
  return { kind: "article", url };
}

/** A YouTube video's title from oEmbed, the one thing Lymi reads from YouTube; null when it has none. */
export async function youtubeTitle(url: URL, request: Fetch = fetch): Promise<string | null> {
  try {
    const response = await request(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`,
      {
        redirect: "manual",
        headers: { "user-agent": LYMI_BOT, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }
    const body = (await response.json()) as { title?: unknown };
    return typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  } catch {
    return null;
  }
}

type Rule = { allow: boolean; pattern: string };

/** The rules robots.txt sets for LymiBot: its own group when it has one, otherwise `*`'s. */
export function robotsRules(text: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ allow: key === "allow", pattern: value });
    }
  }
  const ours = groups.filter((g) => g.agents.some((a) => a === BOT_TOKEN));
  const chosen = ours.length > 0 ? ours : groups.filter((g) => g.agents.includes("*"));
  return chosen.flatMap((g) => g.rules);
}

function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

/** Whether robots.txt lets LymiBot read a path: the longest matching rule wins, and allow wins a tie. */
export function robotsAllow(rules: Rule[], path: string): boolean {
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!rule.pattern) continue;
    if (!patternMatches(rule.pattern, path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    )
      best = rule;
  }
  return best?.allow ?? true;
}

/** A fetch that follows redirects itself, so every hop is held to the URL rules. */
async function follow(
  request: Fetch,
  start: URL,
  init: RequestInit,
  onHop?: (url: URL) => Promise<void>,
): Promise<{ response: Response; url: URL }> {
  let url = start;
  for (let hop = 0; ; hop++) {
    await onHop?.(url);
    const response = await request(url.href, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return { response, url };
    await response.body?.cancel();
    if (hop >= MAX_REDIRECTS) throw new LinkUnreadable("This link redirects too many times.");
    const next = new URL(location, url);
    if (next.protocol !== "https:" || !publicHost(next.hostname))
      throw new LinkUnreadable("This link leads somewhere Smart add can't read.");
    url = next;
  }
}

/** The body up to `limit` bytes, or null when it is longer. */
async function bounded(response: Response, limit: number): Promise<Uint8Array | null> {
  const declared = Number(response.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(declared) && declared > limit) {
    await response.body?.cancel();
    return null;
  }
  if (!response.body) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > limit) {
      await response.body.cancel().catch(() => {});
      return null;
    }
    chunks.push(chunk);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** What robots.txt allows on one origin; a 4xx means no rules, a 5xx or no answer refuses. */
async function robotsFor(request: Fetch, origin: URL, signal: AbortSignal): Promise<Rule[] | null> {
  let response: Response;
  try {
    ({ response } = await follow(request, new URL("/robots.txt", origin), {
      headers: { "user-agent": LYMI_BOT, accept: "text/plain" },
      signal,
    }));
  } catch (error) {
    if (signal.aborted)
      throw new LinkUnreadable("This page took too long to answer.", { cause: error });
    return null;
  }
  if (response.status >= 400 && response.status < 500 && response.status !== 429) {
    await response.body?.cancel();
    return [];
  }
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  const bytes = await bounded(response, MAX_ROBOTS_BYTES);
  return bytes ? robotsRules(new TextDecoder().decode(bytes)) : null;
}

export type FetchedPage = {
  /** Where the page was read, after redirects. */
  url: URL;
  html: string;
  title: string;
};

/**
 * Reads an article for Smart add: robots.txt on every origin it passes through, then the page,
 * which must be HTML without a TDM reservation, inside one 10-second budget.
 */
export async function fetchArticle(start: URL, request: Fetch = fetch): Promise<FetchedPage> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const robots = new Map<string, Rule[] | null>();
  const allowed = async (url: URL) => {
    if (!robots.has(url.origin)) robots.set(url.origin, await robotsFor(request, url, signal));
    const rules = robots.get(url.origin);
    if (!rules || !robotsAllow(rules, `${url.pathname}${url.search}`))
      throw new LinkRefused("robots");
  };
  let response: Response;
  let url: URL;
  try {
    ({ response, url } = await follow(
      request,
      start,
      {
        headers: {
          "user-agent": LYMI_BOT,
          accept: "text/html,application/xhtml+xml;q=0.9",
        },
        signal,
      },
      allowed,
    ));
  } catch (error) {
    if (error instanceof LinkRefused || error instanceof LinkUnreadable) throw error;
    throw new LinkUnreadable(
      signal.aborted ? "This page took too long to answer." : "Smart add couldn't reach this page.",
      { cause: error },
    );
  }
  if (response.headers.get("tdm-reservation")?.trim() === "1") {
    await response.body?.cancel();
    throw new LinkRefused("tdm");
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new LinkUnreadable("Smart add couldn't open this page.");
  }
  const type = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
    await response.body?.cancel();
    throw new LinkUnreadable("This link isn't a web page Smart add can read.");
  }
  let bytes: Uint8Array | null;
  try {
    bytes = await bounded(response, MAX_PAGE_BYTES);
  } catch (error) {
    throw new LinkUnreadable("This page took too long to answer.", { cause: error });
  }
  if (!bytes) throw new LinkUnreadable("This page is too large for Smart add to read.");
  const html = decode(bytes, type);
  if (/<meta[^>]+name=["']?tdm-reservation["']?[^>]+content=["']?1["']?/i.test(html))
    throw new LinkRefused("tdm");
  return { url, html, title: pageTitle(html) ?? url.hostname.replace(/^www\./, "") };
}

/** The page's text in the charset its header or its own meta tag names, UTF-8 otherwise. */
function decode(bytes: Uint8Array, contentType: string): string {
  const declared =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(
      new TextDecoder("latin1").decode(bytes.subarray(0, 4096)),
    )?.[1];
  try {
    return new TextDecoder(declared ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function unescapeHtml(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code =
        name[1]?.toLowerCase() === "x" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/** The page's own title: its Open Graph title, or its `<title>`. */
export function pageTitle(html: string): string | null {
  const og =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ??
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i.exec(html)?.[1];
  const title = og ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
  const clean = title ? unescapeHtml(title).replace(/\s+/g, " ").trim() : "";
  return clean ? clean.slice(0, 300) : null;
}

/** Which part of the page holds the article, so menus and footers stay out of the read. */
export function articleSelector(html: string): string | undefined {
  if (/<article[\s>]/i.test(html)) return "article";
  if (/<main[\s>]/i.test(html)) return "main";
  return undefined;
}

/** Markdown as plain sentences, in reading order, with links and images reduced to their words. */
export function markdownSentences(markdown: string): string[] {
  const sentences: string[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });
  for (const raw of markdown.split(/\n/)) {
    const line = raw
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/, "")
      .replace(/^\s*([-*_]\s*){3,}$/, "")
      .replace(/\*\*|__|`+/g, "")
      .replace(/(^|\s)[*_](\S)/g, "$1$2")
      .replace(/(\S)[*_](\s|$|[.,;:!?])/g, "$1$2")
      .replace(/\s*\|\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!line) continue;
    for (const { segment } of segmenter.segment(line)) {
      const sentence = segment.trim();
      if (/\p{L}/u.test(sentence)) sentences.push(sentence);
    }
  }
  return sentences;
}

/** Words in text, counted by the language's own word breaks so text without spaces counts too. */
export function countWords(text: string): number {
  let n = 0;
  for (const part of new Intl.Segmenter(undefined, { granularity: "word" }).segment(text))
    if (part.isWordLike) n++;
  return n;
}

/** The page as Markdown through Workers AI, from its article alone where the page marks one. */
export async function pageMarkdown(
  env: { AI?: Ai | undefined } & HealthEnv,
  page: FetchedPage,
): Promise<string> {
  const ai = env.AI;
  if (!ai) throw new Error("Workers AI is not configured");
  const selector = articleSelector(page.html);
  const result = await metered(env, "workers_ai", () =>
    ai.toMarkdown(
      { name: "page.html", blob: new Blob([page.html], { type: "text/html" }) },
      {
        conversionOptions: {
          html: {
            hostname: page.url.hostname,
            images: { convert: false, convertOGImage: false },
            ...(selector ? { cssSelector: selector } : {}),
          },
        },
      },
    ),
  );
  if (result.format === "error")
    throw new Error(`The page could not be converted: ${result.error}`);
  return result.data;
}
