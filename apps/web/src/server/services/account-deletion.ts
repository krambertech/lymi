import {
  type AccountDeletionInput,
  type AccountDeletionOut,
  type DeletionCodeOut,
  newId,
} from "@lymi/core";
import { and, count, eq, inArray, isNotNull, isNull, ne, notInArray } from "@lymi/core/db";
import { schema } from "../db";
import type { Bindings } from "../env";
import { audit } from "./audit";
import { type ServiceContext, ServiceError } from "./context";
import {
  accountEmailLanguage,
  sendTransactionalEmail,
  type TransactionalEmailLanguage,
} from "./email";

/**
 * The account that holds decks other people still study after their owner deleted theirs. It
 * cannot sign in, owns nothing else, and the clients name it "Former owner".
 */
export const FORMER_OWNER_ID = "former-owner";

const CODE_SECONDS = 15 * 60;
const CODE_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const CODES_PER_DAY = 5;
const codeIdentifier = (userId: string) => `delete-account:${userId}`;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newCode(): string {
  const [n = 0] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % 1_000_000).padStart(6, "0");
}

/** Owned decks other people study now: they stay for those people when the owner leaves Lymi. */
function sharedDecks({ db, userId }: ServiceContext) {
  return db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      members: count(schema.deckMembers.id),
    })
    .from(schema.decks)
    .innerJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.decks.id),
        isNull(schema.deckMembers.removedAt),
        ne(schema.deckMembers.userId, userId),
      ),
    )
    .where(eq(schema.decks.userId, userId))
    .groupBy(schema.decks.id);
}

async function ownsPublishedDeck({ db, userId }: ServiceContext): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.deckPublications.id })
    .from(schema.deckPublications)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckPublications.deckId))
    .where(eq(schema.decks.userId, userId))
    .limit(1);
  return Boolean(row);
}

async function hasApple({ db, userId }: ServiceContext): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "apple")));
  return Boolean(row);
}

/** What deleting the account takes, so the confirmation can say it before anything is sent. */
export async function deletionSummary(ctx: ServiceContext): Promise<AccountDeletionOut> {
  const { db, userId } = ctx;
  const [[decks], [cards], [reviews], shared, publisher, apple] = await Promise.all([
    db.select({ n: count() }).from(schema.decks).where(eq(schema.decks.userId, userId)),
    db
      .select({ n: count() })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(eq(schema.decks.userId, userId)),
    db.select({ n: count() }).from(schema.reviews).where(eq(schema.reviews.userId, userId)),
    sharedDecks(ctx),
    ownsPublishedDeck(ctx),
    hasApple(ctx),
  ]);
  return {
    blocked: publisher ? "publisher" : null,
    confirmWith: apple ? "apple" : "email",
    decks: decks?.n ?? 0,
    cards: cards?.n ?? 0,
    reviews: reviews?.n ?? 0,
    sharedDecks: shared,
  };
}

function refusePublisher(): never {
  throw new ServiceError(
    "conflict",
    "This account owns a published deck, so it can’t be deleted here. Write to hello@lymi.app.",
    undefined,
    "publisher",
  );
}

