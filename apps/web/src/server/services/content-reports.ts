import {
  CONTENT_REPORT_DAILY_LIMIT,
  type ContentReportAction,
  type ContentReportInput,
  type ModerationReportOut,
  newId,
} from "@lymi/core";
import { and, count, desc, eq, inArray, isNotNull, isNull, or, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import { track } from "./analytics";
import { audit } from "./audit";
import { archiveCard } from "./cards";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { dateFormatter } from "./days";
import { archiveDeck } from "./decks";
import { OPERATOR_INBOX, sendTransactionalEmail } from "./email";
import { isJoinToken } from "./invitations";
import { deckAccess, memberOf } from "./members";
import { getSettings } from "./settings";

type ReportEnv = Pick<Bindings, "PRODUCT_URL" | "EMAIL" | "SESSIONS">;

/** The deck's name, its owner's name, and the card as they read when reported. */
interface Snapshot {
  deckName: string;
  ownerName: string;
  card?: { term: string; meaning: string | null; example: string | null; notes: string | null };
}

interface Subject {
  deckId: string;
  ownerId: string;
  cardId: string | null;
  via: "member" | "join";
  snapshot: Snapshot;
}

/**
 * A learner's report of a deck or card someone else wrote. The row is the record and the email is
 * the alert, so a failed send loses nothing: the operator's list still shows it. Reporting the same
 * thing again while it is open changes nothing and sends nothing.
 */
export async function reportContent(
  ctx: ServiceContext,
  env: ReportEnv,
  input: ContentReportInput,
): Promise<{ id: string }> {
  const subject = await subjectOf(ctx, input.target);
  if (subject.ownerId === ctx.userId) {
    throw new ServiceError("invalid", "You can’t report your own deck");
  }

  const [open] = await ctx.db
    .select({ id: schema.contentReports.id })
    .from(schema.contentReports)
    .where(
      and(
        eq(schema.contentReports.reporterId, ctx.userId),
        eq(schema.contentReports.deckId, subject.deckId),
        subject.cardId
          ? eq(schema.contentReports.cardId, subject.cardId)
          : eq(schema.contentReports.target, "deck"),
        isNull(schema.contentReports.resolvedAt),
      ),
    );
  if (open) return { id: open.id };

  const zone = (await getSettings(ctx)).reviewTimezone ?? "UTC";
  const localDate = dateFormatter(zone).format(new Date());
  const [sofar] = await ctx.db
    .select({ today: count() })
    .from(schema.contentReports)
    .where(
      and(
        eq(schema.contentReports.reporterId, ctx.userId),
        eq(schema.contentReports.localDate, localDate),
      ),
    );
  if ((sofar?.today ?? 0) >= CONTENT_REPORT_DAILY_LIMIT) {
    throw new ServiceError(
      "conflict",
      `Only ${CONTENT_REPORT_DAILY_LIMIT} reports a day can be sent from one account.`,
    );
  }

  const id = newId();
  const note = input.note?.trim() || null;
  await ctx.db.insert(schema.contentReports).values({
    id,
    reporterId: ctx.userId,
    ownerId: subject.ownerId,
    deckId: subject.deckId,
    cardId: subject.cardId,
    target: subject.cardId ? "card" : "deck",
    via: subject.via,
    reason: input.reason,
    note,
    snapshot: subject.snapshot,
    localDate,
  });
  // The reporter's own log says a report went; never what it said or whom it was about.
  await audit(ctx, {
    entity: "account",
    action: "report_content",
    id,
    details: { target: subject.cardId ? "card" : "deck", reason: input.reason },
  });
  track(ctx.analytics, {
    name: "content_reported",
    target: subject.cardId ? "card" : "deck",
    reason: input.reason,
    via: subject.via,
    has_note: note !== null,
  });

  try {
    const [reporter] = await ctx.db
      .select({ name: schema.user.name, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.userId));
    await sendTransactionalEmail(ctx, env, {
      kind: "content-report",
      to: OPERATOR_INBOX,
      language: "en",
      ...(reporter ? { replyTo: reporter.email } : {}),
      contentReport: {
        id,
        reason: input.reason,
        note,
        via: subject.via,
        reporter: reporter ? `${reporter.name} <${reporter.email}>` : "unknown",
        ...subject.snapshot,
      },
    });
  } catch (error) {
    // The row stands and `pnpm moderate list` shows it; the learner's report was received.
    if (!(error instanceof ServiceError)) throw error;
  }
  return { id };
}

/** The deck, and the card when one is named, that this learner may report. */
async function subjectOf(
  ctx: ServiceContext,
  target: ContentReportInput["target"],
): Promise<Subject> {
  switch (target.kind) {
    case "deck": {
      const deck = await deckAccess(ctx, target.deckId);
      return {
        deckId: deck.id,
        ownerId: deck.owner.id,
        cardId: null,
        via: "member",
        snapshot: { deckName: deck.name, ownerName: deck.owner.name },
      };
    }
    case "card": {
      const [row] = await ctx.db
        .select({ card: schema.cards, deckName: schema.decks.name, ownerName: schema.user.name })
        .from(schema.cards)
        .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
        .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
        .where(and(eq(schema.cards.id, target.cardId), memberOf(ctx.userId)));
      if (!row) throw notFound("Card");
      const { card } = row;
      return {
        deckId: card.deckId,
        ownerId: card.userId,
        cardId: card.id,
        via: "member",
        snapshot: {
          deckName: row.deckName,
          ownerName: row.ownerName,
          card: {
            term: card.term,
            meaning: card.meaning,
            example: card.example,
            notes: card.notes,
          },
        },
      };
    }
    case "join": {
      if (!isJoinToken(target.token)) throw notFound("Join link");
      const [link] = await ctx.db
        .select({
          deckId: schema.decks.id,
          deckName: schema.decks.name,
          ownerId: schema.decks.userId,
          ownerName: schema.user.name,
        })
        .from(schema.deckInvitations)
        .innerJoin(schema.decks, eq(schema.decks.id, schema.deckInvitations.deckId))
        .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
        .where(
          and(
            eq(schema.deckInvitations.token, target.token),
            isNull(schema.deckInvitations.revokedAt),
            isNull(schema.decks.archivedAt),
          ),
        );
      if (!link) throw notFound("Join link");
      return {
        deckId: link.deckId,
        ownerId: link.ownerId,
        cardId: null,
        via: "join",
        snapshot: { deckName: link.deckName, ownerName: link.ownerName },
      };
    }
  }
}

/** Refuses anyone whose address is not on `OPERATOR_EMAILS`, and any caller but a person or their key. */
async function assertOperator(ctx: ServiceContext, operators: Set<string>) {
  if (ctx.actor !== "user" && ctx.actor !== "api") throw notFound("Report");
  const [account] = await ctx.db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId));
  // Not found rather than forbidden, so the routes say nothing to anyone else.
  if (!account || !operators.has(account.email.toLowerCase())) throw notFound("Report");
}

