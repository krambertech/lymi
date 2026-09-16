import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { eq } from "@lymi/core/db";
import { isLoopbackUrl } from "../../shared/origins";
import { audit } from "../audit";
import type { Db } from "../db";
import { schema } from "../db";
import type { Bindings } from "../env";
import { serverI18n } from "../i18n";
import { type ServiceContext, ServiceError } from "./context";

export type TransactionalEmailKind =
  | "test"
  | "verify-email"
  | "reset-password"
  | "existing-account"
  | "google-account"
  | "reset-google-account";
export type TransactionalEmailLanguage = "en" | "uk" | "ru";

/** Every kind but `test` carries the one link its message is about. */
export interface TransactionalEmailParams {
  url?: string;
}

export interface TransactionalEmailInput extends TransactionalEmailParams {
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

/** A paragraph of prose, or the message's one link on a line of its own. */
type Block = string | { link: string };

function textBody(blocks: Block[]): string {
  return blocks.map((block) => (typeof block === "string" ? block : block.link)).join("\n\n");
}

function htmlDocument(language: TransactionalEmailLanguage, blocks: Block[]): string {
  const body = blocks
    .map((block) =>
      typeof block === "string"
        ? `<p>${escapeHtml(block)}</p>`
        : `<p><a href="${escapeHtml(block.link)}">${escapeHtml(block.link)}</a></p>`,
    )
    .join("");
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
  params: TransactionalEmailParams = {},
): Promise<RenderedEmail> {
  const locale = emailLanguage(language);
  const i18n = await serverI18n(locale);
  const { subject, blocks } = compose(i18n, kind, params);
  return {
    kind,
    language: locale,
    subject,
    text: textBody(blocks),
    html: htmlDocument(locale, blocks),
  };
}

/** A link the message cannot be written without; a missing one is a caller bug, not a learner's. */
function required(url: string | undefined, kind: TransactionalEmailKind): string {
  if (!url) throw new Error(`The ${kind} email needs a link`);
  return url;
}

function compose(
  i18n: I18n,
  kind: TransactionalEmailKind,
  params: TransactionalEmailParams,
): { subject: string; blocks: Block[] } {
  const hello = i18n._(msg`Hello,`);
  const signature = "Lymi";

  switch (kind) {
    case "test":
      return {
        subject: i18n._(msg`Test email from Lymi`),
        blocks: [
          hello,
          i18n._(msg`This test confirms that Lymi can send account emails.`),
          i18n._(msg`You don’t need to do anything.`),
          signature,
        ],
      };
    case "verify-email":
      return {
        subject: i18n._(msg`Confirm your email address`),
        blocks: [
          hello,
          i18n._(
            msg`Open this link to confirm your address and finish creating your Lymi account:`,
          ),
          { link: required(params.url, kind) },
          i18n._(
            msg`The link works for 24 hours. If you didn’t create a Lymi account, ignore this email.`,
          ),
          signature,
        ],
      };
    case "reset-password":
      return {
        subject: i18n._(msg`Reset your Lymi password`),
        blocks: [
          hello,
          i18n._(msg`Open this link to set a new password for your Lymi account:`),
          { link: required(params.url, kind) },
          i18n._(
            msg`The link works for one hour. If you didn’t ask for a new password, ignore this email. Nothing has changed.`,
          ),
          signature,
        ],
      };
    case "existing-account":
      return {
        subject: i18n._(msg`You already have a Lymi account`),
        blocks: [
          hello,
          i18n._(
            msg`Someone tried to create a Lymi account with this address. You already have one, so nothing was created.`,
          ),
          i18n._(msg`Sign in here, and ask for a new password if you have forgotten yours:`),
          { link: required(params.url, kind) },
          signature,
        ],
      };
    case "reset-google-account":
      return {
        subject: i18n._(msg`Your Lymi account signs in with Google`),
        blocks: [
          hello,
          i18n._(
            msg`Someone asked to reset the password for this address. It signs in with Google, so there is no password to reset.`,
          ),
          i18n._(msg`Continue with Google here:`),
          { link: required(params.url, kind) },
          signature,
        ],
      };
    case "google-account":
      return {
        subject: i18n._(msg`You already have a Lymi account`),
        blocks: [
          hello,
          i18n._(
            msg`Someone tried to create a Lymi account with this address and a password. This address signs in with Google, so nothing was created.`,
          ),
          i18n._(msg`Continue with Google here:`),
          { link: required(params.url, kind) },
          signature,
        ],
      };
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
      return typeof code === "string" ? code : "unknown";
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

/**
 * What Lymi will send in one UTC day, under the provider's own quota. Per-caller budgets alone
 * still let a spread of machines spend the day's allowance on confirmations nobody asked for,
 * and the learner whose reset is then dropped never learns why. Issue 251.
 */
const DAILY_SEND_LIMIT = 150;

/** True while the day still has room, counting this send. A storage failure never blocks one. */
async function withinDailyBudget(sessions: KVNamespace | undefined): Promise<boolean> {
  if (!sessions) return true;
  const key = `email:sent:${new Date().toISOString().slice(0, 10)}`;
  try {
    const sent = Number((await sessions.get(key)) ?? 0);
    if (sent >= DAILY_SEND_LIMIT) return false;
    await sessions.put(key, String(sent + 1), { expirationTtl: 60 * 60 * 48 });
    return true;
  } catch {
    return true;
  }
}

/** Send through Cloudflare in production and keep all loopback delivery inside the local Worker. */
export async function sendTransactionalEmail(
  ctx: ServiceContext,
  env: Pick<Bindings, "PRODUCT_URL" | "EMAIL"> & { SESSIONS?: KVNamespace },
  input: TransactionalEmailInput,
): Promise<{ delivery: "provider" | "outbox" }> {
  const message = await renderTransactionalEmail(input.kind, input.language, {
    ...(input.url ? { url: input.url } : {}),
  });
  let delivery: "provider" | "outbox";
  if (isLoopbackUrl(env.PRODUCT_URL)) {
    writeLocalEmail(message, input.to);
    delivery = "outbox";
  } else {
    if (!(await withinDailyBudget(env.SESSIONS))) {
      console.error(
        JSON.stringify({ event: "transactional_email_over_daily_budget", kind: input.kind }),
      );
      throw new ServiceError("unavailable", "Couldn’t send the email. Try again in a moment.");
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
      delivery = "provider";
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "transactional_email_failed",
          kind: input.kind,
          errorClass: providerErrorClass(error),
        }),
      );
      throw new ServiceError("unavailable", "Couldn’t send the email. Try again in a moment.");
    }
  }

