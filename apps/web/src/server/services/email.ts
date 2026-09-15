import { msg } from "@lingui/core/macro";
import { isLoopbackUrl } from "../../shared/origins";
import type { Bindings } from "../env";
import { serverI18n } from "../i18n";
import { ServiceError } from "./context";

export type TransactionalEmailKind = "test";
export type TransactionalEmailLanguage = "en" | "uk" | "ru";

export interface TransactionalEmailInput {
  kind: TransactionalEmailKind;
  to: string;
  language: string;
}

export interface RenderedEmail {
  kind: TransactionalEmailKind;
  language: TransactionalEmailLanguage;
  subject: string;
  text: string;
  html: string;
}

export interface LocalEmail extends RenderedEmail {
  id: string;
  to: string;
  sentAt: string;
}

const FROM = { email: "notifications@lymi.app", name: "Lymi" } as const;
const REPLY_TO = "hello@lymi.app";
const LOCAL_OUTBOX_LIMIT = 100;
const localOutbox: LocalEmail[] = [];

function emailLanguage(language: string): TransactionalEmailLanguage {
  return language === "uk" || language === "ru" ? language : "en";
}

function htmlDocument(language: TransactionalEmailLanguage, paragraphs: string[]): string {
  const body = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  return `<!doctype html><html lang="${language}"><body>${body}</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function renderTransactionalEmail(
  kind: TransactionalEmailKind,
  language: string,
): Promise<RenderedEmail> {
  const locale = emailLanguage(language);
  const i18n = await serverI18n(locale);

  switch (kind) {
    case "test": {
      const paragraphs = [
        i18n._(msg`Hello,`),
        i18n._(msg`This test confirms that Lymi can send account emails.`),
        i18n._(msg`You don’t need to do anything.`),
        "Lymi",
      ];
      return {
        kind,
        language: locale,
        subject: i18n._(msg`Test email from Lymi`),
        text: paragraphs.join("\n\n"),
        html: htmlDocument(locale, paragraphs),
      };
    }
  }
}

function providerErrorClass(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  switch (code) {
    case "E_RATE_LIMIT_EXCEEDED":
      return "rate_limit";
    case "E_DAILY_LIMIT_EXCEEDED":
      return "daily_limit";
    case "E_RECIPIENT_SUPPRESSED":
      return "recipient_suppressed";
    case "E_DELIVERY_FAILED":
      return "delivery";
    case "E_SENDER_NOT_VERIFIED":
    case "E_SENDER_DOMAIN_NOT_AVAILABLE":
      return "sender_configuration";
    case "E_INTERNAL_SERVER_ERROR":
      return "provider";
    case "E_VALIDATION_ERROR":
    case "E_FIELD_MISSING":
    case "E_TOO_MANY_RECIPIENTS":
    case "E_RECIPIENT_NOT_ALLOWED":
    case "E_CONTENT_TOO_LARGE":
    case "E_HEADER_NOT_ALLOWED":
    case "E_HEADER_USE_API_FIELD":
    case "E_HEADER_VALUE_INVALID":
    case "E_HEADER_VALUE_TOO_LONG":
    case "E_HEADER_NAME_INVALID":
    case "E_HEADERS_TOO_LARGE":
    case "E_HEADERS_TOO_MANY":
      return "request_configuration";
    default:
      return "unknown";
  }
}

function writeLocalEmail(message: RenderedEmail, to: string): LocalEmail {
  const stored = {
    ...message,
    id: crypto.randomUUID(),
    to: to.trim().toLowerCase(),
    sentAt: new Date().toISOString(),
  };
  localOutbox.push(stored);
  if (localOutbox.length > LOCAL_OUTBOX_LIMIT) localOutbox.shift();
  return stored;
}

/** Send through Cloudflare in production and keep all loopback delivery inside the local Worker. */
export async function sendTransactionalEmail(
  env: Pick<Bindings, "PRODUCT_URL" | "EMAIL">,
  input: TransactionalEmailInput,
): Promise<{ delivery: "provider" | "outbox" }> {
  const message = await renderTransactionalEmail(input.kind, input.language);
  if (isLoopbackUrl(env.PRODUCT_URL)) {
    writeLocalEmail(message, input.to);
    return { delivery: "outbox" };
  }

  try {
    await env.EMAIL.send({
      to: input.to,
      from: FROM,
      replyTo: REPLY_TO,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { delivery: "provider" };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "transactional_email_failed",
        kind: input.kind,
        errorClass: providerErrorClass(error),
      }),
    );
    throw new ServiceError("unavailable", "Couldn't send the email. Try again in a moment.");
  }
}

export function latestLocalEmail(to: string): LocalEmail | null {
  const address = to.trim().toLowerCase();
  return localOutbox.findLast((message) => message.to === address) ?? null;
}

/** Test-only reset; the outbox itself is reachable only in loopback or isolated preview builds. */
export function clearLocalEmailOutbox(): void {
  localOutbox.length = 0;
}
