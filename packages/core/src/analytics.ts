import { z } from "zod";
import { DECK_PURPOSES } from "./enrichment";
import { ReviewAid, ReviewModeKey } from "./types";

export const ANALYTICS_SCHEMA_VERSION = 1;
export const INTERNAL_ACCOUNT_IDS = new Set([
  "Sy33E3cu1TD0UiFIdaSKoEMuU18ekAQR",
  "rzJcULGYA5d4Ah4Ci3xWz7nNjb6ZZChy",
  "Ke5PiWMwvkod6tYTzX5oUWi3gz5haGuI",
]);
export { ANALYTICS_CONSENT_VERSION } from "./types";
/** Carries the visit's first touch with a sign-up request, since no cookie does. */
export const FIRST_TOUCH_HEADER = "x-lymi-first-touch";
/** The phone's lists whose rows open a context menu on a long press. */
export const CONTEXT_MENU_SURFACES = [
  "card_row",
  "deck_row",
  "today_row",
  "section_heading",
  "explore_deck",
  "series_row",
  "archived_row",
] as const;
export type ContextMenuSurface = (typeof CONTEXT_MENU_SURFACES)[number];
/** What a context menu row does, as a fixed name rather than its label. */
export const CONTEXT_MENU_ACTIONS = [
  "open",
  "review",
  "add_card",
  "play",
  "important",
  "edit",
  "move_section",
  "move_deck",
  "archive",
  "start_section",
  "rename_section",
  "reorder_sections",
  "add_to_library",
  "restore",
] as const;
export type ContextMenuAction = (typeof CONTEXT_MENU_ACTIONS)[number];
export const AnalyticsLocale = z.enum(["en", "uk", "ru"]);
/** What a review leg was opened for. */
export const REVIEW_SCOPES = ["day", "deck", "series", "section", "round", "chosen"] as const;
export type ReviewScopeKind = (typeof REVIEW_SCOPES)[number];
const session = { session_id: z.uuid(), scope: z.enum(REVIEW_SCOPES).optional() };
const count = z.number().int().nonnegative().max(1_000_000);
/** The optional fields a typed card can arrive holding, by name; never their text. */
export const TYPED_CARD_FIELDS = [
  "example",
  "pronunciation",
  "notes",
  "hook",
  "source",
  "tags",
  "section",
  "review_modes",
] as const;
export type TypedCardField = (typeof TYPED_CARD_FIELDS)[number];
/** The fields a chip adds to the web card form. */
const FORM_FIELDS = ["notes", "example", "pronunciation", "source", "picture", "hook"] as const;
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120);
const source = z.enum([
  "anki",
  "mochi",
  "noji",
  "lymi",
  "csv",
  "quizlet",
  "ai_mcp",
  "typed",
  "lesson",
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
  const page = analyticsPath(value, "public");
  return page !== "/other" ? page : analyticsPath(value, "product");
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
export const Backlog = z.enum(["0", "1-20", "21-100", "100+"]);
export type Backlog = z.infer<typeof Backlog>;

/** Due cards in a few bands, so a pile-up shows without sending the exact count. */
export function backlogOf(due: number): Backlog {
  return due <= 0 ? "0" : due <= 20 ? "1-20" : due <= 100 ? "21-100" : "100+";
}
/** Added to a reminder's link so the app it opens can say a reminder brought the learner. */
export const REMINDER_ENTRY = { key: "lymi_entry", value: "reminder" } as const;

type TextPrice = { input: number; cachedInput: number; output: number };

/** USD per million tokens, from the vendors' price lists, so a call's cost never waits on PostHog's table. */
const TEXT_PRICES: Record<string, TextPrice & { longPrompt?: TextPrice & { above: number } }> = {
  "gpt-6-luna": { input: 0.1, cachedInput: 0.01, output: 0.5 },
  // Anthropic prices a Haiku 5.5 prompt over 100,000 tokens, cache reads included, at five times.
  "claude-haiku-5-5": {
    input: 0.1,
    cachedInput: 0.01,
    output: 0.5,
    longPrompt: { above: 100_000, input: 0.5, cachedInput: 0.05, output: 2.5 },
  },
};

/** A text call's cost in USD, or nothing for a model without a known price. */
export function textCallCost(
  model: string,
  tokens: { input: number; cached?: number | undefined; output: number },
): { input: number; output: number } | undefined {
  const listed = TEXT_PRICES[model];
  if (!listed) return;
  const price =
    listed.longPrompt && tokens.input > listed.longPrompt.above ? listed.longPrompt : listed;
  const cached = Math.min(tokens.cached ?? 0, tokens.input);
  return {
    input: ((tokens.input - cached) * price.input + cached * price.cachedInput) / 1e6,
    output: (tokens.output * price.output) / 1e6,
  };
}
const usd = z.number().nonnegative().max(1000);
/** The scheduler's card state before a grade, by its number in ts-fsrs. */
export const CARD_STATES = ["new", "learning", "review", "relearning"] as const;
const tokens = z.number().int().nonnegative().max(10_000_000);
export type Attribution = z.infer<typeof Attribution>;

export const analyticsEvents = {
  $pageview: z.object({ pathname: path, ...source_fields }),
  app_opened: z.object({
    entry: z.enum(["reminder", "link", "direct"]).optional(),
    backlog: Backlog.optional(),
  }),
  onboarding_finished: z.object({
    kind: z.enum(["language", "test", "subject", "other", "skipped", "joined"]),
  }),
  signed_up: Attribution.extend({ method: z.enum(["google", "apple", "email"]) }),
  signed_in: z.object({}),
  review_graded: z.object({
    mode: ReviewModeKey,
    grade: z.number().int().min(1).max(4),
    state: z.enum(CARD_STATES).optional(),
    aid: ReviewAid.optional(),
    reading: z.enum(["cue", "answer"]).optional(),
  }),
  review_undone: z.object({
    mode: ReviewModeKey.optional(),
    grade: z.number().int().min(1).max(4),
  }),
  streak_ended: z.object({ streak_days: count }),
  rest_day_used: z.object({ streak_days: count }),
  hook_added: z.object({ source: z.enum(["lesson", "ai", "manual"]) }),
  cards_archived: z.object({
    origin: z.enum(["typed", "api", "ai_mcp", "import", "other"]),
    count,
    ai_written: count,
  }),
  reminder_sent: z.object({ backlog: Backlog }),
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
  cards_added: z.object({
    source,
    count,
    fields: z.array(z.enum(TYPED_CARD_FIELDS)).max(TYPED_CARD_FIELDS.length).optional(),
  }),
  card_added: z.object({ source: z.enum(["manual", "api", "mcp", "import"]), count }),
  welcome_step_viewed: z.object({ step_name: step, skipped: z.boolean() }),
  welcome_step_finished: z.object({ step_name: step, skipped: z.boolean() }),
  empty_state_option_picked: z.object({
    option: z.enum(["create_deck", "typed", "lesson", "ai_mcp", "api", "explore", "import"]),
  }),
  import_started: z.object({
    source,
    card_count: count,
    adapter: z.enum(["anki", "mochi", "noji", "lymi", "quizlet", "unknown"]),
    outcome: z.literal("started"),
  }),
  import_finished: z.object({
    source,
    card_count: count,
    adapter: z.enum(["anki", "mochi", "noji", "lymi", "quizlet", "unknown"]),
    outcome: z.enum(["done", "failed"]),
  }),
  import_failed: z.object({ source, card_count: count }),
  export_started: z.object({
    format: z.enum(["lymi", "anki"]),
    scope: z.enum(["deck", "library"]),
  }),
  daily_goal_set: z.object({ value: z.number().int().min(1).max(200), is_change: z.boolean() }),
  reminder_prompt_shown: z.object({}),
  reminder_prompt_accepted: z.object({}),
  public_deck_viewed: z.object({ deck_slug: slug, locale: AnalyticsLocale }),
  add_to_lymi_clicked: z.object({ deck_slug: slug }),
  origin_badge_shown: z.object({ badge: z.enum(["ukraine", "estonia"]) }),
  context_menu_action: z.object({
    menu: z.enum(CONTEXT_MENU_SURFACES),
    action: z.enum(CONTEXT_MENU_ACTIONS),
  }),
  deck_added: z.object({ deck_slug: slug }),
  deck_joined: z.object({}),
  mcp_tool: z.object({
    tool: z.string().regex(/^[a-z_]{1,80}$/),
    outcome: z.enum(["success", "error"]),
    duration_ms: z.number().nonnegative().max(3_600_000),
  }),
  enrichment_finished: z.object({
    outcome: z.enum(["enriched", "empty", "failed"]),
    count,
    trigger: z.enum(["add", "card"]).optional(),
    has_instructions: z.boolean().optional(),
    samples: count.optional(),
    skipped: count.optional(),
    readings_added: count.optional(),
    prompt_version: z.number().int().positive().max(1000).optional(),
  }),
  deck_enrichment_changed: z.object({
    meaning: z.boolean(),
    example: z.boolean(),
    notes: z.boolean(),
    pronunciation: z.boolean(),
    has_instructions: z.boolean(),
  }),
  deck_purpose_set: z.object({
    purpose: z.enum(DECK_PURPOSES),
    created: z.boolean(),
    channel: z.enum(["app", "api", "mcp"]),
  }),
  lesson_read_limited: z.object({}),
  lesson_read: z.object({
    client: z.enum(["web", "phone"]),
    pages: count,
    pasted: z.boolean(),
    deck: z.enum(["fixed", "guessed"]),
    terms: count,
    ticked: count,
    existing: count,
    questions: count,
  }),
  // PostHog's LLM analytics shape, without $ai_input or $ai_output_choices: no prompt or reply leaves.
  $ai_generation: z.object({
    $ai_trace_id: z.uuid(),
    $ai_session_id: z.null(),
    $ai_span_name: z.enum(["enrich", "hook", "import_languages", "deck_choice", "lesson_read"]),
    $ai_provider: z.enum(["openai", "anthropic"]),
    $ai_model: z.string().regex(/^[\w.:/-]{1,80}$/),
    $ai_input_tokens: tokens,
    $ai_output_tokens: tokens,
    $ai_reasoning_tokens: tokens.optional(),
    $ai_cache_read_input_tokens: tokens.optional(),
    $ai_input_cost_usd: usd.optional(),
    $ai_output_cost_usd: usd.optional(),
    $ai_total_cost_usd: usd.optional(),
    $ai_latency: z.number().nonnegative().max(600),
    $ai_is_error: z.boolean(),
    $ai_http_status: z.number().int().min(100).max(599).optional(),
  }),
  card_importance_set: z.object({
    important: z.boolean(),
    channel: z.enum(["app", "api", "mcp"]),
    count: count.optional(),
  }),
  entry_opened: z.object({
    entry: z.enum(["control", "shortcut", "quick_action", "widget"]),
    place: z.enum(["add", "review", "search"]),
  }),
  tag_added: z.object({
    via: z.enum(["suggestion", "typed"]),
    in_use: z.boolean(),
  }),
  card_field_added: z.object({
    field: z.enum(FORM_FIELDS),
    form: z.enum(["add", "edit"]),
  }),
  deck_filter_added: z.object({ kind: z.enum(["state", "due", "section", "tag"]) }),
  section_go_to: z.object({}),
  pronunciation_played: z.object({
    outcome: z.enum(["played", "failed"]),
    revealed: z.boolean(),
  }),
  deck_tag_changed: z.object({
    action: z.enum(["rename", "merge", "archive", "restore"]),
    channel: z.enum(["app", "api", "mcp"]),
    cards: Backlog,
  }),
  cards_tagged: z.object({
    cards: Backlog,
    added: z.number().int().min(0),
    removed: z.number().int().min(0),
  }),
  account_deleted: z.object({
    client: z.enum(["web", "phone"]),
    confirmed_with: z.enum(["email", "apple"]),
    kept_decks: count,
  }),
} as const;
export type AnalyticsName = keyof typeof analyticsEvents;
export type AnalyticsProperties<N extends AnalyticsName> = z.infer<(typeof analyticsEvents)[N]>;
export type ProductAnalyticsEvent = {
  [N in AnalyticsName]: AnalyticsProperties<N> extends Record<string, never>
    ? { name: N }
    : { name: N } & AnalyticsProperties<N>;
}[AnalyticsName];

export type AnalyticsProducer = "browser" | "phone" | "worker";
export const analyticsProducers = {
  $pageview: ["browser", "phone"],
  app_opened: ["browser", "phone"],
  signed_up: ["worker"],
  signed_in: ["worker"],
  onboarding_finished: ["worker"],
  review_graded: ["worker"],
  review_undone: ["worker"],
  streak_ended: ["worker"],
  rest_day_used: ["worker"],
  hook_added: ["worker"],
  cards_archived: ["worker"],
  reminder_sent: ["worker"],
  review_session_finished: ["browser", "phone"],
  review_session_abandoned: ["browser", "phone"],
  first_session_started: ["worker"],
  cards_added: ["worker"],
  card_added: ["worker"],
  welcome_step_viewed: ["browser", "phone"],
  welcome_step_finished: ["browser", "phone", "worker"],
  empty_state_option_picked: ["browser", "phone"],
  import_started: ["worker"],
  import_finished: ["worker"],
  import_failed: ["worker"],
  export_started: ["worker"],
  daily_goal_set: ["worker"],
  reminder_prompt_shown: ["browser"],
  reminder_prompt_accepted: ["browser"],
  public_deck_viewed: ["browser"],
  add_to_lymi_clicked: ["browser"],
  origin_badge_shown: ["browser"],
  context_menu_action: ["phone"],
  deck_added: ["worker"],
  deck_joined: ["worker"],
  mcp_tool: ["worker"],
  enrichment_finished: ["worker"],
  lesson_read: ["worker"],
  lesson_read_limited: ["worker"],
  $ai_generation: ["worker"],
  card_importance_set: ["worker"],
  tag_added: ["browser"],
  card_field_added: ["browser"],
  deck_filter_added: ["browser"],
  section_go_to: ["phone"],
  pronunciation_played: ["browser", "phone"],
  deck_tag_changed: ["worker"],
  cards_tagged: ["browser"],
  deck_enrichment_changed: ["worker"],
  deck_purpose_set: ["worker"],
  entry_opened: ["phone"],
  account_deleted: ["worker"],
} satisfies Record<AnalyticsName, readonly AnalyticsProducer[]>;

export function eventProperties(
  name: string,
  properties: unknown,
  producer?: AnalyticsProducer,
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
    if (/^\/explore\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(clean)) return path.slice(0, 200);
    if (
      /^\/(?:docs(?:\/[a-z0-9-]+)*|languages(?:\/[a-z0-9-]+)?|ai-assistants|teachers|medicine|certifications|tutor-lessons|notes-to-flashcards|exams(?:\/[a-z0-9-]+)?|explore|changelog(?:\/[a-z0-9-]+)?|privacy|terms|support|signup|learn(?:\/[a-z0-9-]+)?)?$/.test(
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
    // Phone screens without a web page of their own.
    "/you",
    "/capture",
    "/streak",
    "/feedback",
    "/share",
    "/series-order",
    "/api-keys",
    "/connected-apps",
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
      ? (path.safeParse(carried).data ?? "/other")
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

/**
 * Adds a visit's source to a link that leaves the page, unless the link already names one. The
 * landing page goes even without a referrer, since apps and messengers often send none.
 */
export function carryFirstTouch(target: URL, touch: Attribution): URL {
  const params = target.searchParams;
  if (params.has(CARRIED.landing) || CAMPAIGN_KEYS.some((key) => params.has(key))) return target;
  params.set(CARRIED.landing, touch.first_landing_page);
  if (touch.referrer) params.set(CARRIED.referrer, touch.referrer);
  for (const key of CAMPAIGN_KEYS) if (touch[key]) params.set(key, touch[key]);
  return target;
}

/** The address without the source a public page carried into it, so a copied link does not pass it on. */
export function withoutCarriedFirstTouch(url: string): string | undefined {
  const parsed = new URL(url);
  if (!parsed.searchParams.has(CARRIED.landing) && !parsed.searchParams.has(CARRIED.referrer))
    return;
  parsed.searchParams.delete(CARRIED.landing);
  parsed.searchParams.delete(CARRIED.referrer);
  return parsed.pathname + parsed.search + parsed.hash;
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
