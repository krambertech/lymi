import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import type { ContentReportReason, FeedbackKind } from "@lymi/core";
import type { EMAIL_KINDS } from "@lymi/core/analytics";
import { trayHue } from "@lymi/core/catalog";
import { eq, sql } from "@lymi/core/db";
import { isLoopbackUrl } from "../../shared/origins";
import type { Db } from "../db";
import { schema } from "../db";
import { type HealthEnv, metered } from "../dependency-health";
import type { Block, ComposedEmail } from "../email/template";
import type { Bindings } from "../env";
import { serverI18n } from "../i18n";
import { track } from "./analytics";
import { audit } from "./audit";
import { type ServiceContext, ServiceError } from "./context";

export type TransactionalEmailKind = (typeof EMAIL_KINDS)[number];
export type TransactionalEmailLanguage = "en" | "uk" | "ru";

/** What a learner wrote and the little Lymi knows about where they wrote it. */
export interface FeedbackEmailData {
  kind: FeedbackKind;
  /** The learner's text, as typed. */
  message: string;
  /** Who wrote, as a name and address a reply can go to. */
  from: string;
  screen: string;
  appVersion: string;
  browser: string;
  /** The learner's app language, so a reply can be written in it. */
  language: string;
}

/** A learner's report of someone else's deck or card, as Lymi's operator reads it. */
export interface ContentReportEmailData {
  id: string;
  reason: ContentReportReason;
  /** The reporter's text, as typed. */
  note: string | null;
  /** Who reported, as a name and address a reply can go to. */
  reporter: string;
  deckName: string;
  ownerName: string;
  card?: { term: string; meaning: string | null; example: string | null; notes: string | null };
}

/** Who asked somebody into which deck, so the message can say it without naming a card. */
export interface DeckInvitationEmailData {
  deckName: string;
  ownerName: string;
  /** Active cards, so the reader knows the size of what they are being handed. */
  cards: number;
  /** The deck's language tag, named in the reader's language on the cover. */
  language?: string | null;
  /** The deck's id, hashed to its cover colour. */
  deckId: string;
}

/** What a message needs beyond its kind: an account kind's one link or code, or a learner's note. */
export interface TransactionalEmailParams {
  url?: string;
  /** The confirmation code the phone app asks for, in place of a link. */
  code?: string;
  feedback?: FeedbackEmailData;
  contentReport?: ContentReportEmailData;
  invitation?: DeckInvitationEmailData;
  /** The goodbye to an Apple account whose grant Lymi has not revoked yet. */
  removeApple?: boolean;
}

export interface TransactionalEmailInput extends TransactionalEmailParams {
  kind: TransactionalEmailKind;
  to: string;
  language: string;
  /** Who a reply goes to, when it is not the address the whole sender answers at. */
  replyTo?: string | undefined;
}

export interface RenderedEmail {
  kind: TransactionalEmailKind;
  language: TransactionalEmailLanguage;
  subject: string;
  /** The line an inbox shows after the subject. */
  preview: string;
  text: string;
  html: string;
}

export interface LocalEmail extends RenderedEmail {
  id: string;
  to: string;
  replyTo: string;
  sentAt: string;
}

/** Where an email's links and images point. */
export interface EmailOrigins {
  productUrl: string;
  siteUrl: string;
}

const PRODUCTION_ORIGINS: EmailOrigins = {
  productUrl: "https://my.lymi.app",
  siteUrl: "https://lymi.app",
};

export const EMAIL_FROM = { email: "notifications@lymi.app", name: "Lymi" } as const;
/** Where a learner reaches a person, and where a message written for Lymi itself lands. */
export const OPERATOR_INBOX = "hello@lymi.app";
const REPLY_TO = OPERATOR_INBOX;
const LOCAL_OUTBOX_LIMIT = 100;
const localOutbox: LocalEmail[] = [];

function emailLanguage(language: string): TransactionalEmailLanguage {
  return language === "uk" || language === "ru" ? language : "en";
}

/** A block in plain text: a button is its bare link, and the paste-this-link note is left out. */
function blockText(block: Block): string | null {
  switch (block.type) {
    case "text":
    case "note":
      return block.text;
    case "button":
      return block.url;
    case "code":
      return block.code;
    case "details":
      return block.lines.join("\n");
    case "fallback":
      return null;
  }
}

