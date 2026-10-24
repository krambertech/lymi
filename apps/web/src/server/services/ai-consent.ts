import { AI_CONSENT_REQUIRED, type AiConsentInput } from "@lymi/core";
import { and, eq, isNull, lt, or } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { track } from "./analytics";
import { auditStatementWhen } from "./audit";
import { type ServiceContext, ServiceError } from "./context";
import { ensureSettings, getSettings } from "./settings";

/**
 * Whether Lymi may send a learner's content to an AI service. The phone app sends nothing until
 * the learner has said yes; the web, the API and MCP carry on until they have said no. ADR 0038.
 */
export function aiAllowed(choice: boolean | null, fromPhone: boolean): boolean {
  return choice === true || (choice === null && !fromPhone);
}

async function choiceOf(db: Db, userId: string): Promise<boolean | null> {
  const [row] = await db
    .select({ aiConsent: schema.userSettings.aiConsent })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  return row?.aiConsent ?? null;
}

/** For the caller's own content. */
export async function aiAllowedFor(ctx: ServiceContext): Promise<boolean> {
  return aiAllowed(await choiceOf(ctx.db, ctx.userId), ctx.fromPhone === true);
}

/**
 * For content `ownerId` wrote, such as a shared or published deck's card. The owner's choice
 * decides; only the owner's own phone treats an unanswered choice as no.
 */
export async function aiAllowedForOwner(ctx: ServiceContext, ownerId: string): Promise<boolean> {
  const fromOwnerPhone = ctx.fromPhone === true && ctx.userId === ownerId;
  return aiAllowed(await choiceOf(ctx.db, ownerId), fromOwnerPhone);
}

/** For a run with no request behind it: only an explicit no stops it. */
export async function aiWithdrawn(db: Db, userId: string): Promise<boolean> {
  return (await choiceOf(db, userId)) === false;
}

export async function requireAi(ctx: ServiceContext): Promise<void> {
  if (await aiAllowedFor(ctx)) return;
  throw new ServiceError(
    "forbidden",
    "AI services are off for this account. Turn them on to use this.",
    undefined,
    AI_CONSENT_REQUIRED,
  );
}

/** The learner's answer. A newer answer from another device wins; an older one changes nothing. */
export async function updateAiConsent(ctx: ServiceContext, choice: AiConsentInput) {
  if (ctx.actor !== "user")
    throw new ServiceError("forbidden", "Only the learner can choose whether Lymi uses AI.");
  if (choice.updated_at > Date.now() + 60_000)
    throw new ServiceError("invalid", "This choice has a future date.");
  const before = await getSettings(ctx);
  if (before.aiConsentUpdatedAt && choice.updated_at <= before.aiConsentUpdatedAt.getTime())
    return before;
  await ensureSettings(ctx);
  const eligible = and(
    eq(schema.userSettings.userId, ctx.userId),
    or(
      isNull(schema.userSettings.aiConsentUpdatedAt),
      lt(schema.userSettings.aiConsentUpdatedAt, new Date(choice.updated_at)),
    ),
  )!;
  const [, written] = await ctx.db.batch([
    auditStatementWhen(
      ctx,
      {
        entity: "account",
        action: "ai.consent",
        id: ctx.userId,
        details: { allowed: choice.allowed, version: choice.version },
      },
      schema.userSettings,
      eligible,
    ),
    ctx.db
      .update(schema.userSettings)
      .set({
        aiConsent: choice.allowed,
        aiConsentUpdatedAt: new Date(choice.updated_at),
        updatedAt: new Date(),
      })
      .where(eligible)
      .returning({ userId: schema.userSettings.userId }),
  ]);
  if (written.length > 0 && before.aiConsent !== choice.allowed) {
    const place = choice.place ? { place: choice.place } : {};
    track(ctx.analytics, {
      name: choice.allowed
        ? "ai_consent_granted"
        : before.aiConsent
          ? "ai_consent_withdrawn"
          : "ai_consent_declined",
      ...place,
    });
  }
  return getSettings(ctx);
}
