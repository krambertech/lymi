/**
 * The phone names itself on every request in this header, so the Worker can tell an installed
 * release it is too old and leave out what it cannot show yet. The web, API keys and MCP send
 * none. ADR 0032.
 */
export const CLIENT_HEADER = "x-lymi-client";

/** The 426 body's `code` when the phone is below the minimum version. */
export const UPDATE_REQUIRED = "update_required";

export const PHONE_PLATFORMS = ["ios", "android"] as const;
export type PhonePlatform = (typeof PHONE_PLATFORMS)[number];

/** What the header carries: the platform, the app's version, its native build and its update. No personal data. */
export interface PhoneClient {
  platform: PhonePlatform;
  version: string;
  build?: string | undefined;
  update?: string | undefined;
}

const VERSION = /^\d{1,4}(\.\d{1,4}){0,2}$/;
const TOKEN = /^[A-Za-z0-9._-]{1,64}$/;

/** `platform=ios; version=1.2.0; build=34; update=<id>`, with build and update left out when unknown. */
export function formatClientHeader(client: PhoneClient): string {
  return Object.entries(client)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

/** The header's client, or null when it is missing or malformed, which the Worker treats alike. */
export function parseClientHeader(header: string | null | undefined): PhoneClient | null {
  if (!header) return null;
  const fields = new Map<string, string>();
  for (const pair of header.split(";")) {
    const [key, value, ...rest] = pair.split("=").map((part) => part.trim());
    if (!key || !value || rest.length) return null;
    fields.set(key, value);
  }
  const platform = fields.get("platform");
  const version = fields.get("version");
  if (!PHONE_PLATFORMS.includes(platform as PhonePlatform)) return null;
  if (!version || !VERSION.test(version)) return null;
  const build = fields.get("build");
  const update = fields.get("update");
  return {
    platform: platform as PhonePlatform,
    version,
    ...(build && TOKEN.test(build) ? { build } : {}),
    ...(update && TOKEN.test(update) ? { update } : {}),
  };
}

/** Compares dotted versions part by part, a missing part counting as 0: `1.2` equals `1.2.0`. */
export function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

/** Whether `version` is a version the header may carry, so configuration can be checked with it. */
export function isClientVersion(version: string): boolean {
  return VERSION.test(version);
}
