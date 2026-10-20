import {
  CLIENT_HEADER,
  compareVersions,
  isClientVersion,
  type PhonePlatform,
  parseClientHeader,
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
export const EXAMPLE_PINYIN_SINCE: ShownSince = { ios: "0.0.3" };

/** Inline pinyin as it reads in JSON, so a response without any skips the parse. */
const INLINE_PINYIN = /\p{Script=Han}\[[\p{Script=Latin}]/u;

/** A JSON value with the pinyin taken out of the example of every card in a pinyin language. */
export function withoutExamplePinyin(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutExamplePinyin);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = withoutExamplePinyin(item);
  const { example, language } = out;
  if (typeof example === "string" && typeof language === "string") {
    if (readingEngine(language) === "pinyin") out.example = stripReadings(example, language);
  }
  return out;
}

/**
 * Takes example pinyin out of every JSON answer to a phone release that would show its brackets as
 * text. Until the minimum version passes EXAMPLE_PINYIN_SINCE this runs on each such request. ADR 0032.
 */
export const leaveOutExamplePinyin: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  if (!c.get("phone") || clientSupports(c, EXAMPLE_PINYIN_SINCE)) return;
  if (!c.res.headers.get("content-type")?.includes("application/json")) return;
  const text = await c.res.clone().text();
  if (!INLINE_PINYIN.test(text)) return;
  const headers = new Headers(c.res.headers);
  headers.delete("content-length");
  c.res = new Response(JSON.stringify(withoutExamplePinyin(JSON.parse(text))), {
    status: c.res.status,
    headers,
  });
};