/** Open reports oldest first, or the latest resolved ones. Operators only. */
export async function listContentReports(
  ctx: ServiceContext,
  operators: Set<string>,
  status: "open" | "resolved",
): Promise<ModerationReportOut[]> {
  await assertOperator(ctx, operators);
  const rows = await ctx.db
    .select({ id: schema.contentReports.id })
    .from(schema.contentReports)
    .where(
      status === "open"
        ? isNull(schema.contentReports.resolvedAt)
        : isNotNull(schema.contentReports.resolvedAt),
    )
    .orderBy(
      status === "open" ? schema.contentReports.createdAt : desc(schema.contentReports.resolvedAt),
    )
    .limit(50);
  return Promise.all(rows.map((row) => presentReport(ctx.db, row.id)));
}

export async function getContentReport(
  ctx: ServiceContext,
  operators: Set<string>,
  id: string,
): Promise<ModerationReportOut> {
  await assertOperator(ctx, operators);
  return presentReport(ctx.db, id);
}

async function presentReport(db: Db, id: string): Promise<ModerationReportOut> {
  const [row] = await db
    .select({ report: schema.contentReports, deckName: schema.decks.name })
    .from(schema.contentReports)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.contentReports.deckId))
    .where(eq(schema.contentReports.id, id));
  if (!row) throw notFound("Report");
  const { report } = row;
  const snapshot = report.snapshot as Snapshot;
  const people = [report.reporterId, report.ownerId].filter((v): v is string => !!v);
  const [accounts, [members], [ownerReports]] = await Promise.all([
    people.length
      ? db
          .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
          .from(schema.user)
          .where(inArray(schema.user.id, people))
      : [],
    db
      .select({ n: count() })
      .from(schema.deckMembers)
      .where(
        and(eq(schema.deckMembers.deckId, report.deckId), isNull(schema.deckMembers.removedAt)),
      ),
    report.ownerId
      ? db
          .select({ n: count() })
          .from(schema.contentReports)
          .where(eq(schema.contentReports.ownerId, report.ownerId))
      : [{ n: 1 }],
  ]);
  const person = (userId: string | null) => {
    const found = accounts.find((account) => account.id === userId);
    return found ? { id: found.id, name: found.name, email: found.email } : null;
  };
  return {
    id: report.id,
    status: report.resolvedAt ? "resolved" : "open",
    reason: report.reason,
    note: report.note,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    action: report.action,
    via: report.via,
    reporter: person(report.reporterId),
    owner: person(report.ownerId),
    deck: { id: report.deckId, name: snapshot.deckName ?? row.deckName, members: members?.n ?? 0 },
    card: snapshot.card ? { id: report.cardId, ...snapshot.card } : null,
    ownerReports: ownerReports?.n ?? 1,
  };
}