/** Starts a delete: emails a fresh six-digit code to the account's address, replacing any earlier one. */
export async function sendDeletionCode(
  ctx: ServiceContext,
  env: Pick<Bindings, "PRODUCT_URL" | "EMAIL"> & { SESSIONS?: KVNamespace },
  request: Request | undefined,
): Promise<DeletionCodeOut> {
  const { db, userId } = ctx;
  if (await ownsPublishedDeck(ctx)) refusePublisher();
  const [account] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!account) throw new ServiceError("not_found", "No such learner.");
  const identifier = codeIdentifier(userId);
  const [last] = await db
    .select({ createdAt: schema.verification.createdAt })
    .from(schema.verification)
    .where(eq(schema.verification.identifier, identifier));
  // Every send spends the day's shared email budget, so one account cannot drain it.
  if (last && Date.now() - last.createdAt.getTime() < RESEND_SECONDS * 1000) {
    throw new ServiceError(
      "conflict",
      "A code is already on its way. Wait a minute before asking for another.",
      undefined,
      "code_sent",
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const sendsKey = `delete-account-sends:${userId}:${today}`;
  const [sends] = await db
    .select({ id: schema.verification.id, value: schema.verification.value })
    .from(schema.verification)
    .where(eq(schema.verification.identifier, sendsKey));
  const sent = Number(sends?.value ?? 0);
  // Re-sending starts a fresh count of guesses, so the codes themselves are capped per day.
  if (sent >= CODES_PER_DAY) {
    throw new ServiceError(
      "conflict",
      "You’ve asked for several codes today. Try again tomorrow.",
      undefined,
      "code_limit",
    );
  }
  const code = newCode();
  await db.batch([
    sends
      ? db
          .update(schema.verification)
          .set({ value: String(sent + 1) })
          .where(eq(schema.verification.id, sends.id))
      : db.insert(schema.verification).values({
          id: newId(),
          identifier: sendsKey,
          value: "1",
          expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        }),
    db.delete(schema.verification).where(eq(schema.verification.identifier, identifier)),
    db.insert(schema.verification).values({
      id: newId(),
      identifier,
      value: `${await sha256(code)}:0`,
      expiresAt: new Date(Date.now() + CODE_SECONDS * 1000),
    }),
  ]);
  await sendTransactionalEmail(ctx, env, {
    kind: "delete-account-code",
    to: account.email,
    language: await accountEmailLanguage(db, userId, request),
    code,
  });
  return { sentTo: account.email };
}

/** Checks the emailed code. A wrong one counts an attempt; the fifth ends the code. */
async function checkCode({ db, userId }: ServiceContext, code: string): Promise<void> {
  const identifier = codeIdentifier(userId);
  const [row] = await db
    .select()
    .from(schema.verification)
    .where(eq(schema.verification.identifier, identifier));
  const expired = () =>
    new ServiceError(
      "invalid",
      "This code has expired. Send a new one.",
      undefined,
      "code_expired",
    );
  if (!row || row.expiresAt.getTime() <= Date.now()) throw expired();
  const [hash, tries = "0"] = row.value.split(":");
  const attempts = Number(tries) + 1;
  if (attempts > CODE_ATTEMPTS) throw expired();
  // The attempt is spent before the comparison, and only by the request whose update lands, so
  // parallel guesses cannot all read the same count.
  const spent = await db
    .update(schema.verification)
    .set({ value: `${hash}:${attempts}` })
    .where(and(eq(schema.verification.id, row.id), eq(schema.verification.value, row.value)))
    .returning({ id: schema.verification.id });
  if (spent.length === 0) throw expired();
  if (hash === (await sha256(code))) {
    await db.delete(schema.verification).where(eq(schema.verification.id, row.id));
    return;
  }
  if (attempts === CODE_ATTEMPTS) throw expired();
  throw new ServiceError(
    "invalid",
    "That code isn’t right. Check the email and try again.",
    undefined,
    "code_wrong",
  );
}

/** Checks a fresh Sign in with Apple against the Apple ID this account signs in with. */
async function checkApple(
  { db, userId }: ServiceContext,
  apple: { idToken: string; nonce: string },
  verify: ((token: string, nonce: string) => Promise<boolean>) | null,
): Promise<void> {
  const refused = () =>
    new ServiceError(
      "forbidden",
      "Sign in with the Apple ID this account uses.",
      undefined,
      "apple_mismatch",
    );
  if (!verify || !(await verify(apple.idToken, apple.nonce).catch(() => false))) throw refused();
  const sub = subjectOf(apple.idToken);
  const [row] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "apple"),
        eq(schema.account.accountId, sub ?? ""),
      ),
    );
  if (!row) throw refused();
}

