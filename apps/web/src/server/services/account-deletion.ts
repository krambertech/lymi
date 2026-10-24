import {
  type AccountDeletionInput,
  type AccountDeletionOut,
  type DeletionCodeOut,
  newId,
} from "@lymi/core";
import {
  and,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notExists,
  or,
  type SQL,
  sql,
} from "@lymi/core/db";
import type { AppleClients } from "../apple-revoke";
import { type Db, schema } from "../db";
import { type Bindings, publisherEmails } from "../env";
import { appleRevocationRow } from "./apple-revocations";
import { auditStatement } from "./audit";
import { runBatch } from "./batch";
import { type ServiceContext, ServiceError } from "./context";
import {
  accountEmailLanguage,
  sendTransactionalEmail,
  type TransactionalEmailLanguage,
} from "./email";
import { isPublisher } from "./publishers";

/**
 * The account that holds decks other people still study after their owner deleted theirs. It
 * cannot sign in, owns nothing else, and the clients name it "Former owner". A migration seeds it.
 */
export const FORMER_OWNER_ID = "former-owner";

const CODE_SECONDS = 15 * 60;
const CODE_ATTEMPTS = 5;
const RESEND_SECONDS = 60;
const CODES_PER_DAY = 5;
const codeIdentifier = (userId: string) => `delete-account:${userId}`;
const sendsKey = (userId: string, day: Date) =>
  `delete-account-sends:${userId}:${day.toISOString().slice(0, 10)}`;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newCode(): string {
  const [n = 0] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % 1_000_000).padStart(6, "0");
}

/** Queues the audio folders of the cards matching `where`, which must run before they are deleted. */
function enqueueAudioPurge(db: Db, where: SQL | undefined, now: Date) {
  return db
    .insert(schema.cardAudioPurges)
    .select(
      db
        .select({
          cardId: schema.cards.id,
          createdAt: sql<Date>`${now.getTime()}`.as("created_at"),
        })
        .from(schema.cards)
        .where(where),
    )
    .onConflictDoNothing();
}

/**
 * Owned decks other people study now, which each of them keeps as a private copy. An archived
 * deck goes for everyone, so archiving it first is how the owner takes it from its members.
 */
function sharedDecks({ db, userId }: ServiceContext) {
  return db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      members: count(schema.deckMembers.id),
      published: sql<boolean>`exists (select 1 from deck_publications
        where deck_publications.deck_id = decks.id and deck_publications.status = 'published')`.mapWith(
        Boolean,
      ),
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
    .where(and(eq(schema.decks.userId, userId), isNull(schema.decks.archivedAt)))
    .groupBy(schema.decks.id);
}

async function hasApple({ db, userId }: ServiceContext): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "apple")));
  return Boolean(row);
}

