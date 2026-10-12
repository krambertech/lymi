import {
  CLIENT_HEADER,
  compareVersions,
  isClientVersion,
  type PhonePlatform,
  parseClientHeader,
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
