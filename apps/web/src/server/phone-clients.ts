import {
  CLIENT_HEADER,
  compareVersions,
  isClientVersion,
  type PhonePlatform,
  parseClientHeader,
  type ReadingEngine,
  readingEngine,
  stripReadings,
  UPDATE_REQUIRED,
} from "@lymi/core";
import type { Context, MiddlewareHandler } from "hono";
import type { Bindings } from "./env";
import type { AppEnv } from "./index";

/** The oldest release of a platform the Worker still serves, and where a newer one comes from. */
function releaseOf(env: Bindings, platform: PhonePlatform) {
  if (platform !== "ios") return null;
  return { minimum: env.PHONE_MINIMUM_VERSION_IOS, updateUrl: env.PHONE_UPDATE_URL_IOS };
}

/**
 * Tells a phone release below its platform's minimum to update, with 426. A request without
 * the header, from the web, an API key or MCP, passes as it always has. ADR 0032.
 */
export const requireSupportedPhone: MiddlewareHandler<AppEnv> = async (c, next) => {
  const phone = parseClientHeader(c.req.header(CLIENT_HEADER));
  if (!phone) return next();
  c.set("phone", phone);
  const release = releaseOf(c.env, phone.platform);
  if (release?.minimum && isClientVersion(release.minimum)) {
    if (compareVersions(phone.version, release.minimum) < 0) {
      c.header("cache-control", "no-store");
      return c.json(
        {
          error: "This version of Lymi is no longer supported. Update the app to continue.",
          code: UPDATE_REQUIRED,
          ...(release.updateUrl ? { updateUrl: release.updateUrl } : {}),
        },
        426,
      );
    }
  }
  return next();
};

/** The first release of each platform that shows a value; a platform left out has none yet. */
export type ShownSince = Partial<Record<PhonePlatform, string>>;

/**
 * Whether the caller can show a value the web added first, so a route leaves it out of an older
 * phone's response. Every caller without the header can. docs/testing.md#the-contract-check.
 */
export function clientSupports(c: Context<AppEnv>, since: ShownSince): boolean {
  const phone = c.get("phone");
  if (!phone) return true;
  const first = since[phone.platform];
  return first !== undefined && compareVersions(phone.version, first) >= 0;
}

/** The first phone release that draws pinyin in a Chinese example. docs/proposals/chinese.md, slice 4. */
export const EXAMPLE_PINYIN_SINCE: ShownSince = { ios: "0.0.5" };

/** The first phone release that draws Jyutping in a Cantonese example. docs/proposals/cantonese.md. */
export const EXAMPLE_JYUTPING_SINCE: ShownSince = { ios: "0.0.7" };

/** Each engine whose inline example readings an older phone would show as text, with the first release that draws them. */
const EXAMPLE_READINGS_SINCE: Partial<Record<ReadingEngine, ShownSince>> = {
  pinyin: EXAMPLE_PINYIN_SINCE,
  jyutping: EXAMPLE_JYUTPING_SINCE,
};

/** Inline pinyin or Jyutping as it reads in JSON, so a response without any skips the parse. */
const INLINE_SYLLABLES = /\p{Script=Han}\[[\p{Script=Latin}]/u;

/** A JSON value with the readings taken out of the example of every card whose language draws them in one of `engines`. */
export function withoutExampleReadings(
  value: unknown,
  engines: ReadonlySet<ReadingEngine>,
): unknown {
  if (Array.isArray(value)) return value.map((item) => withoutExampleReadings(item, engines));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = withoutExampleReadings(item, engines);
  const { example, language } = out;
  if (typeof example === "string" && typeof language === "string") {
    const engine = readingEngine(language);
    if (engine && engines.has(engine)) out.example = stripReadings(example, language);
  }
  return out;
}

/**
 * Takes example pinyin and Jyutping out of every JSON answer to a phone release that would show
 * their brackets as text. Until the minimum version passes each engine's release this runs on each
 * such request. ADR 0032.
 */
export const leaveOutExampleReadings: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  if (!c.get("phone")) return;
  const engines = new Set(
    Object.entries(EXAMPLE_READINGS_SINCE).flatMap(([engine, since]) =>
      clientSupports(c, since) ? [] : [engine as ReadingEngine],
    ),
  );
  if (engines.size === 0) return;
  if (!c.res.headers.get("content-type")?.includes("application/json")) return;
  const text = await c.res.clone().text();
  if (!INLINE_SYLLABLES.test(text)) return;
  const headers = new Headers(c.res.headers);
  headers.delete("content-length");
  c.res = new Response(JSON.stringify(withoutExampleReadings(JSON.parse(text), engines)), {
    status: c.res.status,
    headers,
  });
};

/** The first phone release that lists the example's translation among a deck's AI fields. */
export const EXAMPLE_TRANSLATION_SINCE: ShownSince = { ios: "0.0.9" };

/** A JSON value with the example's translation taken out of every deck's `enrichFields`. */
export function withoutTranslationField(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutTranslationField);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] =
      key === "enrichFields" && Array.isArray(item)
        ? item.filter((field) => field !== "exampleTranslation")
        : withoutTranslationField(item);
  }
  return out;
}

/** Leaves the translation out of a deck's AI fields for a release whose frozen contract lists them as a closed set. */
export const leaveOutTranslationField: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  if (!c.get("phone") || clientSupports(c, EXAMPLE_TRANSLATION_SINCE)) return;
  if (!c.res.headers.get("content-type")?.includes("application/json")) return;
  const text = await c.res.clone().text();
  if (!text.includes('"enrichFields"') || !text.includes('"exampleTranslation"')) return;
  const headers = new Headers(c.res.headers);
  headers.delete("content-length");
  c.res = new Response(JSON.stringify(withoutTranslationField(JSON.parse(text))), {
    status: c.res.status,
    headers,
  });
};