function subjectOf(token: string): string | null {
  try {
    const payload = token.split(".")[1] ?? "";
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    const sub = (JSON.parse(json) as { sub?: unknown }).sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

export interface DeletionDeps {
  client: "web" | "phone";
  /** The request, whose language the goodbye email falls back to. */
  request: Request | undefined;
  /** Checks an Apple ID token and its nonce; null while Sign in with Apple is not configured. */
  verifyApple: ((token: string, nonce: string) => Promise<boolean>) | null;
  /** Ends every session before the rows go, since KV keeps copies the cascade cannot reach. */
  endSessions: (userId: string) => Promise<void>;
}

/** What is left to do once the rows are gone: storage the database cannot cascade into. */
export interface DeletionLeftovers {
  email: string;
  language: TransactionalEmailLanguage;
  confirmedWith: "email" | "apple";
  keptDecks: number;
  privateImages: string[];
  imports: { objectKey: string | null; uploadId: string | null }[];
  exports: { objectKey: string | null }[];
}

/**
 * Deletes the learner's account and everything it holds, once they have proved it is them. Decks
 * other people study stay for those people under the former owner. Storage outside D1 is the
 * caller's to clear with the leftovers. Publisher accounts are refused (migration 0028).
 */
export async function deleteAccount(
  ctx: ServiceContext,
  input: AccountDeletionInput,
  deps: DeletionDeps,
): Promise<DeletionLeftovers> {
  const { db, userId } = ctx;
  if (ctx.actor !== "user") {
    throw new ServiceError("forbidden", "Only the learner can delete their account, from the app.");
  }
  if (await ownsPublishedDeck(ctx)) refusePublisher();
  const confirmedWith = "apple" in input ? "apple" : "email";
  if ("apple" in input) await checkApple(ctx, input.apple, deps.verifyApple);
  else await checkCode(ctx, input.code);

  const [account] = await db
    .select({ email: schema.user.email, createdAt: schema.user.createdAt })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!account) throw new ServiceError("not_found", "No such learner.");

  const summary = await deletionSummary(ctx);
  const language = await accountEmailLanguage(db, userId, deps.request);
  const kept = summary.sharedDecks.map((deck) => deck.id);
  const keptCards = db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .where(inArray(schema.cards.deckId, kept));

  const [avatar] = await db
    .select({ custom: schema.userAvatars.customKey, google: schema.userAvatars.googleKey })
    .from(schema.userAvatars)
    .where(eq(schema.userAvatars.userId, userId));
  const images = await db
    .select({ key: schema.cardImages.objectKey })
    .from(schema.cardImages)
    .where(
      and(
        eq(schema.cardImages.userId, userId),
        kept.length > 0 ? notInArray(schema.cardImages.cardId, keptCards) : undefined,
      ),
    );
  const imports = await db
    .select({ objectKey: schema.imports.objectKey, uploadId: schema.imports.uploadId })
    .from(schema.imports)
    .where(and(eq(schema.imports.userId, userId), isNotNull(schema.imports.objectKey)));
  const exports = await db
    .select({ objectKey: schema.exportFiles.objectKey })
    .from(schema.exportFiles)
    .where(and(eq(schema.exportFiles.userId, userId), isNotNull(schema.exportFiles.objectKey)));

  // The owners of decks the learner studied see them leave, as they would after Leave.
  const joined = await db
    .select({ deckId: schema.deckMembers.deckId, ownerId: schema.decks.userId })
    .from(schema.deckMembers)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckMembers.deckId))
    .where(and(eq(schema.deckMembers.userId, userId), isNull(schema.deckMembers.removedAt)));
  for (const { deckId, ownerId } of joined) {
    await audit(
      { ...ctx, userId: ownerId },
      { entity: "deck", action: "leave", id: deckId, memberId: userId },
    );
  }

  await deps.endSessions(userId);

  const now = new Date();
  await db.batch([
    db
      .insert(schema.user)
      .values({ id: FORMER_OWNER_ID, name: "", email: "former-owner@lymi.invalid" })
      .onConflictDoNothing(),
    ...(kept.length > 0
      ? [
          // Nobody can change a kept deck, invite to it or join it again.
          db
            .update(schema.deckInvitations)
            .set({ revokedAt: now, updatedAt: now })
            .where(
              and(
                inArray(schema.deckInvitations.deckId, kept),
                isNull(schema.deckInvitations.revokedAt),
              ),
            ),
          db
            .update(schema.cardImages)
            .set({ userId: FORMER_OWNER_ID, updatedAt: now })
            .where(inArray(schema.cardImages.cardId, keptCards)),
          db
            .update(schema.cards)
            .set({ userId: FORMER_OWNER_ID, updatedAt: now })
            .where(inArray(schema.cards.deckId, kept)),
          db
            .update(schema.decks)
            .set({
              userId: FORMER_OWNER_ID,
              seriesId: null,
              enrichInstructions: null,
              updatedAt: now,
            })
            .where(inArray(schema.decks.id, kept)),
        ]
      : []),
    // An open invitation to the address would otherwise show as pending to a deck's owner.
    db
      .update(schema.deckInvitations)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.deckInvitations.kind, "named"),
          eq(schema.deckInvitations.email, account.email.toLowerCase()),
          isNull(schema.deckInvitations.revokedAt),
          isNull(schema.deckInvitations.acceptedAt),
        ),
      ),
    db
      .delete(schema.verification)
      .where(eq(schema.verification.identifier, codeIdentifier(userId))),
    db.insert(schema.accountDeletions).values({
      id: userId,
      client: deps.client,
      confirmedWith,
      accountCreatedAt: account.createdAt,
      decks: summary.decks,
      cards: summary.cards,
      reviews: summary.reviews,
      keptDecks: kept.length,
    }),
    db.delete(schema.user).where(eq(schema.user.id, userId)),
  ]);

  return {
    email: account.email,
    language,
    confirmedWith,
    keptDecks: kept.length,
    privateImages: [
      ...images.map((image) => image.key),
      ...[avatar?.custom, avatar?.google].filter((key): key is string => Boolean(key)),
    ],
    imports,
    exports,
  };
}
