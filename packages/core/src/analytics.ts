import { z } from "zod";
import { AnalyticsConsentInput, ReviewModeKey } from "./types";

export const ANALYTICS_SCHEMA_VERSION = 1;
export const INTERNAL_ACCOUNT_IDS = new Set([
  "Sy33E3cu1TD0UiFIdaSKoEMuU18ekAQR",
  "rzJcULGYA5d4Ah4Ci3xWz7nNjb6ZZChy",
  "Ke5PiWMwvkod6tYTzX5oUWi3gz5haGuI",
]);
export { ANALYTICS_CONSENT_VERSION } from "./types";
export const CONSENT_COOKIE = "lymi_analytics_consent";
export const IDENTITY_COOKIE = "lymi_analytics_identity";
export const ATTRIBUTION_COOKIE = "lymi_analytics_attribution";
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60;
export const AnalyticsLocale = z.enum(["en", "uk", "ru"]);
const session = { session_id: z.uuid() };
const count = z.number().int().nonnegative().max(1_000_000);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120);
const source = z.enum([
  "anki",
  "mochi",
  "lymi",
  "csv",
  "quizlet",
  "ai_mcp",
  "typed",
  "api",
  "unknown",
]);
const step = z.enum([
  "hello",
  "kind",
  "language",
  "goal",
  "start",
  "setup",
  "deck",
  "cards",
  "review",
]);
function approvedPath(value: string): string {
  if (/^(?:\/(uk|ru))?\/explore\/[a-z0-9-]+$/.test(value)) return analyticsPath(value, "public");
  const product = analyticsPath(value, "product");
  return product !== "/other" ? product : analyticsPath(value, "public");
}
const path = z.string().max(200).transform(approvedPath);
const campaign = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
export const Attribution = z.object({
  first_landing_page: path,
  referrer: z.string().max(253).optional(),
  utm_source: campaign.optional(),
  utm_medium: campaign.optional(),
  utm_campaign: campaign.optional(),
});

export const analyticsEvents = {
  $pageview: z.object({ pathname: path }),
  app_opened: z.object({}),
  onboarding_finished: z.object({
    kind: z.enum(["language", "test", "subject", "other", "skipped", "joined"]),
  }),
  signed_up: Attribution.extend({ method: z.enum(["google", "email"]) }),
  signed_in: z.object({}),
  review_graded: z.object({ mode: ReviewModeKey, grade: z.number().int().min(1).max(4) }),
  review_session_finished: z.object({
    ...session,
    card_count: count,
    is_first_session: z.boolean(),
    ending: z.enum(["goal", "empty"]),
  }),
  review_session_abandoned: z.object({
    ...session,
    cards_done: count,
    card_count: count,
    is_first_session: z.boolean(),
    reason: z.enum(["left", "navigation", "pagehide"]),
  }),
  first_session_started: z.object({ deck_slug: slug }),
  cards_added: z.object({ source, count }),
  card_added: z.object({ source: z.enum(["manual", "api", "mcp", "import"]), count }),
  welcome_step_viewed: z.object({ step_name: step, skipped: z.boolean() }),
  welcome_step_finished: z.object({ step_name: step, skipped: z.boolean() }),
  empty_state_option_picked: z.object({
    option: z.enum(["create_deck", "typed", "ai_mcp", "api", "explore", "import"]),
  }),
  import_started: z.object({
    source,
    card_count: count,
    adapter: z.enum(["anki", "mochi", "lymi", "unknown"]),
    outcome: z.literal("started"),
  }),
  import_finished: z.object({
    source,
    card_count: count,
    adapter: z.enum(["anki", "mochi", "lymi", "unknown"]),
    outcome: z.enum(["done", "failed"]),
  }),
  import_failed: z.object({ source, card_count: count }),
  daily_goal_set: z.object({ value: z.number().int().min(1).max(200), is_change: z.boolean() }),
  reminder_prompt_shown: z.object({}),
  reminder_prompt_accepted: z.object({}),
  public_deck_viewed: z.object({ deck_slug: slug, locale: AnalyticsLocale }),
  add_to_lymi_clicked: z.object({ deck_slug: slug }),
  deck_added: z.object({ deck_slug: slug }),
  deck_joined: z.object({}),
  mcp_tool: z.object({
    tool: z.string().regex(/^[a-z_]{1,80}$/),
    outcome: z.enum(["success", "error"]),
    duration_ms: z.number().nonnegative().max(3_600_000),
  }),
  enrichment_finished: z.object({ outcome: z.enum(["enriched", "empty", "failed"]), count }),
} as const;
export type AnalyticsName = keyof typeof analyticsEvents;
export type AnalyticsProperties<N extends AnalyticsName> = z.infer<(typeof analyticsEvents)[N]>;
export type ProductAnalyticsEvent = {
  [N in AnalyticsName]: AnalyticsProperties<N> extends Record<string, never>
    ? { name: N }
    : { name: N } & AnalyticsProperties<N>;
}[AnalyticsName];

