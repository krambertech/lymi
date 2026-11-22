import { failureMessage } from "@lymi/core/telemetry";

export type LogEvent =
  | "account_cleanup_failed"
  | "account_email_not_sent"
  | "account_sessions_not_ended"
  | "ai_call_not_observed"
  | "apple_grant_not_revoked"
  | "apple_revocation_attempted"
  | "apple_token_check_failed"
  | "apple_token_not_opened"
  | "apple_unreachable"
  | "auth_library_failed"
  | "avatar_discard_failed"
  | "avatar_not_stored"
  | "background_work_refused"
  | "bulk_card_write_failed"
  | "bulk_important_write_failed"
  | "card_audio_purge_failed"
  | "card_picture_discard_failed"
  | "card_picture_not_stored"
  | "consent_analytics_failed"
  | "cron_job_failed"
  | "deck_choice_failed"
  | "email_bounced"
  | "email_budget_unreadable"
  | "email_complained"
  | "email_event_dedupe_failed"
  | "email_webhook_secret_unusable"
  | "enrichment_not_queued"
  | "enrichment_run_not_found"
  | "enrichment_run_status_unknown"
  | "example_audio_budget_spent"
  | "example_audio_provider_failed"
  | "exception_report_failed"
  | "export_download_broken"
  | "export_files_not_deleted"
  | "first_touch_unreadable"
  | "former_deck_copy_failed"
  | "former_deck_pictures_kept"
  | "google_photo_import_failed"
  | "hint_draft_failed"
  | "import_files_not_deleted"
  | "import_language_detection_failed"
  | "import_upload_abort_refused"
  | "import_upload_complete_refused"
  | "import_upload_part_refused"
  | "lead_in_decision_failed"
  | "lead_in_decisions_off"
  | "lead_in_resolved"
  | "learning_email_failed"
  | "learning_emails_dispatched"
  | "lesson_consent_unread"
  | "lesson_read_failed"
  | "lesson_terms_unjudged"
  | "mcp_error_report_failed"
  | "mcp_tool_failed"
  | "metric_write_failed"
  | "posthog_capture_failed"
  | "posthog_person_not_erased"
  | "product_analytics_failed"
  | "pronunciation_lease_release_failed"
  | "pronunciation_provider_failed"
  | "public_audio_budget_spent"
  | "published_audio_deck_skipped"
  | "published_audio_failed"
  | "readwise_pull_failed"
  | "readwise_pulls_at_cap"
  | "readwise_token_not_opened"
  | "request_failed"
  | "response_work_failed"
  | "review_reminder_failed"
  | "review_reminders_dispatched"
  | "sign_in_join_failed"
  | "stale_persona_rebuilt"
  | "stress_backfill"
  | "transactional_email_failed"
  | "transactional_email_over_daily_budget"
  | "workflow_report_failed";

const WORD = /^[\w-]{1,40}$/;
const WORD_FIELDS = {
  budget: WORD,
  dataset: WORD,
  job: WORD,
  kind: WORD,
  marker: WORD,
  outcome: WORD,
  provider: WORD,
  question: WORD,
  reason: WORD,
  step: WORD,
  trigger: WORD,
};
const OPEN_FIELDS = {
  deckId: /^(?=.*\d)[0-9a-z]{16,40}$/,
  errorClass: /^(?:delivery|provider|unknown|[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+)$/,
  importId: /^(?=.*\d)[0-9a-z]{16,40}$/,
  language: /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
  method: /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/,
  model: /^(?=.*[\d/-])[\w@./:-]{1,80}$/,
  route: /^(?:\*|[\w:.*-]*\/[\w/:.*-]{0,119})?$/,
  slug: /^[a-z0-9-]{1,80}$/,
  tool: /^[a-z]+(?:_[a-z]+)+$/,
  userId: /^(?=.*\d)[0-9A-Za-z]{16,40}$/,
};
const SHAPES: Record<string, RegExp | undefined> = { ...WORD_FIELDS, ...OPEN_FIELDS };
const CODE =
  /^(?:not_found|invalid|forbidden|conflict|unavailable|network_error|http_\d{3}|E_[A-Z]+(?:_[A-Z]+)*)$/;
const GENERIC_CLASSES = new Set(["Error", "DOMException"]);

interface OnlyIdsCountsAndFixedWords {
  "Log an id, a count or a fixed word, never free text": never;
}
type Text<Key, Value extends string> = Key extends keyof typeof OPEN_FIELDS
  ? Value
  : Key extends keyof typeof WORD_FIELDS
    ? {} extends { [Word in Value]: 1 }
      ? OnlyIdsCountsAndFixedWords
      : Value
    : OnlyIdsCountsAndFixedWords;
type Allowed<Key, Value> = Key extends "error"
  ? unknown
  : 0 extends 1 & Value
    ? never
    : Value extends number | boolean | null | undefined
      ? Value
      : Value extends string
        ? Text<Key, Value>
        : OnlyIdsCountsAndFixedWords;
type Fields<F> = F & { [Key in keyof F]: Allowed<Key, F[Key]> };

function className(error: Error) {
  const declared = error.constructor.name;
  const named = /^[A-Z]\w{0,40}Error$/.test(error.name);
  return GENERIC_CLASSES.has(declared) && named ? error.name : declared;
}

export function failureFields(error: unknown): { error: string; code?: string } {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  const known = typeof code === "string" && CODE.test(code) ? code : failureMessage(error);
  return {
    error: error instanceof Error ? className(error) : typeof error,
    ...(known ? { code: known } : {}),
  };
}

function safeField(key: string, value: unknown) {
  if (key === "error") return failureFields(value);
  if (typeof value !== "string") return { [key]: typeof value === "object" ? null : value };
  return { [key]: SHAPES[key]?.test(value) ? value : "redacted" };
}

function writer(level: "info" | "warn" | "error") {
  return <const F extends object>(event: LogEvent, fields?: Fields<F>): void => {
    const safe = Object.entries(fields ?? {}).map(([key, value]) => safeField(key, value));
    console[level](JSON.stringify(Object.assign({ event }, ...safe)));
  };
}

const told = new Set<string>();

export function warnOnce<const F extends object>(event: LogEvent, fields: Fields<F>): void {
  const { error: _, ...rest } = fields as { error?: unknown };
  const key = JSON.stringify([event, rest]);
  if (told.has(key)) return;
  told.add(key);
  log.warn(event, fields);
}

export const log = { info: writer("info"), warn: writer("warn"), error: writer("error") };

export function logFailure<const F extends object>(event: LogEvent, fields?: Fields<F>) {
  return (error: unknown): void => log.error(event, { ...fields, error });
}