/** The plain-text body: the heading, then each block. */
function textBody(email: ComposedEmail): string {
  const { hero } = email;
  const cover =
    hero?.kind === "deck"
      ? [hero.byline.replace("<0/>", hero.inviter), `${hero.name}\n${hero.meta}`]
      : [];
  const parts = email.blocks.map(blockText);
  return [email.heading, ...cover, ...parts, hero ? "Lymi" : null]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

export async function renderTransactionalEmail(
  kind: TransactionalEmailKind,
  language: string,
  params: TransactionalEmailParams = {},
  origins: EmailOrigins = PRODUCTION_ORIGINS,
): Promise<RenderedEmail> {
  const locale = kind === "feedback" || kind === "content-report" ? "en" : emailLanguage(language);
  const i18n = await serverI18n(locale);
  const email = compose(i18n, kind, params);
  // React's server renderer stays out of the Worker entry's static graph, as @lingui/core does.
  const { renderEmailHtml } = await import("../email/template");
  return {
    kind,
    language: locale,
    // A deck or person's name may hold a line break, which a Subject header cannot.
    subject: email.subject.replace(/\s*[\r\n]+\s*/g, " "),
    preview: email.preview,
    text: textBody(email),
    html: await renderEmailHtml(email, {
      language: locale,
      assetOrigin: origins.productUrl,
      siteUrl: origins.siteUrl,
    }),
  };
}

/** Feedback is read by Lymi rather than by a learner, so its scaffolding is English wherever it is sent from. */
const FEEDBACK_SUBJECTS: Record<FeedbackKind, string> = {
  bug: "Lymi feedback: Bug",
  idea: "Lymi feedback: Idea",
  other: "Lymi feedback: Something else",
};

const REPORT_REASONS: Record<ContentReportReason, string> = {
  offensive: "Hateful or offensive",
  sexual: "Sexual content",
  harassment: "Harassment or bullying",
  spam: "Spam or a scam",
  other: "Something else",
};

/** A link the message cannot be written without; a missing one is a caller bug, not a learner's. */
function required(url: string | undefined, kind: TransactionalEmailKind): string {
  if (!url) throw new Error(`The ${kind} email needs a link`);
  return url;
}

/** The first letter of a name's first two words, for the inviter's circle. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
}

function languageName(tag: string | null | undefined, locale: string): string | null {
  if (!tag) return null;
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(tag);
    // Ukrainian and Russian name languages in lower case; on the cover the name starts the line.
    return name ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : null;
  } catch {
    return null;
  }
}

function compose(
  i18n: I18n,
  kind: TransactionalEmailKind,
  params: TransactionalEmailParams,
): ComposedEmail {
  const lantern = { kind: "lantern" } as const;
  const signIn = i18n._(msg({ message: "Sign in", context: "email button" }));
  const linked = (
    subject: string,
    lead: string[],
    label: string,
    url: string,
    note: string | null,
  ): ComposedEmail => ({
    subject,
    preview: lead[0] ?? note ?? subject,
    heading: subject,
    hero: lantern,
    blocks: [
      ...lead.map((text): Block => ({ type: "text", text })),
      { type: "button", label, url },
      ...(note ? [{ type: "note", text: note } as const] : []),
      {
        type: "fallback",
        label: i18n._(msg`Or paste this link into your browser:`),
        url,
      },
    ],
    footer: [],
  });
  const coded = (subject: string, text: string, code: string, note: string): ComposedEmail => ({
    subject,
    preview: text,
    heading: subject,
    hero: lantern,
    blocks: [
      { type: "text", text },
      { type: "code", code },
      { type: "note", text: note },
    ],
    footer: [],
  });

  switch (kind) {
    case "feedback": {
      const it = params.feedback;
      if (!it) throw new Error("The feedback email needs the note it is about");
      return {
        subject: FEEDBACK_SUBJECTS[it.kind],
        preview: it.message.slice(0, 120),
        blocks: [
          { type: "text", text: it.message },
          {
            type: "details",
            lines: [
              `From: ${it.from}`,
              `Screen: ${it.screen}`,
              `App version: ${it.appVersion}`,
              `Browser: ${it.browser}`,
              `App language: ${it.language}`,
            ],
          },
        ],
        footer: [],
      };
    }
    case "content-report": {
      const it = params.contentReport;
      if (!it) throw new Error("The content report email needs the report it is about");
      const reason = REPORT_REASONS[it.reason];
      const card = it.card;
      return {
        subject: `Lymi report: ${reason} · ${card ? card.term : it.deckName}`,
        preview: it.note?.slice(0, 120) ?? `${reason}, reported by ${it.reporter}`,
        blocks: [
          ...(it.note ? [{ type: "text" as const, text: it.note }] : []),
          {
            type: "details",
            lines: [
              `Reason: ${reason}`,
              `Deck: ${it.deckName}, owned by ${it.ownerName}`,
              ...(card
                ? [
                    `Card: ${card.term}`,
                    ...(card.meaning ? [`Meaning: ${card.meaning}`] : []),
                    ...(card.example ? [`Example: ${card.example}`] : []),
                    ...(card.notes ? [`Notes: ${card.notes}`] : []),
                  ]
                : []),
              `Reported by: ${it.reporter}, a member`,
              `Report: ${it.id}`,
            ],
          },
          {
            type: "code",
            code: `pnpm moderate show ${it.id}`,
          },
          {
            type: "note",
            text: "Answer within a day: docs/operations.md, A content report arrives.",
          },
        ],
        footer: [],
      };
    }
    case "test": {
      const subject = i18n._(msg`Test email from Lymi`);
      const text = i18n._(msg`This test confirms that Lymi can send account emails.`);
      return {
        subject,
        preview: text,
        heading: subject,
        hero: lantern,
        blocks: [
          { type: "text", text },
          { type: "note", text: i18n._(msg`You don’t need to do anything.`) },
        ],
        footer: [],
      };
    }
    case "verify-email":
      return linked(
        i18n._(msg`Confirm your email address`),
        [i18n._(msg`Confirming it signs you in and finishes creating your Lymi account.`)],
        i18n._(msg`Confirm address`),
        required(params.url, kind),
        i18n._(
          msg`The link works for 24 hours. If you didn’t create a Lymi account, ignore this email.`,
        ),
      );
    case "verify-email-code":
      if (!params.code) throw new Error("The verify-email-code email needs a code");
      return coded(
        i18n._(msg`Your Lymi confirmation code`),
        i18n._(msg`Enter this code in the Lymi app to finish creating your account:`),
        params.code,
        i18n._(
          msg`The code works for 15 minutes. If you didn’t create a Lymi account, ignore this email.`,
        ),
      );
    case "delete-account-code":
      if (!params.code) throw new Error("The delete-account-code email needs a code");
      return coded(
        i18n._(msg`Your code to delete your Lymi account`),
        i18n._(msg`Enter this code in Lymi to delete your account:`),
        params.code,
        i18n._(
          msg`The code works for 15 minutes. If you didn’t ask to delete your account, ignore this email and nothing will change.`,
        ),
      );
    case "account-deleted": {
      const subject = i18n._(msg`Your Lymi account was deleted`);
      const text = i18n._(
        msg`Your cards, reviews and settings are gone. People who studied your decks keep their own copies.`,
      );
      return {
        subject,
        preview: text,
        heading: subject,
        hero: lantern,
        blocks: [
          { type: "text", text },
          ...(params.removeApple
            ? [
                {
                  type: "text" as const,
                  text: i18n._(
                    msg`You signed in with Apple. If Lymi still shows under Sign in with Apple in your Apple Account settings, remove it there.`,
                  ),
                },
              ]
            : []),
          { type: "text", text: i18n._(msg`You won’t get any more emails from Lymi.`) },
          {
            type: "note",
            text: i18n._(
              msg`If you didn’t do this, reply to this email and tell us what happened.`,
            ),
          },
        ],
        footer: [],
      };
    }
    case "reset-password":
      return linked(
        i18n._(msg`Reset your Lymi password`),
        [],
        i18n._(msg`Set a new password`),
        required(params.url, kind),
        i18n._(
          msg`The link works for one hour. If you didn’t ask for a new password, ignore this email. Your password hasn’t changed.`,
        ),
      );
    case "deck-invitation": {
      const it = params.invitation;
      if (!it) throw new Error("The deck invitation email needs the deck it is for");
      const { ownerName, deckName } = it;
      const url = required(params.url, kind);
      const cards = i18n._(msg`${plural(it.cards, { one: "# card", other: "# cards" })}`);
      const language = languageName(it.language, i18n.locale);
      const text = i18n._(
        msg`You review on your own schedule, and ${ownerName} doesn’t see your progress.`,
      );
      return {
        subject: i18n._(msg`${ownerName} invited you to join ${deckName}`),
        preview: text,
        hero: {
          kind: "deck",
          name: deckName,
          meta: language ? i18n._(msg`${language} · ${cards}`) : cards,
          hue: trayHue(it.deckId),
          inviter: ownerName,
          initials: initials(ownerName),
          byline: i18n._(
            msg({
              message: "<0/> invited you to join this deck",
              comment: "<0/> is the name of the person inviting",
            }),
          ),
        },
        blocks: [
          { type: "text", text },
          { type: "button", label: i18n._(msg`Open the invitation`), url },
          {
            type: "note",
            text: i18n._(
              msg`This invitation only works for this email address. If you weren’t expecting it, ignore this email.`,
            ),
          },
          { type: "fallback", label: i18n._(msg`Or paste this link into your browser:`), url },
        ],
        footer: [],
      };
    }
    case "existing-account":
      return linked(
        i18n._(msg`You already have a Lymi account`),
        [
          i18n._(
            msg`Someone tried to create a Lymi account with this address. You already have one, so nothing changed.`,
          ),
          i18n._(msg`Sign in, or reset your password from the sign-in page.`),
        ],
        signIn,
        required(params.url, kind),
        null,
      );
    case "reset-google-account":
      return linked(
        i18n._(msg`Your Lymi account signs in with Google`),
        [
          i18n._(
            msg`Someone asked to reset the password for this address. It signs in with Google, so there is no password to reset.`,
          ),
        ],
        signIn,
        required(params.url, kind),
        null,
      );
    case "google-account":
      return linked(
        i18n._(msg`You already have a Lymi account`),
        [
          i18n._(
            msg`Someone tried to create a Lymi account with this address and a password. This address signs in with Google, so nothing changed.`,
          ),
        ],
        signIn,
        required(params.url, kind),
        null,
      );
  }
}

function providerErrorClass(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  switch (code) {
    case "E_RATE_LIMIT_EXCEEDED":
    case "rate_limit_exceeded":
      return "rate_limit";
    case "E_DAILY_LIMIT_EXCEEDED":
    case "daily_quota_exceeded":
    case "monthly_quota_exceeded":
      return "daily_limit";
    case "E_RECIPIENT_SUPPRESSED":
      return "recipient_suppressed";
    case "E_DELIVERY_FAILED":
      return "delivery";
    case "E_SENDER_NOT_VERIFIED":
    case "E_SENDER_DOMAIN_NOT_AVAILABLE":
    case "invalid_from_address":
    case "missing_api_key":
    case "invalid_api_key":
    case "restricted_api_key":
      return "sender_configuration";
    case "E_INTERNAL_SERVER_ERROR":
    case "application_error":
    case "internal_server_error":
    case "network_error":
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
    case "validation_error":
    case "missing_required_field":
    case "invalid_parameter":
      return "request_configuration";
    default:
      return typeof code === "string" ? code : "unknown";
  }
}

function writeLocalEmail(message: RenderedEmail, to: string, replyTo: string): LocalEmail {
  const stored = {
    ...message,
    id: crypto.randomUUID(),
    to: to.trim().toLowerCase(),
    replyTo: replyTo.trim().toLowerCase(),
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

export type EmailEnv = Pick<Bindings, "PRODUCT_URL" | "EMAIL"> &
  HealthEnv & {
    SESSIONS?: KVNamespace;
    PUBLIC_SITE_URL?: string;
    /** Sends through Resend when set; until then the Cloudflare binding delivers. */
    RESEND_API_KEY?: string | undefined;
  };

