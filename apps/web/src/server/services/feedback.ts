import { FEEDBACK_DAILY_LIMIT, type FeedbackInput, newId } from "@lymi/core";
import { and, count, eq } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import type { Bindings } from "../env";
import { type ServiceContext, ServiceError } from "./context";
import { dateFormatter } from "./days";
import { OPERATOR_INBOX, sendTransactionalEmail } from "./email";
import { getSettings } from "./settings";

export interface FeedbackRequest extends FeedbackInput {
  /** What the browser calls itself, from the request rather than from the page. */
  browser: string;
}

type FeedbackEnv = Pick<Bindings, "PRODUCT_URL" | "EMAIL" | "CF_VERSION_METADATA">;

/**
 * A learner's note on its way to Lymi. The row is written before the send, so a provider that is
 * down loses nothing: the note is kept, marked failed, and the learner is told to write directly.
 */
export async function sendFeedback(
  ctx: ServiceContext,
  env: FeedbackEnv,
  input: FeedbackRequest,
): Promise<{ delivery: "provider" | "outbox" }> {
  const [account] = await ctx.db
    .select({ name: schema.user.name, email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId));
  if (!account) throw new ServiceError("not_found", "Account not found");

  const zone = (await getSettings(ctx)).reviewTimezone ?? "UTC";
  const localDate = dateFormatter(zone).format(new Date());
  const [sofar] = await ctx.db
    .select({ today: count() })
    .from(schema.feedback)
    .where(and(eq(schema.feedback.userId, ctx.userId), eq(schema.feedback.localDate, localDate)));
  if ((sofar?.today ?? 0) >= FEEDBACK_DAILY_LIMIT) {
    throw new ServiceError(
      "conflict",
      `Only ${FEEDBACK_DAILY_LIMIT} notes a day can be sent from one account.`,
    );
  }

  const appVersion = env.CF_VERSION_METADATA.tag || env.CF_VERSION_METADATA.id;
  const id = newId();
  const row = {
    id,
    userId: ctx.userId,
    kind: input.kind,
    message: input.message,
    screen: input.screen,
    appVersion,
    browser: input.browser,
    language: input.language,
    localDate,
    // Starts failed and is corrected by the send, so a Worker killed mid-send leaves no false "sent".
    delivery: "failed",
  } as const;
  await ctx.db.insert(schema.feedback).values(row);

  let delivery: "provider" | "outbox";
  try {
    ({ delivery } = await sendTransactionalEmail(ctx, env, {
      kind: "feedback",
      to: OPERATOR_INBOX,
      // The message Lymi reads is English; the learner's own language travels inside it.
      language: "en",
      replyTo: account.email,
      feedback: {
        kind: input.kind,
        message: input.message,
        from: `${account.name} <${account.email}>`,
        screen: input.screen,
        appVersion,
        browser: input.browser,
        language: input.language,
      },
    }));
  } catch (error) {
    await recordFeedback(ctx, id, input.kind, "failed");
    throw error;
  }

  await ctx.db.update(schema.feedback).set({ delivery }).where(eq(schema.feedback.id, id));
  await recordFeedback(ctx, id, input.kind, delivery);
  return { delivery };
}

/** The audit row carries the kind and where it went, never what the learner wrote. */
function recordFeedback(
  ctx: ServiceContext,
  id: string,
  kind: FeedbackInput["kind"],
  delivery: "provider" | "outbox" | "failed",
) {
  return audit(ctx.db, {
    userId: ctx.userId,
    actor: ctx.actor,
    action: "send_feedback",
    entity: "account",
    entityId: id,
    payload: { kind, delivery },
  });
}