  await audit(ctx.db, {
    userId: ctx.userId,
    actor: ctx.actor,
    action: "send_transactional_email",
    entity: "account",
    entityId: ctx.userId,
    payload: { kind: input.kind, delivery },
  });
  return { delivery };
}

/** Send the operational smoke-test message only for accounts on the dedicated capability list. */
export async function sendOperatorTestEmail(
  ctx: ServiceContext,
  env: Pick<Bindings, "PRODUCT_URL" | "EMAIL">,
  input: Omit<TransactionalEmailInput, "kind">,
  operators: Set<string>,
) {
  const [account] = await ctx.db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId));
  if (!account || !operators.has(account.email.toLowerCase())) {
    throw new ServiceError("forbidden", "Only a Lymi operator can send a test email.");
  }
  return sendTransactionalEmail(ctx, env, { ...input, kind: "test" });
}

export function latestLocalEmail(to: string): LocalEmail | null {
  const address = to.trim().toLowerCase();
  return localOutbox.findLast((message) => message.to === address) ?? null;
}

/** Test-only reset; the outbox itself is reachable only in loopback or isolated preview builds. */
export function clearLocalEmailOutbox(): void {
  localOutbox.length = 0;
}

/** The first language in `Accept-Language` Lymi has a catalog for, or English. */
export function languageFromRequest(request: Request | undefined): TransactionalEmailLanguage {
  for (const part of (request?.headers.get("accept-language") ?? "").split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (tag === "uk" || tag === "ru" || tag === "en") return tag;
  }
  return "en";
}

/** The account's chosen interface language, falling back to what the browser asked for. */
export async function accountEmailLanguage(
  db: Db,
  userId: string,
  request: Request | undefined,
): Promise<TransactionalEmailLanguage> {
  const [row] = await db
    .select({ appLanguage: schema.userSettings.appLanguage })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  return row?.appLanguage ? emailLanguage(row.appLanguage) : languageFromRequest(request);
}

/**
 * An account email sent from inside Better Auth. A delivery failure must not fail the sign-up,
 * sign-in or reset that asked for it, because the learner can ask for the message again; the
 * failure is already logged with its error class and no recipient.
 */
export async function sendAccountEmail(
  ctx: ServiceContext,
  env: Pick<Bindings, "PRODUCT_URL" | "EMAIL">,
  input: TransactionalEmailInput,
): Promise<void> {
  try {
    await sendTransactionalEmail(ctx, env, input);
  } catch {
    console.error(JSON.stringify({ event: "account_email_not_sent", kind: input.kind }));
  }
}