function originsOf(env: { PRODUCT_URL: string; PUBLIC_SITE_URL?: string }): EmailOrigins {
  return {
    productUrl: env.PRODUCT_URL,
    siteUrl: env.PUBLIC_SITE_URL ?? PRODUCTION_ORIGINS.siteUrl,
  };
}

async function deliver(env: EmailEnv, message: RenderedEmail, to: string, replyTo: string) {
  if (env.RESEND_API_KEY) {
    const { sendWithResend } = await import("../email/resend");
    await sendWithResend(env.RESEND_API_KEY, {
      to,
      from: EMAIL_FROM,
      replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      kind: message.kind,
    });
    return;
  }
  await env.EMAIL.send({
    to,
    from: EMAIL_FROM,
    replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

/** Send through the provider in production and keep all loopback delivery inside the local Worker. */
export async function sendTransactionalEmail(
  ctx: ServiceContext,
  env: EmailEnv,
  input: TransactionalEmailInput,
): Promise<{ delivery: "provider" | "outbox" }> {
  const message = await renderTransactionalEmail(
    input.kind,
    input.language,
    {
      ...(input.url ? { url: input.url } : {}),
      ...(input.code ? { code: input.code } : {}),
      ...(input.feedback ? { feedback: input.feedback } : {}),
      ...(input.contentReport ? { contentReport: input.contentReport } : {}),
      ...(input.invitation ? { invitation: input.invitation } : {}),
      ...(input.removeApple ? { removeApple: true } : {}),
    },
    originsOf(env),
  );
  let delivery: "provider" | "outbox";
  if (isLoopbackUrl(env.PRODUCT_URL)) {
    writeLocalEmail(message, input.to, input.replyTo ?? REPLY_TO);
    delivery = "outbox";
  } else {
    if (!(await withinDailyBudget(env.SESSIONS))) {
      console.error(
        JSON.stringify({ event: "transactional_email_over_daily_budget", kind: input.kind }),
      );
      track(ctx.analytics, { name: "email_failed", kind: input.kind, error_class: "daily_budget" });
      throw new ServiceError("unavailable", "Couldn’t send the email. Try again in a moment.");
    }
    try {
      await metered(env, "email", () => deliver(env, message, input.to, input.replyTo ?? REPLY_TO));
      delivery = "provider";
    } catch (error) {
      const errorClass = providerErrorClass(error);
      console.error(
        JSON.stringify({ event: "transactional_email_failed", kind: input.kind, errorClass }),
      );
      track(ctx.analytics, { name: "email_failed", kind: input.kind, error_class: errorClass });
      throw new ServiceError("unavailable", "Couldn’t send the email. Try again in a moment.");
    }
  }
  track(ctx.analytics, { name: "email_sent", kind: input.kind, language: message.language });

  // A deleted account has no row left to record the goodbye against.
  if (input.kind === "account-deleted") return { delivery };
  await audit(ctx, {
    entity: "account",
    action: "send_transactional_email",
    id: ctx.userId,
    details: { kind: input.kind, delivery },
  });
  return { delivery };
}

/** Send the operational smoke-test message only for accounts on the dedicated capability list. */
export async function sendOperatorTestEmail(
  ctx: ServiceContext,
  env: EmailEnv,
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

/**
 * The latest message an address is part of. Reply-to counts as well as the recipient, so a message
 * Lymi sent to itself is still found by the learner who caused it, whoever else wrote in meanwhile.
 */
export function latestLocalEmail(address: string): LocalEmail | null {
  const wanted = address.trim().toLowerCase();
  return (
    localOutbox.findLast((message) => message.to === wanted || message.replyTo === wanted) ?? null
  );
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

/** The interface language of the account at an address, or null when nobody has one. */
export async function addressEmailLanguage(
  db: Db,
  email: string,
): Promise<TransactionalEmailLanguage | null> {
  const [row] = await db
    .select({ appLanguage: schema.userSettings.appLanguage })
    .from(schema.user)
    .innerJoin(schema.userSettings, eq(schema.userSettings.userId, schema.user.id))
    // biome-ignore lint/plugin: Better Auth stores emails lower-cased, so ASCII-only folding loses nothing here.
    .where(sql`lower(${schema.user.email}) = ${email.toLowerCase()}`);
  return row?.appLanguage ? emailLanguage(row.appLanguage) : null;
}

/**
 * An account email sent from inside Better Auth. A delivery failure must not fail the sign-up,
 * sign-in or reset that asked for it, because the learner can ask for the message again; the
 * failure is already logged with its error class and no recipient.
 */
export async function sendAccountEmail(
  ctx: ServiceContext,
  env: EmailEnv,
  input: TransactionalEmailInput,
): Promise<void> {
  try {
    await sendTransactionalEmail(ctx, env, input);
  } catch {
    console.error(JSON.stringify({ event: "account_email_not_sent", kind: input.kind }));
  }
}

/**
 * A rendered email sent for real to an operator from the local `/emails` preview, so a design can
 * be checked in actual mail clients. It skips the outbox, the daily budget and the audit trail.
 */
export async function sendEmailPreview(
  env: Pick<EmailEnv, "RESEND_API_KEY">,
  message: RenderedEmail,
  to: string,
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new ServiceError("unavailable", "Add RESEND_API_KEY to .dev.vars to send a preview.");
  }
  const { sendWithResend } = await import("../email/resend");
  await sendWithResend(env.RESEND_API_KEY, {
    to,
    from: EMAIL_FROM,
    replyTo: REPLY_TO,
    subject: message.subject,
    text: message.text,
    html: message.html,
    kind: message.kind,
  });
}

/** The account at an address, so a delivery report can be counted against it; null when none. */
export async function accountIdForEmail(db: Db, email: string): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    // biome-ignore lint/plugin: Better Auth stores emails lower-cased, so ASCII-only folding loses nothing here.
    .where(sql`lower(${schema.user.email}) = ${email.trim().toLowerCase()}`);
  return row?.id ?? null;
}