/**
 * Settles a report. Archiving writes as the system into the owner's account, so Activity shows
 * Lymi did it, and neither the archived card or deck nor a suspended account's shared decks can be
 * restored. Every open report on the same content is settled with it.
 */
export async function resolveContentReport(
  ctx: ServiceContext,
  operators: Set<string>,
  id: string,
  action: ContentReportAction,
): Promise<ModerationReportOut> {
  await assertOperator(ctx, operators);
  const [report] = await ctx.db
    .select()
    .from(schema.contentReports)
    .where(eq(schema.contentReports.id, id));
  if (!report) throw notFound("Report");
  if (report.resolvedAt) {
    throw new ServiceError("conflict", `This report was already resolved: ${report.action}`);
  }
  if (action === "archive_card" && !report.cardId) {
    throw new ServiceError("invalid", "This report is about a deck, not a card");
  }
  if (action !== "dismiss" && !report.ownerId) {
    throw new ServiceError("invalid", "The owner has deleted their account");
  }

  const owner: ServiceContext = {
    db: ctx.db,
    userId: report.ownerId ?? "",
    actor: "system",
  };
  if (action === "archive_card" && report.cardId) await archiveCard(owner, report.cardId);
  if (action === "archive_deck") await archiveDeck(owner, report.deckId);
  if (action === "suspend_sharing") await suspendSharing(owner, report.id);

  const now = new Date();
  // The same content's other open reports are answered by the same act.
  const same =
    action === "archive_card"
      ? eq(schema.contentReports.cardId, report.cardId ?? "")
      : action === "dismiss"
        ? eq(schema.contentReports.id, id)
        : action === "archive_deck"
          ? eq(schema.contentReports.deckId, report.deckId)
          : eq(schema.contentReports.ownerId, report.ownerId ?? "");
  const settled = await ctx.db
    .update(schema.contentReports)
    .set({ resolvedAt: now, action })
    .where(
      and(isNull(schema.contentReports.resolvedAt), or(eq(schema.contentReports.id, id), same)),
    )
    .returning({ id: schema.contentReports.id, createdAt: schema.contentReports.createdAt });
  for (const row of settled) {
    track(ctx.analytics, {
      name: "content_report_resolved",
      action,
      target: report.target,
      hours: Math.min(Math.round((now.getTime() - row.createdAt.getTime()) / 3_600_000), 8760),
    });
  }
  return presentReport(ctx.db, id);
}

/**
 * Stops an owner sharing: every deck of theirs that anyone else studies or could join is archived,
 * which closes its join link and invitations, and new links and invitations are refused.
 */
async function suspendSharing(owner: ServiceContext, reportId: string) {
  await owner.db
    .insert(schema.sharingSuspensions)
    .values({ userId: owner.userId, reportId })
    .onConflictDoNothing();
  const [report] = await owner.db
    .select({ deckId: schema.contentReports.deckId })
    .from(schema.contentReports)
    .where(eq(schema.contentReports.id, reportId));
  const shared = new Set(await sharedDecksOf(owner.db, owner.userId));
  if (report) shared.add(report.deckId);
  for (const deckId of shared) await archiveDeck(owner, deckId);
}

/** The owner's unarchived decks that have members, or a door someone could still walk through. */
async function sharedDecksOf(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.userId, userId),
        isNull(schema.decks.archivedAt),
        or(
          sql`exists (select 1 from deck_members where deck_members.deck_id = decks.id and deck_members.removed_at is null)`,
          sql`exists (select 1 from deck_invitations where deck_invitations.deck_id = decks.id and deck_invitations.revoked_at is null)`,
        ),
      ),
    );
  return rows.map((row) => row.id);
}
