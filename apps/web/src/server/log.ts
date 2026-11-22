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
  | "avatar_discard_failed"
  | "avatar_not_stored"
  | "background_work_refused"
  | "bulk_card_write_failed"
  | "bulk_important_write_failed"
  | "card_audio_purge_failed"
  | "card_picture_discard_failed"
  | "card_picture_not_stored"
  | "consent_analytics_failed"
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

const OPEN_FIELDS = {
  errorClass: /^\w{1,60}$/,
  language: /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/,
  method: /^[A-Z]{1,10}$/,
  model: /^[\w@./:-]{1,80}$/,
  route: /^[\w/:.*-]{1,120}$/,
  slug: /^[a-z0-9-]{1,80}$/,
  tool: /^[a-z0-9_]{1,64}$/,
};
const WORD = /^[\w.:/-]{1,64}$/;
const CLASS = /^[A-Za-z]\w{0,60}$/;

type OpenField = keyof typeof OPEN_FIELDS | `${string}Id`;
interface OnlyIdsCountsAndFixedWords {
  "Log an id, a count or a fixed word, never free text": never;
}
type Allowed<Key, Value> = Key extends "error"
  ? unknown
  : Value extends number | boolean | null | undefined
    ? Value
    : Value extends string
      ? Key extends OpenField
        ? Value
        : {} extends { [Text in Value]: 1 }
          ? OnlyIdsCountsAndFixedWords
          : Value
      : OnlyIdsCountsAndFixedWords;
type Fields<F> = F & { [Key in keyof F]: Allowed<Key, F[Key]> };

function className(error: Error) {
  return error.name === "Error" ? error.constructor.name : error.name;
}

function failureFields(error: unknown) {
  const name = error instanceof Error ? className(error) : typeof error;
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  const known = typeof code === "string" && WORD.test(code) ? code : failureMessage(error);
  return { error: CLASS.test(name) ? name : "Error", ...(known ? { code: known } : {}) };
}

function safeField(key: string, value: unknown) {
  if (key === "error") return failureFields(value);
  if (typeof value !== "string") return { [key]: typeof value === "object" ? null : value };
  const shape = key in OPEN_FIELDS ? OPEN_FIELDS[key as keyof typeof OPEN_FIELDS] : WORD;
  return { [key]: shape.test(value) ? value : "redacted" };
}

function writer(level: "info" | "warn" | "error") {
  return <const F extends object>(event: LogEvent, fields?: Fields<F>): void => {
    const safe = Object.entries(fields ?? {}).map(([key, value]) => safeField(key, value));
    console[level](JSON.stringify(Object.assign({ event }, ...safe)));
  };
}

export const log = { info: writer("info"), warn: writer("warn"), error: writer("error") };

export function logFailure<const F extends object>(event: LogEvent, fields?: Fields<F>) {
  return (error: unknown): void => log.error(event, { ...fields, error });
}