export const analyticsProducers = {
  $pageview: ["browser"],
  app_opened: ["browser"],
  signed_up: ["worker"],
  signed_in: ["worker"],
  onboarding_finished: ["worker"],
  review_graded: ["worker"],
  review_session_finished: ["browser"],
  review_session_abandoned: ["browser"],
  first_session_started: ["worker"],
  cards_added: ["worker"],
  card_added: ["worker"],
  welcome_step_viewed: ["browser"],
  welcome_step_finished: ["browser", "worker"],
  empty_state_option_picked: ["browser"],
  import_started: ["worker"],
  import_finished: ["worker"],
  import_failed: ["worker"],
  daily_goal_set: ["worker"],
  reminder_prompt_shown: ["browser"],
  reminder_prompt_accepted: ["browser"],
  public_deck_viewed: ["browser"],
  add_to_lymi_clicked: ["browser"],
  deck_added: ["worker"],
  deck_joined: ["worker"],
  mcp_tool: ["worker"],
  enrichment_finished: ["worker"],
} satisfies Record<AnalyticsName, readonly ("browser" | "worker")[]>;

export function eventProperties(
  name: string,
  properties: unknown,
  producer?: "browser" | "worker",
): Record<string, unknown> | null {
  if (!Object.hasOwn(analyticsEvents, name)) return null;
  if (
    producer &&
    !(analyticsProducers[name as AnalyticsName] as readonly string[]).includes(producer)
  )
    return null;
  const result = analyticsEvents[name as AnalyticsName].safeParse(properties);
  return result.success ? result.data : null;
}

export const AnalyticsConsent = AnalyticsConsentInput;
export type AnalyticsConsent = z.infer<typeof AnalyticsConsent>;

export function readCookie(header: string, name: string): string | undefined {
  const part = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  try {
    return part ? decodeURIComponent(part.slice(name.length + 1)) : undefined;
  } catch {
    return undefined;
  }
}

export function readConsent(header: string, now = Date.now()): AnalyticsConsent | null {
  try {
    const result = AnalyticsConsent.safeParse(
      JSON.parse(readCookie(header, CONSENT_COOKIE) ?? "null"),
    );
    if (
      !result.success ||
      result.data.updated_at > now + 60_000 ||
      now - result.data.updated_at > CONSENT_MAX_AGE * 1000
    )
      return null;
    return result.data;
  } catch {
    return null;
  }
}

export function analyticsPath(path: string, surface: "public" | "product"): string {
  if (surface === "public") {
    const clean = path.replace(/^\/(uk|ru)(?=\/|$)/, "") || "/";
    if (/^\/explore\/[a-z0-9-]+$/.test(clean)) return path.slice(0, 200);
    if (
      /^\/(?:docs(?:\/[a-z0-9-]+)*|languages(?:\/[a-z0-9-]+)?|ai-assistants|teachers|explore|privacy|terms|support|signup|learn(?:\/[a-z0-9-]+)?)?$/.test(
        clean,
      )
    )
      return path.slice(0, 200);
    return "/other";
  }
  const routes = [
    "/login",
    "/signup",
    "/today",
    "/welcome",
    "/library",
    "/review",
    "/settings",
    "/insights",
    "/activity",
    "/explore",
    "/archived",
    "/import",
    "/add",
    "/join",
  ];
  const base = routes.find((route) => path === route || path.startsWith(`${route}/`));
  return base ? (path === base ? base : `${base}/:item`) : "/other";
}

export function firstTouch(url: string, referrer: string, surface: "public" | "product") {
  const parsed = new URL(url);
  const result: z.infer<typeof Attribution> = {
    first_landing_page: analyticsPath(parsed.pathname, surface),
  };
  try {
    const hostname = new URL(referrer).hostname;
    if (hostname !== "lymi.app" && !hostname.endsWith(".lymi.app")) result.referrer = hostname;
  } catch {
    /* Direct visits have no referrer. */
  }
  for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const value = campaign.safeParse(parsed.searchParams.get(key));
    if (value.success) result[key] = value.data;
  }
  return result;
}

export function signupAttribution(header: string): ReturnType<typeof firstTouch> {
  try {
    const result = Attribution.safeParse(
      JSON.parse(readCookie(header, ATTRIBUTION_COOKIE) ?? "null"),
    );
    if (result.success) {
      const data = result.data;
      if (data.referrer && !/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/.test(data.referrer))
        delete data.referrer;
      return data;
    }
  } catch {
    /* Untrusted cookies are optional attribution. */
  }
  return { first_landing_page: "/other" };
}
