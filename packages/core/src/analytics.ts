import { z } from "zod";
import { ReviewModeKey } from "./types";

export const ANALYTICS_SCHEMA_VERSION = 1;
export const INTERNAL_ACCOUNT_IDS = new Set([
  "Sy33E3cu1TD0UiFIdaSKoEMuU18ekAQR",
  "rzJcULGYA5d4Ah4Ci3xWz7nNjb6ZZChy",
  "Ke5PiWMwvkod6tYTzX5oUWi3gz5haGuI",
]);
export { ANALYTICS_CONSENT_VERSION } from "./types";
/** Carries the visit's first touch with a sign-up request, since no cookie does. */
export const FIRST_TOUCH_HEADER = "x-lymi-first-touch";
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
const host = z
  .string()
  .max(253)
  .regex(/^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/);
const source_fields = {
  referrer: host.optional().catch(undefined),
  utm_source: campaign.optional().catch(undefined),
  utm_medium: campaign.optional().catch(undefined),
  utm_campaign: campaign.optional().catch(undefined),
};
export const Attribution = z.object({ first_landing_page: path, ...source_fields });
export type Attribution = z.infer<typeof Attribution>;

export const analyticsEvents = {
  $pageview: z.object({ pathname: path, ...source_fields }),
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

/** Query parameters a public page adds to its links so the product learns where a visit began. */
const CARRIED = { referrer: "ref", landing: "lp" } as const;
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

function externalHost(value: string | null | undefined): string | undefined {
  if (!value) return;
  try {
    const hostname = value.includes("/") ? new URL(value).hostname : value.toLowerCase();
    if (hostname === "lymi.app" || hostname.endsWith(".lymi.app")) return;
    return host.safeParse(hostname).data;
  } catch {
    return;
  }
}

/**
 * Where this visit began: a source carried from a public page's link wins over this page's own
 * landing path and referrer.
 */
export function firstTouch(
  url: string,
  referrer: string,
  surface: "public" | "product",
): Attribution {
  const parsed = new URL(url);
  const params = parsed.searchParams;
  const carried = params.get(CARRIED.landing);
  const result: Attribution = {
    first_landing_page: carried
      ? analyticsPath(carried, "public")
      : analyticsPath(parsed.pathname, surface),
  };
  const source = externalHost(params.get(CARRIED.referrer)) ?? externalHost(referrer);
  if (source) result.referrer = source;
  for (const key of CAMPAIGN_KEYS) {
    const value = campaign.safeParse(params.get(key));
    if (value.success) result[key] = value.data;
  }
  return result;
}

/** Adds a visit's source to a link that leaves the page, unless the link already names one. */
export function carryFirstTouch(target: URL, touch: Attribution): URL {
  const params = target.searchParams;
  if (params.has(CARRIED.landing) || CAMPAIGN_KEYS.some((key) => params.has(key))) return target;
  if (!touch.referrer && !CAMPAIGN_KEYS.some((key) => touch[key])) return target;
  params.set(CARRIED.landing, touch.first_landing_page);
  if (touch.referrer) params.set(CARRIED.referrer, touch.referrer);
  for (const key of CAMPAIGN_KEYS) if (touch[key]) params.set(key, touch[key]);
  return target;
}

/** Reads a first touch that arrived from the browser, which can send anything. */
export function parseFirstTouch(value: unknown): Attribution {
  try {
    const result = Attribution.safeParse(typeof value === "string" ? JSON.parse(value) : value);
    if (result.success) return result.data;
  } catch {
    /* Attribution is optional. */
  }
  return { first_landing_page: "/other" };
}