/** What deleting the account takes, so the confirmation can say it before anything is sent. */
export async function deletionSummary(
  ctx: ServiceContext,
  publishers: Set<string>,
): Promise<AccountDeletionOut> {
  const { db, userId } = ctx;
  const [[decks], [cards], [reviews], shared, apple, publisher] = await Promise.all([
    db.select({ n: count() }).from(schema.decks).where(eq(schema.decks.userId, userId)),
    db
      .select({ n: count() })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(eq(schema.decks.userId, userId)),
    db.select({ n: count() }).from(schema.reviews).where(eq(schema.reviews.userId, userId)),
    sharedDecks(ctx),
    hasApple(ctx),
    isPublisher(ctx, publishers),
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

/**
 * Lymi's own publisher accounts hold the decks in Explore and the editions people pin, so they
 * are taken off `PUBLISHER_EMAILS` before they can be deleted.
 */
async function refuseLymiPublisher(ctx: ServiceContext, publishers: Set<string>) {
  if (await isPublisher(ctx, publishers)) {
    throw new ServiceError(
      "conflict",
      "This is one of Lymi's publisher accounts, so it can't be deleted here.",
      undefined,
      "publisher",
    );
  }
}

/** Starts a delete: emails a fresh six-digit code to the account's address, replacing any earlier one. */
export async function sendDeletionCode(
  ctx: ServiceContext,
  env: Pick<Bindings, "PRODUCT_URL" | "EMAIL"> & {
    SESSIONS?: KVNamespace;
    PUBLISHER_EMAILS?: string | undefined;
  },
  request: Request | undefined,
): Promise<DeletionCodeOut> {
  const { db, userId } = ctx;
  await refuseLymiPublisher(ctx, publisherEmails(env));
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
  const daySends = sendsKey(userId, new Date());
  const [sends] = await db
    .select({ id: schema.verification.id, value: schema.verification.value })
    .from(schema.verification)
    .where(eq(schema.verification.identifier, daySends));
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
          identifier: daySends,
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
  /** The Sign in with Apple key, which revoking the account's Apple grant needs; null without it. */
  appleClients: AppleClients | null;
  /** `PUBLISHER_EMAILS`: Lymi's own publishers, which are refused. */
  publishers: Set<string>;
}

/** What is left to do once the rows are gone: storage the database cannot cascade into. */
export interface DeletionLeftovers {
  email: string;
  language: TransactionalEmailLanguage;
  confirmedWith: "email" | "apple";
  /** Decks other people studied, which each of them gets as a copy, and the account's live published decks. */
  keptDecks: number;
  publishedDecks: number;
  privateImages: string[];
  /** The cards' current clips; the cron clears the rest of each card's audio folder. */
  audioKeys: string[];
  imports: { objectKey: string | null; uploadId: string | null }[];
  exports: { objectKey: string | null }[];
  /** False when ending the sessions failed after the delete, so the caller tries again. */
  sessionsEnded: boolean;
  /** The Apple grant's record: pending until revoked, skipped when it could not be tried. Null without Apple. */
  appleRevocation: Pick<typeof schema.appleRevocations.$inferSelect, "status" | "reason"> | null;
}

/**
 * Deletes the learner's account and everything it holds, once they have proved it is them. Decks
 * other people study wait under the former owner while `copyFormerDecks` gives each of them a
 * private copy. Storage outside D1 is the caller's to clear with the leftovers.
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
  await refuseLymiPublisher(ctx, deps.publishers);
  const confirmedWith = "apple" in input ? "apple" : "email";
  if ("apple" in input) await checkApple(ctx, input.apple, deps.verifyApple);
  else await checkCode(ctx, input.code);

  const [account] = await db
    .select({ email: schema.user.email, createdAt: schema.user.createdAt })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!account) throw new ServiceError("not_found", "No such learner.");

  const summary = await deletionSummary(ctx, deps.publishers);
  const language = await accountEmailLanguage(db, userId, deps.request);
  const kept = summary.sharedDecks.length;
  // The decks `sharedDecks` lists, as a subquery: binding one id each would pass D1's 100
  // parameters for an owner of many studied decks. It reads nothing once the decks move.
  const studied = sql`(select decks.id from decks where decks.user_id = ${userId}
    and decks.archived_at is null and exists (select 1 from deck_members
      where deck_members.deck_id = decks.id and deck_members.removed_at is null
        and deck_members.user_id <> ${userId}))`;
  const studiedCards = sql`(select cards.id from cards where cards.deck_id in ${studied})`;
  const [published] = await db
    .select({ n: count() })
    .from(schema.deckPublications)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckPublications.deckId))
    .where(and(eq(schema.decks.userId, userId), eq(schema.deckPublications.status, "published")));

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
        sql`${schema.cardImages.cardId} not in ${studiedCards}`,
        // A member's copy shares the picture's object with the deck it came from.
        sql`not exists (select 1 from card_images as other
          where other.object_key = card_images.object_key and other.user_id <> ${userId})`,
      ),
    );
  // The cards that go with the account; a kept deck's cards keep their audio.
  const going = and(
    or(
      eq(schema.cards.userId, userId),
      inArray(
        schema.cards.deckId,
        db
          .select({ id: schema.decks.id })
          .from(schema.decks)
          .where(eq(schema.decks.userId, userId)),
      ),
    ),
    sql`${schema.cards.deckId} not in ${studied}`,
  );
  const audio = await db
    .select({ key: schema.cards.audioKey })
    .from(schema.cards)
    .where(and(going, isNotNull(schema.cards.audioKey)));
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
  const leaves = joined.map(({ deckId, ownerId }) =>
    auditStatement(
      { ...ctx, userId: ownerId },
      { entity: "deck", action: "leave", id: deckId, memberId: userId },
    ),
  );

  const now = new Date();
  const apple = await appleRevocationRow(
    db,
    userId,
    deps.appleClients,
    "apple" in input ? input.apple.authorizationCode : undefined,
    now,
  );
  await runBatch(db, [
    ...leaves,
    ...(kept > 0
      ? [
          // Migration 0051 seeds it, which holds its address; this restores it if it went.
          db
            .insert(schema.user)
            .values({ id: FORMER_OWNER_ID, name: "", email: "former-owner@lymi.invalid" })
            .onConflictDoNothing(),
          db
            .insert(schema.formerDeckCopies)
            .select(sql`select decks.id, ${now.getTime()} from decks where decks.id in ${studied}`)
            .onConflictDoNothing(),
          // Nobody can change a kept deck, invite to it or join it again.
          db
            .update(schema.deckInvitations)
            .set({ revokedAt: now, updatedAt: now })
            .where(
              and(
                sql`${schema.deckInvitations.deckId} in ${studied}`,
                isNull(schema.deckInvitations.revokedAt),
              ),
            ),
          // The public page and its editions belong to the person leaving; members keep the
          // edition they pinned through the copy.
          db
            .delete(schema.deckPublications)
            .where(sql`${schema.deckPublications.deckId} in ${studied}`),
          db.delete(schema.deckEditions).where(sql`${schema.deckEditions.deckId} in ${studied}`),
          db
            .update(schema.cardImages)
            .set({ userId: FORMER_OWNER_ID, updatedAt: now })
            .where(sql`${schema.cardImages.cardId} in ${studiedCards}`),
          db
            .update(schema.cards)
            .set({ userId: FORMER_OWNER_ID, hookDraft: null, updatedAt: now })
            .where(sql`${schema.cards.deckId} in ${studied}`),
          // Last, since `studied` reads the decks by their owner.
          db
            .update(schema.decks)
            .set({
              userId: FORMER_OWNER_ID,
              seriesId: null,
              enrichInstructions: null,
              enrichStyle: null,
              enrichStyleAt: null,
              updatedAt: now,
            })
            .where(sql`${schema.decks.id} in ${studied}`),
        ]
      : []),
    // A publisher's sign-off on someone else's edition stays signed off, without their name.
    db
      .update(schema.deckEditions)
      .set({ publishedBy: null })
      .where(eq(schema.deckEditions.publishedBy, userId)),
    ...[
      schema.seriesLocalizations,
      schema.deckLocalizations,
      schema.sectionLocalizations,
      schema.cardLocalizations,
    ].map((table) =>
      db.update(table).set({ approvedBy: null }).where(eq(table.approvedBy, userId)),
    ),
    // Invitations to the address hold it in other owners' decks, and an open one would show as
    // pending; membership is kept on `deck_members`, so none is needed once the account is gone.
    db
      .delete(schema.deckInvitations)
      .where(
        and(
          eq(schema.deckInvitations.kind, "named"),
          eq(schema.deckInvitations.email, account.email.toLowerCase()),
        ),
      ),
    // API keys name their account without a foreign key, so they do not cascade.
    db.delete(schema.apikey).where(eq(schema.apikey.referenceId, userId)),
    db.delete(schema.verification).where(
      // The day's code counter lives two days, so today's and yesterday's may both be there.
      inArray(schema.verification.identifier, [
        codeIdentifier(userId),
        sendsKey(userId, now),
        sendsKey(userId, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      ]),
    ),
    // Kept cards stay for their members; the owner's corrections of them go with the owner.
    db.delete(schema.cardCorrections).where(eq(schema.cardCorrections.userId, userId)),
    db.insert(schema.accountDeletions).values({
      id: userId,
      client: deps.client,
      confirmedWith,
      accountCreatedAt: account.createdAt,
      decks: summary.decks,
      cards: summary.cards,
      reviews: summary.reviews,
      keptDecks: kept,
    }),
    ...(apple ? [db.insert(schema.appleRevocations).values(apple)] : []),
    enqueueAudioPurge(db, going, now),
    db.delete(schema.user).where(eq(schema.user.id, userId)),
  ]);
  // After the batch, so a failed delete leaves the learner signed in; KV keeps its own list. The
  // account is gone by now, so a failure here must not skip the cleanup that follows.
  const sessionsEnded = await deps.endSessions(userId).then(
    () => true,
    (error: unknown) => {
      console.error("Ending sessions failed after an account deletion", {
        error: error instanceof Error ? error.name : "unknown",
      });
      return false;
    },
  );

  return {
    email: account.email,
    language,
    confirmedWith,
    keptDecks: kept,
    publishedDecks: published?.n ?? 0,
    privateImages: [
      ...images.map((image) => image.key),
      ...[avatar?.custom, avatar?.google].filter((key): key is string => Boolean(key)),
    ],
    audioKeys: audio.flatMap((card) => (card.key ? [card.key] : [])),
    imports,
    exports,
    sessionsEnded,
    appleRevocation: apple ? { status: apple.status, reason: apple.reason ?? null } : null,
  };
}

/**
 * Deletes a former owner's deck once no member is left, either because each has their copy or,
 * for a deck kept before copies existed, because the last one left. Pictures a copy shares stay,
 * and the cards' audio is queued. A deck whose pictures R2 refused waits for the next run.
 */
export async function dropUnstudiedFormerDecks(db: Db, images: R2Bucket): Promise<number> {
  const decks = await db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.userId, FORMER_OWNER_ID),
        notExists(
          db
            .select({ id: schema.deckMembers.id })
            .from(schema.deckMembers)
            .where(
              and(
                eq(schema.deckMembers.deckId, schema.decks.id),
                isNull(schema.deckMembers.removedAt),
              ),
            ),
        ),
      ),
    )
    .limit(20);
  let dropped = 0;
  for (const { id } of decks) {
    const pictures = await db
      .select({ key: schema.cardImages.objectKey })
      .from(schema.cardImages)
      .innerJoin(schema.cards, eq(schema.cards.id, schema.cardImages.cardId))
      .where(
        and(
          eq(schema.cards.deckId, id),
          // Members' copies share these objects.
          sql`not exists (select 1 from card_images as other
            join cards as theirs on theirs.id = other.card_id
            where other.object_key = card_images.object_key and theirs.deck_id <> ${id})`,
        ),
      );
    try {
      for (let i = 0; i < pictures.length; i += 1000) {
        await images.delete(pictures.slice(i, i + 1000).map((picture) => picture.key));
      }
    } catch {
      continue;
    }
    await db.batch([
      enqueueAudioPurge(db, eq(schema.cards.deckId, id), new Date()),
      db.delete(schema.decks).where(eq(schema.decks.id, id)),
      db
        .delete(schema.tags)
        .where(
          and(
            eq(schema.tags.userId, FORMER_OWNER_ID),
            notExists(
              db
                .select({ id: schema.cardTags.tagId })
                .from(schema.cardTags)
                .where(eq(schema.cardTags.tagId, schema.tags.id)),
            ),
          ),
        ),
    ]);
    dropped++;
  }
  return dropped;
}
